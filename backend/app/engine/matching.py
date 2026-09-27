"""Spatial matching service for candidate generation and feature comparison."""

from __future__ import annotations

from typing import Any


def generate_candidates(source_features: list[dict[str, Any]], target_features: list[dict[str, Any]]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """Return a simple candidate pair list for matching operations."""
    pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for source in source_features:
        for target in target_features:
            pairs.append((source, target))
    return pairs


def compute_similarity(source: dict[str, Any], target: dict[str, Any]) -> float:
    """A lightweight placeholder similarity score."""
    return 0.0 if not source or not target else 0.85
