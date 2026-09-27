import time

import pytest
from fastapi.testclient import TestClient

from app.core import authentication
from app.engine import review_queue
from app.main import app


@pytest.fixture(autouse=True)
def clear_auth_and_queue():
    authentication._sessions.clear()
    review_queue._ground_truth_requests.clear()
    yield
    authentication._sessions.clear()
    review_queue._ground_truth_requests.clear()


def _authenticated_client() -> TestClient:
    authentication._sessions["test-session"] = (
        {"id": "surveyor-1", "audience": "officer", "role": "Ground Truth Surveyor"},
        time.time() + 3600,
    )
    client = TestClient(app)
    client.headers["Authorization"] = "Bearer test-session"
    return client


def test_ground_truth_request_requires_authentication():
    with TestClient(app) as client:
        response = client.post("/api/v1/ground-truth/requests", json={})
    assert response.status_code == 401


def test_ground_truth_request_validates_and_queues_geometry():
    payload = {
        "conflict_id": "TPT-00128",
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
    assert request["status"] == "Queued"
    assert request["requested_by"]["role"] == "Ground Truth Surveyor"
    assert listed.json()["items"] == [request]


def test_ground_truth_request_rejects_open_polygon_ring():
    payload = {
        "conflict_id": "TPT-00128",
        "geometry": {"type": "Polygon", "coordinates": [[[79.42, 13.67], [79.43, 13.67], [79.43, 13.68], [79.42, 13.68]]]},
        "note": "Test invalid open ring.",
    }
    with _authenticated_client() as client:
        response = client.post("/api/v1/ground-truth/requests", json=payload)
    assert response.status_code == 422
