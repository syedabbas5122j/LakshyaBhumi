import time

import pytest
from fastapi.testclient import TestClient

from app.core import authentication
from app.main import app
from app.services import field_submission_service


@pytest.fixture(autouse=True)
def clear_auth_and_queue(monkeypatch, tmp_path):
    authentication._sessions.clear()
    monkeypatch.setattr(field_submission_service, "SUBMISSION_ROOT", tmp_path)
    monkeypatch.setattr(field_submission_service, "SUBMISSION_PATH", tmp_path / "submissions.json")
    yield
    authentication._sessions.clear()


def _authenticated_client(
    role="Ground Truth Surveyor",
    user_id="surveyor-1",
    **scope,
) -> TestClient:
    token = f"session-{user_id}"
    authentication._sessions[token] = (
        {"id": user_id, "audience": "officer", "role": role, **scope},
        time.time() + 3600,
    )
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {token}"
    return client


def test_ground_truth_request_requires_authentication():
    with TestClient(app) as client:
        response = client.post("/api/v1/ground-truth/requests", json={})
    assert response.status_code == 401


def test_ground_truth_request_validates_and_queues_geometry():
    payload = {
        "conflict_id": "TPT-00128",
        "district": "Tirupati District",
        "mandal": "Tirupati Urban",
        "village": "Tirupati Urban",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[79.42, 13.67], [79.43, 13.67], [79.43, 13.68], [79.42, 13.67]]],
        },
        "note": "Please verify this proposed parcel boundary in the field.",
    }
    with _authenticated_client() as client:
        response = client.post("/api/v1/ground-truth/requests", json=payload)
        listed = client.get("/api/v1/ground-truth/")

    assert response.status_code == 201
    request = response.json()["request"]
    assert request["conflict_id"] == "TPT-00128"
    assert request["status"] == "Pending village review"
    assert request["requested_by"]["role"] == "Ground Truth Surveyor"
    assert listed.json()["items"] == [request]


def test_submission_routes_through_scoped_reviewers_and_tracks_history():
    payload = {
        "type": "Survey",
        "title": "Boundary measurement",
        "description": "Updated corner measurements collected on site.",
        "area_name": "Survey 101",
        "district": "Tirupati District",
        "mandal": "Tirupati Urban",
        "village": "Tirupati Urban",
    }
    with _authenticated_client() as field_client:
        created = field_client.post("/api/v1/ground-truth/submissions", json=payload)
        submission = created.json()["submission"]
        assert submission["review_stage"] == "village"
        assert submission["status"] == "Pending village review"

        village_client = _authenticated_client(
            "Village Administrative Officer",
            "village-reviewer",
            district="Tirupati District",
            mandal="Tirupati Urban",
            village="Tirupati Urban",
        )
        mandal_client = _authenticated_client(
            "Mandal Revenue Officer (MRO)",
            "mandal-reviewer",
            district="Tirupati District",
            mandal="Tirupati Urban",
        )
        district_client = _authenticated_client(
            "District Survey Officer",
            "district-reviewer",
            district="Tirupati District",
        )
        other_village_client = _authenticated_client(
            "Village Administrative Officer",
            "other-village-reviewer",
            district="Tirupati District",
            mandal="Tirupati Urban",
            village="Chandragiri",
        )

        assert len(field_client.get("/api/v1/ground-truth/submissions").json()["submissions"]) == 1
        assert len(village_client.get("/api/v1/ground-truth/submissions").json()["submissions"]) == 1
        assert mandal_client.get("/api/v1/ground-truth/submissions").json()["submissions"] == []
        assert other_village_client.get("/api/v1/ground-truth/submissions").json()["submissions"] == []

        case_id = submission["id"]
        claimed = village_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "claim"})
        assert claimed.status_code == 200
        forwarded = village_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "forward", "note": "Village details verified."})
        assert forwarded.json()["submission"]["review_stage"] == "mandal"
        assert len(village_client.get("/api/v1/ground-truth/submissions").json()["submissions"]) == 1
        village_comment = village_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "comment", "note": "Village field notes are attached."})
        assert village_comment.status_code == 200

        mandal_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "claim"})
        mandal_forwarded = mandal_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "forward", "note": "Mandal records agree."})
        assert mandal_forwarded.json()["submission"]["review_stage"] == "district"

        district_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "claim"})
        approved = district_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "approve"})
        final_submission = approved.json()["submission"]

        assert final_submission["status"] == "Approved"
        assert [event["action"] for event in final_submission["review_history"]] == [
            "submitted", "claim", "forward", "comment", "claim", "forward", "claim", "approve",
        ]
        assert field_client.get("/api/v1/ground-truth/submissions").json()["submissions"][0]["status"] == "Approved"
        assert district_client.get("/api/v1/ground-truth/submissions").json()["submissions"][0]["status"] == "Approved"


def test_reviewer_cannot_act_outside_scope_or_skip_claim():
    payload = {
        "type": "Claim",
        "title": "Parcel claim",
        "description": "Please review this claim.",
        "area_name": "Survey 404",
        "district": "Tirupati District",
        "mandal": "Tirupati Urban",
        "village": "Tirupati Urban",
    }
    with _authenticated_client() as field_client:
        submission = field_client.post("/api/v1/ground-truth/submissions", json=payload).json()["submission"]
        wrong_scope = _authenticated_client(
            "Village Administrative Officer",
            "wrong-scope-reviewer",
            district="Tirupati District",
            mandal="Chandragiri",
            village="Chandragiri",
        )
        same_scope = _authenticated_client(
            "Village Administrative Officer",
            "same-scope-reviewer",
            district="Tirupati District",
            mandal="Tirupati Urban",
            village="Tirupati Urban",
        )
        case_id = submission["id"]
        assert wrong_scope.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "claim"}).status_code == 403
        assert same_scope.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "forward", "note": "Skip claim"}).status_code == 403


def test_rework_returns_to_submitter_and_resubmission_is_audited():
    payload = {
        "type": "Survey",
        "title": "Missing corner evidence",
        "description": "Survey evidence requires an additional measurement.",
        "area_name": "Survey 505",
        "district": "Tirupati District",
        "mandal": "Tirupati Urban",
        "village": "Tirupati Urban",
    }
    with _authenticated_client() as field_client:
        created = field_client.post("/api/v1/ground-truth/submissions", json=payload).json()["submission"]
        reviewer = _authenticated_client(
            "Village Administrative Officer",
            "rework-reviewer",
            district="Tirupati District",
            mandal="Tirupati Urban",
            village="Tirupati Urban",
        )
        case_id = created["id"]
        reviewer.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "claim"})
        rework = reviewer.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "request_rework", "note": "Add the northeast corner photo."})
        assert rework.json()["submission"]["status"] == "Rework requested"

        resubmitted = field_client.post(f"/api/v1/ground-truth/submissions/{case_id}/review", json={"action": "resubmit", "note": "Uploaded the requested northeast corner photo."})
        result = resubmitted.json()["submission"]
        assert result["status"] == "Pending village review"
        assert "Uploaded the requested northeast corner photo." in result["description"]
        assert [event["action"] for event in result["review_history"]][-2:] == ["request_rework", "resubmit"]


def test_submission_without_complete_geographic_scope_is_rejected():
    payload = {
        "type": "Claim",
        "title": "Unroutable request",
        "description": "No village scope was provided.",
        "area_name": "Survey 707",
    }
    with _authenticated_client() as client:
        response = client.post("/api/v1/ground-truth/submissions", json=payload)
    assert response.status_code == 422


def test_reviewer_can_assign_scoped_field_worker_and_worker_updates_status(monkeypatch):
    monkeypatch.setattr(authentication, "_load_accounts", lambda: {
        "worker@example.test": {
            "id": "worker-1", "audience": "officer", "role": "Village Surveyor",
            "district": "Tirupati District", "mandal": "Tirupati Urban", "village": "Tirupati Urban",
        },
    })
    payload = {
        "type": "Survey", "title": "Assigned field check", "description": "Verify the eastern boundary.",
        "area_name": "Survey 808", "district": "Tirupati District", "mandal": "Tirupati Urban", "village": "Tirupati Urban",
    }
    with _authenticated_client() as field_client:
        created = field_client.post("/api/v1/ground-truth/submissions", json=payload).json()["submission"]
        reviewer = _authenticated_client(
            "Village Administrative Officer", "assigning-reviewer",
            district="Tirupati District", mandal="Tirupati Urban", village="Tirupati Urban",
        )
        worker = _authenticated_client("Village Surveyor", "worker-1", district="Tirupati District", mandal="Tirupati Urban", village="Tirupati Urban")
        assignment = reviewer.post(f"/api/v1/ground-truth/submissions/{created['id']}/review", json={"action": "assign_field", "assignee_id": "worker-1"})
        visible = worker.get("/api/v1/ground-truth/submissions")
        started = worker.post(f"/api/v1/ground-truth/submissions/{created['id']}/review", json={"action": "field_start"})
        submitted = worker.post(f"/api/v1/ground-truth/submissions/{created['id']}/review", json={"action": "field_submit"})

    assert assignment.status_code == 200
    assert assignment.json()["submission"]["field_status"] == "Assigned"
    assert len(visible.json()["submissions"]) == 1
    assert started.json()["submission"]["field_status"] == "In progress"
    assert submitted.json()["submission"]["field_status"] == "Submitted"


def test_reviewer_cannot_assign_out_of_scope_field_worker(monkeypatch):
    monkeypatch.setattr(authentication, "_load_accounts", lambda: {
        "worker@example.test": {
            "id": "worker-2", "audience": "officer", "role": "Village Surveyor",
            "district": "Tirupati District", "mandal": "Chandragiri", "village": "Chandragiri",
        },
    })
    payload = {
        "type": "Survey", "title": "Scoped field check", "description": "Verify the boundary.",
        "area_name": "Survey 809", "district": "Tirupati District", "mandal": "Tirupati Urban", "village": "Tirupati Urban",
    }
    with _authenticated_client() as field_client:
        created = field_client.post("/api/v1/ground-truth/submissions", json=payload).json()["submission"]
        reviewer = _authenticated_client("Village Administrative Officer", "scope-reviewer", district="Tirupati District", mandal="Tirupati Urban", village="Tirupati Urban")
        response = reviewer.post(f"/api/v1/ground-truth/submissions/{created['id']}/review", json={"action": "assign_field", "assignee_id": "worker-2"})

    assert response.status_code == 403


def test_ground_truth_request_rejects_open_polygon_ring():
    payload = {
        "conflict_id": "TPT-00128",
        "geometry": {"type": "Polygon", "coordinates": [[[79.42, 13.67], [79.43, 13.67], [79.43, 13.68], [79.42, 13.68]]]},
        "note": "Test invalid open ring.",
    }
    with _authenticated_client() as client:
        response = client.post("/api/v1/ground-truth/requests", json=payload)
    assert response.status_code == 422
