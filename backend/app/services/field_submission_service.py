"""Persistent field submissions for demo real-time survey workflows."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

SUBMISSION_ROOT = Path(__file__).resolve().parents[2] / "field-submissions"
SUBMISSION_PATH = SUBMISSION_ROOT / "submissions.json"
SubmissionType = Literal["Survey", "Claim", "Objection"]


def _read_submissions() -> list[dict[str, Any]]:
    if not SUBMISSION_PATH.exists():
        return []
    try:
        payload = json.loads(SUBMISSION_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Field submission store is unreadable.") from error
    return payload if isinstance(payload, list) else []


def create_submission(
    submission_type: SubmissionType,
    title: str,
    description: str,
    area_name: str,
    submitted_by: dict[str, str],
    attachment_name: str = "",
) -> dict[str, Any]:
    SUBMISSION_ROOT.mkdir(parents=True, exist_ok=True)
    submission = {
        "id": f"FS-{uuid4().hex[:10].upper()}",
        "type": submission_type,
        "title": title,
        "description": description,
        "area_name": area_name,
        "attachment_name": attachment_name,
        "status": "Queued for verification",
        "submitted_by": submitted_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    submissions = _read_submissions()
    submissions.append(submission)
    temporary_path = SUBMISSION_PATH.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(submissions, indent=2), encoding="utf-8")
    temporary_path.replace(SUBMISSION_PATH)
    return submission


def list_submissions() -> list[dict[str, Any]]:
    return list(reversed(_read_submissions()))
