"""Attribute reconciliation and fuzzy matching utilities."""

from __future__ import annotations


def normalize_name(value: str) -> str:
    """Normalize a field name for fuzzy matching."""
    return value.strip().lower().replace("_", " ")


def reconcile_attributes(source_key: str, target_key: str) -> bool:
    """Return True when the attribute names are considered equivalent."""
    return normalize_name(source_key) == normalize_name(target_key)
