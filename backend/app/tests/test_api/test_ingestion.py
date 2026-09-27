import json
import time

import pytest
from fastapi.testclient import TestClient

from app.core import authentication
from app.main import app
from app.services import upload_service


@pytest.fixture
def upload_test_environment(monkeypatch, tmp_path):
    authentication._sessions.clear()
    monkeypatch.setattr(upload_service, "UPLOAD_ROOT", tmp_path / "uploads")
    monkeypatch.setattr(upload_service, "MANIFEST_PATH", tmp_path / "uploads" / "manifest.json")
    authentication._sessions["surveyor-session"] = (
        {"id": "surveyor-1", "audience": "officer", "role": "Village Surveyor"},
        time.time() + 3600,
    )
    yield
    authentication._sessions.clear()


def _valid_geojson():
    return json.dumps({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"survey_no": "14/2"},
            "geometry": {"type": "Polygon", "coordinates": [[[79.4, 13.6], [79.41, 13.6], [79.41, 13.61], [79.4, 13.6]]]},
        }],
    }).encode("utf-8")


def test_upload_requires_authentication():
    with TestClient(app) as client:
        response = client.post("/api/v1/ingestion/upload", data={"dataset_name": "Ward parcel layer", "area_level": "village", "area_name": "Test Village"}, files={"file": ("data.geojson", _valid_geojson(), "application/geo+json")})
    assert response.status_code == 401


def test_village_surveyor_upload_is_stored_and_listed_in_scope(upload_test_environment):
    with TestClient(app) as client:
        client.headers["Authorization"] = "Bearer surveyor-session"
        scopes = client.get("/api/v1/ingestion/upload-scopes")
        response = client.post(
            "/api/v1/ingestion/upload",
            data={"dataset_name": "Village parcel corrections", "area_level": "village", "area_name": "Chandragiri", "parent_area": "Tirupati District", "crs": "EPSG:4326"},
            files={"file": ("../../unsafe.geojson", _valid_geojson(), "application/geo+json")},
        )
        uploads = client.get("/api/v1/ingestion/uploads")

    assert scopes.json()["area_levels"] == ["ward", "village"]
    assert response.status_code == 201
    upload = response.json()["upload"]
    assert upload["original_filename"] == "unsafe.geojson"
    assert upload["parent_area"] == "Tirupati District"
    assert upload["feature_count"] == 1
    assert upload["submitted_role"] == "Village Surveyor"
    assert upload["status"] == "Received - validation pending"
    assert len(uploads.json()["uploads"]) == 1
    assert (upload_service.UPLOAD_ROOT / upload["stored_filename"]).exists()


def test_village_role_cannot_upload_district_scope(upload_test_environment):
    with TestClient(app) as client:
        client.headers["Authorization"] = "Bearer surveyor-session"
        response = client.post(
            "/api/v1/ingestion/upload",
            data={"dataset_name": "District layer", "area_level": "district", "area_name": "Tirupati"},
            files={"file": ("data.geojson", _valid_geojson(), "application/geo+json")},
        )
    assert response.status_code == 403


def test_upload_rejects_non_feature_collection(upload_test_environment):
    with TestClient(app) as client:
        client.headers["Authorization"] = "Bearer surveyor-session"
        response = client.post(
            "/api/v1/ingestion/upload",
            data={"dataset_name": "Bad data", "area_level": "village", "area_name": "Test Village"},
            files={"file": ("bad.geojson", b'{"type":"Point","coordinates":[0,0]}', "application/geo+json")},
        )
    assert response.status_code == 422


def test_upload_rejects_empty_feature_collection(upload_test_environment):
    with TestClient(app) as client:
        client.headers["Authorization"] = "Bearer surveyor-session"
        response = client.post(
            "/api/v1/ingestion/upload",
            data={"dataset_name": "Empty data", "area_level": "village", "area_name": "Test Village"},
            files={"file": ("empty.geojson", b'{"type":"FeatureCollection","features":[]}', "application/geo+json")},
        )
    assert response.status_code == 422
