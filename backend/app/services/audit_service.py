"""Audit trail for privileged administrative and support actions."""

import hashlib
import json
import threading
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.admin_storage import ADMIN_DATA_ROOT, append_jsonl, read_jsonl

AUDIT_PATH = ADMIN_DATA_ROOT / "audit.jsonl"
_AUDIT_LOCK = threading.RLock()
_GENESIS_HASH = "0" * 64


def _event_hash(event: dict[str, Any]) -> str:
    payload = json.dumps(event, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def record_audit_event(actor: dict[str, str], action: str, target: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    with _AUDIT_LOCK:
        previous_events = read_jsonl(AUDIT_PATH, 1)
        event = {
            "id": f"AUD-{uuid4().hex[:12].upper()}",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "actor_id": actor.get("id", "unknown"),
            "actor_role": actor.get("role", "unknown"),
            "action": action,
            "target": target,
            "details": details or {},
            "previous_hash": previous_events[0].get("event_hash", _GENESIS_HASH) if previous_events else _GENESIS_HASH,
        }
        event["event_hash"] = _event_hash(event)
        append_jsonl(AUDIT_PATH, event)
    return event


def list_audit_events(limit: int = 100) -> list[dict[str, Any]]:
    return read_jsonl(AUDIT_PATH, limit)


def audit_integrity() -> bool:
    with _AUDIT_LOCK:
        if not AUDIT_PATH.exists():
            return True
        try:
            lines = AUDIT_PATH.read_text(encoding="utf-8").splitlines()
        except OSError:
            return False
        previous_hash = _GENESIS_HASH
        for line in lines:
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                return False
            if not isinstance(event, dict):
                return False
            event_hash = event.pop("event_hash", None)
            if event.get("previous_hash") != previous_hash or event_hash != _event_hash(event):
                return False
            previous_hash = event_hash
        return True