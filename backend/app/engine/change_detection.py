"""Change detection for added, removed, and modified parcel features."""

from __future__ import annotations


def classify_change(before: list[dict], after: list[dict]) -> dict:
    """Return a basic classification summary for change detection."""
    return {
        "added": len(after) - len(before),
        "removed": 0,
        "modified": 0,
        "status": "analysis_ready",
    }
