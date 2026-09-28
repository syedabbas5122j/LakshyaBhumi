"""Authenticated encrypted backups for local platform data stores."""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import secrets
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.admin_storage import ADMIN_DATA_ROOT

APP_DATA_ROOT = Path(__file__).resolve().parents[2]
BACKUP_ROOT = APP_DATA_ROOT / "backups"
BACKUP_HEADER = b"BHUSHA-BACKUP-V1\x00"
MAX_BACKUP_BYTES = 256 * 1024 * 1024
BACKUP_SOURCES = {
    "admin-data": ADMIN_DATA_ROOT,
    "field-submissions": APP_DATA_ROOT / "field-submissions",
    "ground-truth-tasks": APP_DATA_ROOT / "ground-truth-tasks",
    "harmonized-data": APP_DATA_ROOT / "harmonized-data",
    "integration-access": APP_DATA_ROOT / "integration-access",
    "integration-sync": APP_DATA_ROOT / "integration-sync",
    "uploaded-data": APP_DATA_ROOT / "uploaded-data",
}
_BACKUP_ID = re.compile(r"^[0-9a-f]{32}$")


def _encryption_key() -> bytes:
    secret = os.getenv("BHUSHA_BACKUP_KEY", "").encode("utf-8")
    if len(secret) < 32:
        raise ValueError("Set BHUSHA_BACKUP_KEY to a randomly generated secret of at least 32 characters.")
    return hashlib.sha256(secret).digest()


def _backup_path(backup_id: str) -> Path:
    if not _BACKUP_ID.fullmatch(backup_id):
        raise FileNotFoundError("Backup was not found.")
    return BACKUP_ROOT / f"{backup_id}.bhsbak"


def _metadata(path: Path) -> dict[str, Any]:
    return {
        "id": path.stem,
        "created_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
        "size_bytes": path.stat().st_size,
        "encrypted": True,
    }


def list_backups() -> list[dict[str, Any]]:
    if not BACKUP_ROOT.exists():
        return []
    paths = sorted(BACKUP_ROOT.glob("*.bhsbak"), key=lambda item: item.stat().st_mtime, reverse=True)
    return [_metadata(path) for path in paths]


def get_backup_path(backup_id: str) -> Path:
    path = _backup_path(backup_id)
    if not path.is_file():
        raise FileNotFoundError("Backup was not found.")
    if path.stat().st_size > MAX_BACKUP_BYTES + len(BACKUP_HEADER) + 28:
        raise ValueError("Backup exceeds the 256 MB restore limit.")
    return path


def create_backup() -> dict[str, Any]:
    key = _encryption_key()
    manifest: dict[str, Any] = {"format_version": 1, "created_at": datetime.now(timezone.utc).isoformat(), "files": {}}
    archive_buffer = io.BytesIO()
    raw_size = 0

    with zipfile.ZipFile(archive_buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, root in BACKUP_SOURCES.items():
            archive.writestr(f"{name}/", "")
            if not root.exists():
                continue
            for source in sorted(root.rglob("*")):
                if not source.is_file() or source.name.endswith(".tmp"):
                    continue
                raw_size += source.stat().st_size
                if raw_size > MAX_BACKUP_BYTES:
                    raise ValueError("Backup data exceeds the 256 MB local archive limit.")
                archive_name = f"{name}/{source.relative_to(root).as_posix()}"
                contents = source.read_bytes()
                if len(contents) != source.stat().st_size:
                    raise ValueError("A data file changed during backup creation; retry when writes are complete.")
                manifest["files"][archive_name] = hashlib.sha256(contents).hexdigest()
                archive.writestr(archive_name, contents)
        archive.writestr("_backup-manifest.json", json.dumps(manifest, separators=(",", ":")))

    plaintext = archive_buffer.getvalue()
    if len(plaintext) > MAX_BACKUP_BYTES:
        raise ValueError("Compressed backup exceeds the 256 MB local archive limit.")
    nonce = secrets.token_bytes(12)
    encrypted = BACKUP_HEADER + nonce + AESGCM(key).encrypt(nonce, plaintext, BACKUP_HEADER)
    backup_id = secrets.token_hex(16)
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    target = _backup_path(backup_id)
    temporary = target.with_suffix(".tmp")
    temporary.write_bytes(encrypted)
    os.replace(temporary, target)
    return _metadata(target)


def _decrypt(path: Path) -> bytes:
    encrypted = path.read_bytes()
    header_length = len(BACKUP_HEADER)
    if len(encrypted) < header_length + 12 + 16 or not encrypted.startswith(BACKUP_HEADER):
        raise ValueError("Backup format is invalid.")
    nonce = encrypted[header_length:header_length + 12]
    try:
        return AESGCM(_encryption_key()).decrypt(nonce, encrypted[header_length + 12:], BACKUP_HEADER)
    except InvalidTag as error:
        raise ValueError("Backup authentication failed; check the backup key and file integrity.") from error


def _validated_archive(plaintext: bytes, staging_root: Path) -> None:
    allowed_roots = set(BACKUP_SOURCES)
    try:
        with zipfile.ZipFile(io.BytesIO(plaintext)) as archive:
            manifest = json.loads(archive.read("_backup-manifest.json"))
            if not isinstance(manifest, dict) or manifest.get("format_version") != 1 or not isinstance(manifest.get("files"), dict):
                raise ValueError("Backup manifest is invalid or unsupported.")

            archived_files: set[str] = set()
            total_size = 0
            for info in archive.infolist():
                if info.filename == "_backup-manifest.json" or info.is_dir():
                    continue
                archive_path = PurePosixPath(info.filename)
                if "\\" in info.filename or ":" in info.filename or archive_path.is_absolute() or ".." in archive_path.parts or not archive_path.parts or archive_path.parts[0] not in allowed_roots:
                    raise ValueError("Backup contains a path outside the approved data stores.")
                if (info.external_attr >> 16) & 0o170000 == 0o120000:
                    raise ValueError("Backup contains an unsupported symbolic link.")
                total_size += info.file_size
                if total_size > MAX_BACKUP_BYTES:
                    raise ValueError("Backup expands beyond the 256 MB restore limit.")
                contents = archive.read(info)
                if manifest["files"].get(info.filename) != hashlib.sha256(contents).hexdigest():
                    raise ValueError("Backup checksum verification failed.")
                destination = staging_root.joinpath(*archive_path.parts)
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(contents)
                archived_files.add(info.filename)

            if archived_files != set(manifest["files"]):
                raise ValueError("Backup manifest does not match the archive contents.")
            for name in allowed_roots:
                (staging_root / name).mkdir(parents=True, exist_ok=True)
    except (KeyError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        raise ValueError("Backup archive is invalid or incomplete.") from error


def restore_backup(backup_id: str) -> dict[str, Any]:
    backup_path = get_backup_path(backup_id)
    plaintext = _decrypt(backup_path)
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="restore-", dir=BACKUP_ROOT) as temporary_directory:
        temporary_root = Path(temporary_directory)
        staging_root = temporary_root / "staged"
        staging_root.mkdir()
        _validated_archive(plaintext, staging_root)
        old_root = temporary_root / "previous"
        old_root.mkdir()
        replaced: list[str] = []

        try:
            for name, target in BACKUP_SOURCES.items():
                target.parent.mkdir(parents=True, exist_ok=True)
                previous = old_root / name
                if target.exists():
                    os.replace(target, previous)
                try:
                    os.replace(staging_root / name, target)
                except Exception:
                    if previous.exists():
                        os.replace(previous, target)
                    raise
                replaced.append(name)
        except Exception:
            for name in reversed(replaced):
                target = BACKUP_SOURCES[name]
                shutil.rmtree(target, ignore_errors=True)
                previous = old_root / name
                if previous.exists():
                    os.replace(previous, target)
            raise

    return {**_metadata(backup_path), "restored": True}