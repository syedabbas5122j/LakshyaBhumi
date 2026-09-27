"""Human-in-the-loop review queue."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

_ground_truth_requests: list[dict[str, Any]] = []


def decide_review_action(confidence: float) -> str:
    """Choose whether a case should be auto-applied or queued for human review."""
    if confidence >= 0.8:
        return "auto_apply"
    if confidence >= 0.5:
        return "pending_review"
    return "escalate"


def create_ground_truth_request(
    conflict_id: str,
    geometry: dict[str, Any],
    note: str,
    requested_by: dict[str, str],
) -> dict[str, Any]:
    request = {
        "id": f"GT-{uuid4().hex[:12].upper()}",
        "conflict_id": conflict_id,
        "geometry": geometry,
        "note": note,
        "requested_by": requested_by,
        "status": "Queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _ground_truth_requests.append(request)
    return request.copy()


def list_ground_truth_requests() -> list[dict[str, Any]]:
    return [request.copy() for request in _ground_truth_requests]
