"""Human-in-the-loop review queue."""

from __future__ import annotations


def decide_review_action(confidence: float) -> str:
    """Choose whether a case should be auto-applied or queued for human review."""
    if confidence >= 0.8:
        return "auto_apply"
    if confidence >= 0.5:
        return "pending_review"
    return "escalate"
