"""Persistent, area-scoped field submission and review workflows."""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

SUBMISSION_ROOT = Path(__file__).resolve().parents[2] / "field-submissions"
SUBMISSION_PATH = SUBMISSION_ROOT / "submissions.json"
SubmissionType = Literal["Survey", "Claim", "Objection", "Boundary correction"]
REVIEW_STAGES = ("village", "mandal", "district")
REVIEW_ROLE_STAGE = {
    "Village Revenue Officer (VRO)": "village",
    "Ward Secretary": "village",
    "Patwari / Lekhpal": "village",
    "Village Administrative Officer": "village",
    "Mandal Revenue Officer (MRO)": "mandal",
    "Tahsildar": "mandal",
    "Survey Inspector": "mandal",
    "District Collector / District Magistrate": "district",
    "District Survey Officer": "district",
    "District Land Records Officer": "district",
}
FIELD_WORKER_ROLES = {
    "Village Surveyor",
    "Ground Truth Surveyor",
    "Drone Pilot",
    "GCP Marker",
    "Field Data Collector",
    "Mandal Surveyor",
    "City Surveyor",
}
_submission_lock = threading.RLock()


def _read_submissions() -> list[dict[str, Any]]:
    if not SUBMISSION_PATH.exists():
        return []
    try:
        payload = json.loads(SUBMISSION_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Field submission store is unreadable.") from error
    return payload if isinstance(payload, list) else []


def _write_submissions(submissions: list[dict[str, Any]]) -> None:
    SUBMISSION_ROOT.mkdir(parents=True, exist_ok=True)
    temporary_path = SUBMISSION_PATH.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(submissions, indent=2), encoding="utf-8")
    temporary_path.replace(SUBMISSION_PATH)


def _clean_scope_value(value: str | None) -> str:
    return value.strip() if isinstance(value, str) else ""


def _initial_stage(scope: dict[str, str]) -> str:
    if scope.get("village"):
        return "village"
    if scope.get("mandal"):
        return "mandal"
    if scope.get("district"):
        return "district"
    return "unassigned"


def _status_for_stage(stage: str) -> str:
    return f"Pending {stage} review" if stage in REVIEW_STAGES else "Needs location assignment"


def _actor_summary(actor: dict[str, str]) -> dict[str, str]:
    return {key: actor[key] for key in ("id", "audience", "role") if actor.get(key)}


def _same_value(left: str | None, right: str | None) -> bool:
    return bool(left and right and left.strip().casefold() == right.strip().casefold())


def _reviewer_can_access(submission: dict[str, Any], actor: dict[str, str], stage: str) -> bool:
    submission_stage = submission.get("review_stage", "unassigned")
    if submission_stage == "completed":
        submission_stage_index = len(REVIEW_STAGES)
    elif submission_stage in REVIEW_STAGES:
        submission_stage_index = REVIEW_STAGES.index(submission_stage)
    else:
        return False
    if REVIEW_STAGES.index(stage) > submission_stage_index:
        return False

    scope = submission.get("scope", {})
    required_keys = ("district",) if stage == "district" else (
        ("district", "mandal") if stage == "mandal" else ("district", "mandal", "village")
    )
    return all(_same_value(actor.get(key), scope.get(key)) for key in required_keys)


def _is_submitter(submission: dict[str, Any], actor: dict[str, str]) -> bool:
    return submission.get("submitted_by", {}).get("id") == actor.get("id")


def _is_field_assignee(submission: dict[str, Any], actor: dict[str, str]) -> bool:
    return submission.get("field_assignee", {}).get("id") == actor.get("id")


def field_worker_can_access_scope(worker: dict[str, str], scope: dict[str, str]) -> bool:
    if worker.get("role") not in FIELD_WORKER_ROLES or worker.get("audience") != "officer":
        return False
    required_scope = ("district", "mandal", "village")
    return all(not worker.get(key) or _same_value(worker.get(key), scope.get(key)) for key in required_scope)


def _complete_targeted_harmonization(submission_id: str) -> None:
    with _submission_lock:
        submissions = _read_submissions()
        for submission in submissions:
            if submission.get("id") == submission_id and submission.get("targeted_harmonization"):
                submission["targeted_harmonization"].update({
                    "status": "Completed",
                    "processed_scope": "conflicted-and-changed-areas",
                    "layers_reprocessed": ["conflicts", "changes"],
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                })
                _write_submissions(submissions)
                break


def create_submission(
    submission_type: SubmissionType,
    title: str,
    description: str,
    area_name: str,
    submitted_by: dict[str, str],
    attachment_name: str = "",
    *,
    district: str = "",
    mandal: str = "",
    village: str = "",
    submission_type_label: str | None = None,
    geometry: dict[str, Any] | None = None,
    conflict_id: str | None = None,
    field_assignee: dict[str, str] | None = None,
) -> dict[str, Any]:
    scope = {
        key: _clean_scope_value(value) or _clean_scope_value(submitted_by.get(key))
        for key, value in (("district", district), ("mandal", mandal), ("village", village))
    }
    if not all(scope.values()):
        raise ValueError("District, mandal, and village are required to route this submission.")
    for key, assigned_value in (("district", district), ("mandal", mandal), ("village", village)):
        user_value = _clean_scope_value(submitted_by.get(key))
        if user_value and assigned_value and not _same_value(user_value, assigned_value):
            raise PermissionError(f"Submission {key} must match your assigned area.")

    review_stage = _initial_stage(scope)
    created_at = datetime.now(timezone.utc).isoformat()
    submission = {
        "id": f"FS-{uuid4().hex[:10].upper()}",
        "type": submission_type,
        "type_label": submission_type_label or submission_type,
        "title": title,
        "description": description,
        "area_name": area_name,
        "attachment_name": attachment_name,
        "scope": scope,
        "review_stage": review_stage,
        "status": _status_for_stage(review_stage),
        "assigned_to": None,
        "submitted_by": _actor_summary(submitted_by),
        "created_at": created_at,
        "updated_at": created_at,
        "review_history": [{
            "action": "submitted",
            "note": "Submission received and added to the review workflow.",
            "actor": _actor_summary(submitted_by),
            "created_at": created_at,
        }],
    }
    if geometry is not None:
        submission["geometry"] = geometry
    if conflict_id:
        submission["conflict_id"] = conflict_id
        submission["requested_by"] = _actor_summary(submitted_by)
    if field_assignee:
        if not field_worker_can_access_scope(field_assignee, scope):
            raise PermissionError("The selected field worker is outside this submission scope.")
        submission["field_assignee"] = _actor_summary(field_assignee)
        submission["field_status"] = "Assigned"
    if submission_type == "Survey":
        submission["targeted_harmonization"] = {
            "status": "Queued",
            "scope": "conflicted-and-changed-areas",
            "full_layer_rebuild": False,
            "trigger": "ground-truth-survey-upload",
        }
    with _submission_lock:
        submissions = _read_submissions()
        submissions.append(submission)
        _write_submissions(submissions)
    if submission_type == "Survey":
        threading.Timer(1.0, _complete_targeted_harmonization, args=(submission["id"],),).start()
    return submission


def list_submissions(actor: dict[str, str]) -> list[dict[str, Any]]:
    stage = REVIEW_ROLE_STAGE.get(actor.get("role", ""))
    if actor.get("audience") != "officer" or not stage:
        visible = [submission for submission in _read_submissions() if _is_submitter(submission, actor) or _is_field_assignee(submission, actor)]
    else:
        visible = [
            submission for submission in _read_submissions()
            if _is_submitter(submission, actor) or _reviewer_can_access(submission, actor, stage)
        ]
    return list(reversed(visible))


def review_submission(
    submission_id: str,
    action: Literal["claim", "release", "comment", "forward", "request_rework", "resubmit", "approve", "reject", "assign_field", "release_field", "field_start", "field_submit"],
    note: str,
    actor: dict[str, str],
    field_assignee: dict[str, str] | None = None,
) -> dict[str, Any]:
    with _submission_lock:
        submissions = _read_submissions()
        submission = next((item for item in submissions if item.get("id") == submission_id), None)
        if submission is None:
            raise LookupError("Submission was not found.")

        note = note.strip()
        submitter = _is_submitter(submission, actor)
        actor_stage = REVIEW_ROLE_STAGE.get(actor.get("role", ""))
        is_reviewer = bool(actor_stage and _reviewer_can_access(submission, actor, actor_stage))
        current_status = submission.get("status")

        if current_status in {"Approved", "Rejected"} and action != "comment":
            raise ValueError("This submission is already closed.")
        if current_status == "Rework requested" and action not in {"resubmit", "comment"}:
            raise ValueError("The submitter must resubmit this case before review continues.")

        if action in {"field_start", "field_submit"}:
            if not _is_field_assignee(submission, actor):
                raise PermissionError("Only the assigned field worker can update field status.")
            if action == "field_start":
                submission["field_status"] = "In progress"
                note = note or "Field work started."
            else:
                submission["field_status"] = "Submitted"
                note = note or "Field evidence submitted for review."
        elif action in {"assign_field", "release_field"}:
            if not is_reviewer or actor_stage != submission.get("review_stage"):
                raise PermissionError("This submission is not in your review queue.")
            if action == "assign_field":
                if not field_assignee or not field_worker_can_access_scope(field_assignee, submission.get("scope", {})):
                    raise PermissionError("The selected field worker is outside this submission scope.")
                submission["field_assignee"] = _actor_summary(field_assignee)
                submission["field_status"] = "Assigned"
                note = note or f"Field work assigned to {field_assignee.get('role', 'worker')}."
            else:
                if not submission.get("field_assignee"):
                    raise ValueError("This submission has no field assignment to release.")
                submission["field_assignee"] = None
                submission["field_status"] = "Unassigned"
                note = note or "Field assignment released."
        elif action == "resubmit":
            if not submitter or submission.get("status") != "Rework requested":
                raise PermissionError("Only the submitter can resubmit a case returned for rework.")
            if len(note) < 2:
                raise ValueError("Add a note describing the updated field information.")
            submission["description"] = f"{submission['description']}\n\nResubmission: {note}"
            submission["status"] = _status_for_stage(submission["review_stage"])
            submission["assigned_to"] = None
        elif action == "comment":
            if not submitter and not is_reviewer:
                raise PermissionError("You cannot comment on this submission.")
            if len(note) < 2:
                raise ValueError("A review comment must contain at least two characters.")
        else:
            if not is_reviewer or actor_stage != submission.get("review_stage"):
                raise PermissionError("This submission is not in your review queue.")
            assigned_to = submission.get("assigned_to")
            if assigned_to and assigned_to.get("id") != actor.get("id"):
                raise PermissionError("This case is claimed by another reviewer.")
            if action == "claim":
                if assigned_to:
                    raise ValueError("This case is already claimed by you.")
                submission["assigned_to"] = _actor_summary(actor)
                note = note or "Case claimed for review."
            elif action == "release":
                if not assigned_to or assigned_to.get("id") != actor.get("id"):
                    raise PermissionError("Only the reviewer who claimed this case can release it.")
                submission["assigned_to"] = None
                note = note or "Case released back to the review queue."
            elif action in {"forward", "request_rework", "approve", "reject"} and not assigned_to:
                raise PermissionError("Claim this case before taking a review action.")
            elif action == "forward":
                if actor_stage == "district":
                    raise ValueError("District review is the final workflow stage.")
                if len(note) < 2:
                    raise ValueError("Add a note before forwarding this case.")
                next_stage = REVIEW_STAGES[REVIEW_STAGES.index(actor_stage) + 1]
                submission["review_stage"] = next_stage
                submission["status"] = _status_for_stage(next_stage)
                submission["assigned_to"] = None
            elif action == "request_rework":
                if len(note) < 2:
                    raise ValueError("Explain what field information needs rework.")
                submission["status"] = "Rework requested"
                submission["assigned_to"] = None
            elif action == "approve":
                if actor_stage != "district":
                    raise PermissionError("Only a district reviewer can approve a submission.")
                submission["status"] = "Approved"
                submission["review_stage"] = "completed"
                submission["assigned_to"] = None
                note = note or "Approved by district review."
            elif action == "reject":
                if actor_stage != "district":
                    raise PermissionError("Only a district reviewer can reject a submission.")
                if len(note) < 2:
                    raise ValueError("Add a reason before rejecting this case.")
                submission["status"] = "Rejected"
                submission["review_stage"] = "completed"
                submission["assigned_to"] = None

        event = {
            "action": action,
            "note": note,
            "actor": _actor_summary(actor),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        submission.setdefault("review_history", []).append(event)
        submission["updated_at"] = event["created_at"]
        _write_submissions(submissions)
        return dict(submission)
