"""Demo integration access requests with short-lived automatic approval."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

ACCESS_ROOT = Path(__file__).resolve().parents[2] / "integration-access"
REQUESTS_PATH = ACCESS_ROOT / "requests.json"


def _read() -> list[dict[str, Any]]:
    if not REQUESTS_PATH.exists():
        return []
    try:
        payload = json.loads(REQUESTS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Integration access store is unreadable.") from error
    return payload if isinstance(payload, list) else []


def _write(records: list[dict[str, Any]]) -> None:
    ACCESS_ROOT.mkdir(parents=True, exist_ok=True)
    temporary_path = REQUESTS_PATH.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    temporary_path.replace(REQUESTS_PATH)


def _with_status(record: dict[str, Any]) -> dict[str, Any]:
    result = dict(record)
    result["status"] = "Approved" if time.time() >= float(record["approved_at_epoch"]) else "Requested"
    return result


def create_access_request(department: str, method: str, contact: str, notes: str, user: dict[str, str]) -> dict[str, Any]:
    now = time.time()
    record = {
        "id": f"ACCESS-{uuid4().hex[:10].upper()}",
        "department": department,
        "method": method,
        "contact": contact,
        "notes": notes,
        "requested_by": user.get("id", "unknown"),
        "requested_at_epoch": now,
        "approved_at_epoch": now + 1,
    }
    records = _read()
    records.append(record)
    _write(records)
    return _with_status(record)


def list_access_requests(user: dict[str, str]) -> list[dict[str, Any]]:
    return [_with_status(record) for record in reversed(_read()) if record.get("requested_by") == user.get("id")]
