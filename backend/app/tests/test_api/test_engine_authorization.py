import time

from fastapi.testclient import TestClient

from app.core import authentication
from app.main import app


def _session(role: str) -> tuple[dict[str, str], float]:
    return (
        {"id": role, "audience": "officer", "role": role},
        time.time() + 3600,
    )


def test_municipal_gis_manager_can_start_harmonization(monkeypatch):
    monkeypatch.setattr(authentication, "_sessions", {"gis-manager": _session("GIS Manager (Municipality)")})

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/engine/harmonize",
            headers={"Authorization": "Bearer gis-manager"},
            json={"source_upload_id": "same", "target_upload_id": "same"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Choose two different datasets."


def test_district_collector_cannot_start_harmonization(monkeypatch):
    monkeypatch.setattr(authentication, "_sessions", {"collector": _session("District Collector / District Magistrate")})

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/engine/harmonize",
            headers={"Authorization": "Bearer collector"},
            json={"source_upload_id": "same", "target_upload_id": "same"},
        )

    assert response.status_code == 403


def test_version_viewer_cannot_read_unscoped_live_run_list(monkeypatch):
    monkeypatch.setattr(authentication, "_sessions", {"collector": _session("District Collector / District Magistrate")})

    with TestClient(app) as client:
        response = client.get("/api/v1/engine/runs", headers={"Authorization": "Bearer collector"})

    assert response.status_code == 403