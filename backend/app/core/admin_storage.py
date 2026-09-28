"""Small atomic JSON stores for local administration data."""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

ADMIN_DATA_ROOT = Path(os.getenv("BHUSHA_ADMIN_DATA_DIR", Path(__file__).resolve().parents[2] / "admin-data"))
_STORE_LOCK = threading.RLock()


def read_json(path: Path, default: Any) -> Any:
    with _STORE_LOCK:
        if not path.exists():
            return default
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise RuntimeError(f"Administration store is unreadable: {path.name}.") from error


def write_json(path: Path, payload: Any) -> None:
    with _STORE_LOCK:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = path.with_suffix(path.suffix + ".tmp")
        temporary_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        os.replace(temporary_path, path)


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    with _STORE_LOCK:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, separators=(",", ":")) + "\n")


def read_jsonl(path: Path, limit: int) -> list[dict[str, Any]]:
    with _STORE_LOCK:
        if not path.exists():
            return []
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError as error:
            raise RuntimeError("Audit log is unreadable.") from error
    records: list[dict[str, Any]] = []
    for line in reversed(lines):
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(record, dict):
            records.append(record)
            if len(records) >= limit:
                break
    return records