"""Local integration outbox for propagating accepted uploads to department systems."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SYNC_ROOT = Path(__file__).resolve().parents[2] / "integration-sync"
QUEUE_PATH = SYNC_ROOT / "queue.json"

INTEGRATION_TARGETS = (
    ("survey-land-records", "Survey & Land Records"),
    ("revenue", "Revenue Department"),
    ("municipal-gis", "Municipal GIS / Urban Local Bodies"),
    ("ground-truth", "Ground Truth & Survey Teams"),
    ("gnss-cors", "GNSS / CORS Services"),
    ("drone-imagery", "Drone & Remote Sensing"),
    ("utilities", "Utilities & Infrastructure"),
)


def _read_queue() -> list[dict[str, Any]]:
    if not QUEUE_PATH.exists():
        return []
    try:
        payload = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Integration sync queue is unreadable.") from error
    if not isinstance(payload, list):
        raise RuntimeError("Integration sync queue has an invalid format.")
    return payload


def enqueue_upload(record: dict[str, Any]) -> list[dict[str, str]]:
    """Create auditable pending sync work for each approved department target."""
    SYNC_ROOT.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).isoformat()
    entries = [
        {
            "upload_id": str(record["id"]),
            "dataset_name": str(record["dataset_name"]),
            "integration_id": integration_id,
            "integration_name": integration_name,
            "status": "Queued - connector approval pending",
            "queued_at": timestamp,
        }
        for integration_id, integration_name in INTEGRATION_TARGETS
    ]
    queue = [item for item in _read_queue() if item.get("upload_id") != record.get("id")]
    queue.extend(entries)
    QUEUE_PATH.with_suffix(".tmp").write_text(json.dumps(queue, indent=2), encoding="utf-8")
    QUEUE_PATH.with_suffix(".tmp").replace(QUEUE_PATH)
    return [{"integration_id": item["integration_id"], "status": item["status"]} for item in entries]


def list_sync_queue() -> list[dict[str, Any]]:
    return list(reversed(_read_queue()))
