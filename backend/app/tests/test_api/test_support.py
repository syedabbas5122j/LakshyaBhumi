import time

import pytest
from fastapi.testclient import TestClient

from app.core import admin_storage, authentication, runtime_configuration
from app.main import app
from app.services import support_service


@pytest.fixture
def support_environment(monkeypatch, tmp_path):
    admin_root = tmp_path / "admin-data"
    monkeypatch.setattr(admin_storage, "ADMIN_DATA_ROOT", admin_root)
    monkeypatch.setattr(runtime_configuration, "CONFIG_PATH", admin_root / "runtime-config.json")
    monkeypatch.setattr(support_service, "TICKETS_PATH", admin_root / "support-tickets.json")
    authentication._sessions.clear()
    for token, role in (
        ("helpdesk", "Help Desk Operator"),
        ("it-support", "IT Support Staff"),
        ("admin", "System Administrator"),
        ("citizen", "Land Owner"),
        ("officer", "Village Surveyor"),
    ):
        authentication._sessions[token] = ({"id": token, "audience": "citizen" if role == "Land Owner" else "officer", "role": role}, time.time() + 3600)
    yield tmp_path
    authentication._sessions.clear()


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_support_tickets_are_private_and_role_filtered(support_environment):
    with TestClient(app) as client:
        account_ticket = client.post("/api/v1/support/tickets", headers=_headers("citizen"), json={"category": "Account access", "summary": "I cannot sign in to my account."})
        technical_ticket = client.post("/api/v1/support/tickets", headers=_headers("officer"), json={"category": "Upload or sync", "summary": "My data upload remains queued."})
        helpdesk = client.get("/api/v1/support/tickets", headers=_headers("helpdesk"))
        it_queue = client.get("/api/v1/support/tickets", headers=_headers("it-support"))
        owner_queue = client.get("/api/v1/support/tickets", headers=_headers("citizen"))

    assert account_ticket.status_code == 201
    assert technical_ticket.status_code == 201
    assert {item["category"] for item in helpdesk.json()["tickets"]} == {"Account access", "Upload or sync"}
    assert [item["category"] for item in it_queue.json()["tickets"]] == ["Upload or sync"]
    assert [item["id"] for item in owner_queue.json()["tickets"]] == [account_ticket.json()["ticket"]["id"]]
    assert "district" not in technical_ticket.json()["ticket"]
    assert "geometry" not in technical_ticket.json()["ticket"]


def test_helpdesk_cannot_access_operational_or_parcel_diagnostics(support_environment):
    with TestClient(app) as client:
        denied = client.get("/api/v1/support/diagnostics", headers=_headers("helpdesk"))
        diagnostics = client.get("/api/v1/support/diagnostics", headers=_headers("it-support"))

    assert denied.status_code == 403
    assert diagnostics.status_code == 200
    assert all(set(item).issubset({"name", "status", "pending_count", "queued_count", "run_count"}) for item in diagnostics.json()["services"])


def test_support_operator_can_update_ticket_but_submitter_cannot(support_environment):
    with TestClient(app) as client:
        created = client.post("/api/v1/support/tickets", headers=_headers("officer"), json={"category": "System availability", "summary": "The status page is not responding."})
        ticket_id = created.json()["ticket"]["id"]
        denied = client.patch(f"/api/v1/support/tickets/{ticket_id}", headers=_headers("officer"), json={"status": "Resolved"})
        updated = client.patch(f"/api/v1/support/tickets/{ticket_id}", headers=_headers("it-support"), json={"status": "In progress"})

    assert denied.status_code == 403
    assert updated.status_code == 200
    assert updated.json()["ticket"]["status"] == "In progress"


def test_it_support_cannot_view_or_update_account_access_tickets(support_environment):
    with TestClient(app) as client:
        created = client.post("/api/v1/support/tickets", headers=_headers("citizen"), json={"category": "Account access", "summary": "I need help verifying my sign in."})
        ticket_id = created.json()["ticket"]["id"]
        update = client.patch(f"/api/v1/support/tickets/{ticket_id}", headers=_headers("it-support"), json={"status": "Resolved"})

    assert update.status_code == 403


def test_helpdesk_cannot_route_nontechnical_tickets_to_it(support_environment):
    with TestClient(app) as client:
        created = client.post("/api/v1/support/tickets", headers=_headers("citizen"), json={"category": "Account access", "summary": "I need help verifying my sign in."})
        ticket_id = created.json()["ticket"]["id"]
        response = client.patch(f"/api/v1/support/tickets/{ticket_id}", headers=_headers("helpdesk"), json={"status": "In progress", "assigned_to": "IT Support Staff"})

    assert response.status_code == 403


@pytest.mark.parametrize("summary", [
    "Please call me at 5551234567 about access.",
    "Upload failed for survey number 14/2 in the system.",
    "The service is at 13.67,79.42 and is unavailable.",
    "My OTP: 182944 is not accepted by the site.",
])
def test_support_ticket_rejects_sensitive_identifiers(support_environment, summary):
    with TestClient(app) as client:
        response = client.post("/api/v1/support/tickets", headers=_headers("officer"), json={"category": "Other", "summary": summary})

    assert response.status_code == 422


def test_disabled_ticket_intake_hides_submission_capability_in_response(support_environment):
    from app.core.runtime_configuration import update_runtime_config

    update_runtime_config({"support_tickets_enabled": False})
    with TestClient(app) as client:
        queue = client.get("/api/v1/support/tickets", headers=_headers("helpdesk"))
        create = client.post("/api/v1/support/tickets", headers=_headers("officer"), json={"category": "Other", "summary": "The service is not working as expected."})

    assert queue.status_code == 200
    assert queue.json()["ticket_intake_enabled"] is False
    assert create.status_code == 503