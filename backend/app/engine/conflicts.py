"""Conflict detection and resolution logic."""

from __future__ import annotations


def detect_conflicts(features: list[dict]) -> list[dict]:
    """Return a list of detected conflicts."""
    return [
        {
            "feature_id": feature.get("id"),
            "severity": "medium",
            "status": "pending_review",
        }
        for feature in features
    ]


def auto_resolve_conflict(conflict: dict) -> dict:
    """Placeholder conflict resolution decision."""
    return {**conflict, "status": "auto_resolved"}
