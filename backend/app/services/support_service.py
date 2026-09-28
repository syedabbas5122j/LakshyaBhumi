"""Privacy-minimized help-desk tickets and aggregate operations diagnostics."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from app.core.admin_storage import ADMIN_DATA_ROOT, read_json, write_json
from app.services.audit_service import record_audit_event
from app.services.harmonization_service import list_harmonization_runs
from app.services.integration_sync_service import list_sync_queue
from app.services.upload_service import list_uploads

TICKETS_PATH = ADMIN_DATA_ROOT / "support-tickets.json"
TicketCategory = Literal["Account access", "Upload or sync", "System availability", "Other"]
TicketStatus = Literal["New", "In progress", "Resolved"]
SUPPORT_OPERATORS = {"Help Desk Operator", "IT Support Staff", "System Administrator"}
TECHNICAL_CATEGORIES = {"Upload or sync", "System availability"}
UPLOAD_AREA_LEVELS = ["ward", "village", "town", "city", "mandal", "district"]


def _read_tickets() -> list[dict[str, Any]]:
    payload = read_json(TICKETS_PATH, [])
    if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
        raise RuntimeError("Support ticket store has an invalid format.")
    return payload


def create_ticket(category: TicketCategory, summary: str, actor: dict[str, str]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    ticket = {
        "id": f"HD-{uuid4().hex[:10].upper()}",
        "category": category,
        "summary": summary.strip(),
        "status": "New",
        "created_at": now,
        "updated_at": now,
        "created_by": {"id": actor.get("id", "unknown"), "role": actor.get("role", "unknown")},
        "assigned_to": "Help Desk Operator",
        "history": [{"action": "created", "actor_role": actor.get("role", "unknown"), "at": now}],
    }
    tickets = _read_tickets()
    tickets.append(ticket)
    write_json(TICKETS_PATH, tickets)
    record_audit_event(actor, "support_ticket_created", ticket["id"], {"category": category})
    return ticket


def list_tickets(actor: dict[str, str]) -> list[dict[str, Any]]:
    visible: list[dict[str, Any]] = []
    for ticket in reversed(_read_tickets()):
        if actor.get("role") == "IT Support Staff" and ticket.get("category") not in TECHNICAL_CATEGORIES:
            continue
        if actor.get("role") not in SUPPORT_OPERATORS and ticket.get("created_by", {}).get("id") != actor.get("id"):
            continue
        visible.append(ticket)
    return visible


def update_ticket(
    ticket_id: str,
    status: TicketStatus,
    assigned_to: Literal["Help Desk Operator", "IT Support Staff"] | None,
    actor: dict[str, str],
) -> dict[str, Any]:
    tickets = _read_tickets()
    ticket = next((item for item in tickets if item.get("id") == ticket_id), None)
    if ticket is None:
        raise LookupError("Support ticket was not found.")
    if actor.get("role") == "IT Support Staff" and ticket.get("category") not in TECHNICAL_CATEGORIES:
        raise PermissionError("IT Support may only access upload and service availability tickets.")
    if actor.get("role") not in SUPPORT_OPERATORS:
        raise PermissionError("Support operator access is required.")
    if actor.get("role") == "IT Support Staff" and assigned_to == "Help Desk Operator":
        raise PermissionError("IT Support cannot route tickets to the Help Desk.")

    previous_status = ticket["status"]
    previous_assignee = ticket["assigned_to"]
    if assigned_to == "IT Support Staff" and ticket.get("category") not in TECHNICAL_CATEGORIES:
        raise PermissionError("Only upload and service availability tickets can be routed to IT Support.")
    ticket["status"] = status
    if assigned_to is not None:
        ticket["assigned_to"] = assigned_to
    now = datetime.now(timezone.utc).isoformat()
    ticket["updated_at"] = now
    ticket.setdefault("history", []).append({
        "action": "updated",
        "actor_role": actor.get("role", "unknown"),
        "at": now,
        "from_status": previous_status,
        "to_status": status,
        "from_assignee": previous_assignee,
        "to_assignee": ticket["assigned_to"],
    })
    write_json(TICKETS_PATH, tickets)
    record_audit_event(actor, "support_ticket_updated", ticket_id, {"status": status, "assigned_to": ticket["assigned_to"]})
    return ticket


def get_diagnostics() -> dict[str, Any]:
    services: list[dict[str, Any]] = [{"name": "API process", "status": "Operational"}]
    try:
        uploads = list_uploads(UPLOAD_AREA_LEVELS)
        services.append({"name": "Upload processing", "status": "Available", "pending_count": sum(item.get("status", "").startswith("Received") for item in uploads)})
    except (OSError, RuntimeError):
        services.append({"name": "Upload processing", "status": "Needs attention", "pending_count": None})
    try:
        queue = list_sync_queue()
        services.append({"name": "Integration sync", "status": "Available", "queued_count": len(queue)})
    except (OSError, RuntimeError):
        services.append({"name": "Integration sync", "status": "Needs attention", "queued_count": None})
    try:
        services.append({"name": "Harmonization storage", "status": "Available", "run_count": len(list_harmonization_runs())})
    except (OSError, RuntimeError):
        services.append({"name": "Harmonization storage", "status": "Needs attention", "run_count": None})
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "services": services}