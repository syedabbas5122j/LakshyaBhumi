"""Lineage and audit metadata tracking for processed features."""

from __future__ import annotations


def create_lineage_record(feature_id: str, source_name: str, method: str) -> dict:
    """Create lineage metadata for a feature."""
    return {
        "feature_id": feature_id,
        "source_name": source_name,
        "method": method,
        "status": "recorded",
    }
