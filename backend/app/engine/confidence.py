"""Confidence scoring and uncertainty estimation logic."""

from __future__ import annotations


def score_match(similarity: float, penalties: float = 0.0) -> float:
    """Return a normalized confidence score between 0 and 1."""
    score = similarity - penalties
    return max(0.0, min(1.0, score))
