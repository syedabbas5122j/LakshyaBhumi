import time

import pytest
from fastapi.testclient import TestClient

from app.core import admin_storage, authentication, managed_accounts, runtime_configuration
from app.main import app
from app.services import audit_service, backup_service


@pytest.fixture
def admin_environment(monkeypatch, tmp_path):
    admin_root = tmp_path / "admin-data"
    monkeypatch.setattr(admin_storage, "ADMIN_DATA_ROOT", admin_root)
    monkeypatch.setattr(managed_accounts, "ACCOUNTS_PATH", admin_root / "managed-accounts.json")
    monkeypatch.setattr(runtime_configuration, "CONFIG_PATH", admin_root / "runtime-config.json")
    monkeypatch.setattr(audit_service, "AUDIT_PATH", admin_root / "audit.jsonl")
    monkeypatch.setattr(backup_service, "BACKUP_ROOT", tmp_path / "backups")
    monkeypatch.setattr(backup_service, "BACKUP_SOURCES", {
        "admin-data": admin_root,
        "field-submissions": tmp_path / "field-submissions",
        "harmonized-data": tmp_path / "harmonized-data",
        "integration-access": tmp_path / "integration-access",
        "uploaded-data": tmp_path / "uploaded-data",
    })
    monkeypatch.setenv("BHUSHA_BACKUP_KEY", "random-test-backup-key-that-is-long-enough-123456")
    monkeypatch.setenv("BHUSHA_AUTH_USERS", "{}")
    monkeypatch.delenv("BHUSHA_AUTH_DEMO", raising=False)
    authentication._sessions.clear()
    authentication._sessions["admin-token"] = (
        {"id": "admin-id", "audience": "officer", "role": "System Administrator"},
        time.time() + 3600,
    )
    yield tmp_path
    authentication._sessions.clear()


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_routes_require_system_administrator(admin_environment):
    authentication._sessions["support-token"] = (
        {"id": "support-id", "audience": "officer", "role": "IT Support Staff"},
        time.time() + 3600,
    )
    with TestClient(app) as client:
        assert client.get("/api/v1/admin/users").status_code == 401
        assert client.get("/api/v1/admin/users", headers={"Authorization": "Bearer support-token"}).status_code == 403
        assert client.get("/api/v1/admin/users", headers={"Authorization": "Bearer admin-token"}).status_code == 200


def test_admin_can_create_managed_user_without_exposing_password_hash(admin_environment):
    with TestClient(app) as client:
        response = client.post("/api/v1/admin/users", headers={"Authorization": "Bearer admin-token"}, json={
            "identity": "field.collector@example.test",
            "audience": "officer",
            "role": "Village Surveyor",
            "password": "Strong-Test-Password-01",
            "district": "Tirupati District",
            "mandal": "Tirupati Urban",
            "village": "Tirupati Urban",
        })
        users = client.get("/api/v1/admin/users", headers={"Authorization": "Bearer admin-token"})

    assert response.status_code == 201
    assert "password_hash" not in response.json()["user"]
    assert any(item["identity"] == "field.collector@example.test" for item in users.json()["users"])
    session = authentication.authenticate_officer("field.collector@example.test", "Strong-Test-Password-01", "Village Surveyor")
    assert session is not None


def test_admin_requires_scope_for_review_accounts(admin_environment):
    with TestClient(app) as client:
        response = client.post("/api/v1/admin/users", headers={"Authorization": "Bearer admin-token"}, json={
            "identity": "village.reviewer@example.test",
            "audience": "officer",
            "role": "Village Revenue Officer (VRO)",
            "password": "Strong-Test-Password-01",
        })
    assert response.status_code == 422
    assert "district, mandal, village" in response.json()["detail"]


def test_admin_can_change_role_and_jurisdiction_and_revoke_sessions(admin_environment):
    with TestClient(app) as client:
        created = client.post("/api/v1/admin/users", headers=_headers("admin-token"), json={
            "identity": "reviewer@example.test",
            "audience": "officer",
            "role": "Village Surveyor",
            "password": "Strong-Test-Password-01",
        })
        session = authentication.authenticate_officer("reviewer@example.test", "Strong-Test-Password-01", "Village Surveyor")
        response = client.patch("/api/v1/admin/users/reviewer@example.test", headers=_headers("admin-token"), json={
            "role": "Village Revenue Officer (VRO)",
            "district": "Tirupati District",
            "mandal": "Tirupati Urban",
            "village": "Tirupati Urban",
        })

    assert created.status_code == 201
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "Village Revenue Officer (VRO)"
    assert session is not None
    assert authentication.get_session(session["access_token"]) is None


def test_audit_endpoint_requires_system_administrator(admin_environment):
    with TestClient(app) as client:
        response = client.get("/api/v1/admin/audit")

    assert response.status_code == 401


def test_admin_cannot_disable_last_system_administrator(admin_environment):
    with TestClient(app) as client:
        created = client.post("/api/v1/admin/users", headers={"Authorization": "Bearer admin-token"}, json={
            "identity": "only-admin@example.test",
            "audience": "officer",
            "role": "System Administrator",
            "password": "Strong-Test-Password-01",
        })
        response = client.patch(
            "/api/v1/admin/users/only-admin@example.test",
            headers={"Authorization": "Bearer admin-token"},
            json={"is_active": False},
        )

    assert created.status_code == 201
    assert response.status_code == 409


def test_runtime_configuration_is_enforced_and_audited(admin_environment):
    authentication._sessions["surveyor-token"] = (
        {"id": "surveyor-id", "audience": "officer", "role": "Village Surveyor"},
        time.time() + 3600,
    )
    authentication._sessions["district-surveyor-token"] = (
        {"id": "district-surveyor-id", "audience": "officer", "role": "District Survey Officer"},
        time.time() + 3600,
    )
    with TestClient(app) as client:
        updated = client.patch(
            "/api/v1/admin/config",
            headers={"Authorization": "Bearer admin-token"},
            json={"uploads_enabled": False, "citizen_login_enabled": False, "harmonization_enabled": False},
        )
        upload = client.post(
            "/api/v1/ingestion/upload",
            headers={"Authorization": "Bearer surveyor-token"},
            data={"dataset_name": "Test data", "area_level": "village", "area_name": "Tirupati"},
            files={"file": ("data.geojson", b"{}", "application/geo+json")},
        )
        citizen_login = client.post("/api/v1/auth/citizen/otp/request", json={"contact": "owner@example.test", "role": "Land Owner"})
        harmonization = client.post("/api/v1/engine/harmonize", headers=_headers("district-surveyor-token"), json={})
        audit = client.get("/api/v1/admin/audit", headers={"Authorization": "Bearer admin-token"})

    assert updated.status_code == 200
    assert upload.status_code == 503
    assert citizen_login.status_code == 503
    assert harmonization.status_code == 503
    assert audit.status_code == 200
    assert audit.json()["events"][0]["action"] == "runtime_config_updated"
    assert audit.json()["integrity_valid"] is True


def test_audit_log_detects_modified_events(admin_environment):
    with TestClient(app) as client:
        client.patch("/api/v1/admin/config", headers={"Authorization": "Bearer admin-token"}, json={"uploads_enabled": False})
        audit_file = admin_storage.ADMIN_DATA_ROOT / "audit.jsonl"
        audit_file.write_text(audit_file.read_text(encoding="utf-8").replace("uploads_enabled", "modified_flag"), encoding="utf-8")
        response = client.get("/api/v1/admin/audit", headers={"Authorization": "Bearer admin-token"})

    assert response.status_code == 200
    assert response.json()["integrity_valid"] is False


def test_encrypted_backup_restores_approved_stores(admin_environment):
    upload_root = admin_environment / "uploaded-data"
    upload_root.mkdir()
    source_file = upload_root / "manifest.json"
    source_file.write_text("sensitive upload manifest", encoding="utf-8")

    backup = backup_service.create_backup()
    encrypted_file = backup_service.get_backup_path(backup["id"])
    assert b"sensitive upload manifest" not in encrypted_file.read_bytes()

    source_file.write_text("changed after backup", encoding="utf-8")
    restored = backup_service.restore_backup(backup["id"])

    assert restored["restored"] is True
    assert source_file.read_text(encoding="utf-8") == "sensitive upload manifest"


def test_backup_restore_rejects_wrong_key(admin_environment, monkeypatch):
    backup = backup_service.create_backup()
    monkeypatch.setenv("BHUSHA_BACKUP_KEY", "different-random-test-key-long-enough-for-aes-gcm")

    with pytest.raises(ValueError, match="authentication failed"):
        backup_service.restore_backup(backup["id"])


def test_restore_rejects_windows_path_traversal(admin_environment, tmp_path):
    import hashlib
    import io
    import json
    import zipfile

    traversal = "admin-data\\..\\outside.json"
    contents = b"not allowed outside the backup root"
    manifest = {"format_version": 1, "files": {traversal: hashlib.sha256(contents).hexdigest()}}
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w") as archive:
        archive.writestr(traversal, contents)
        archive.writestr("_backup-manifest.json", json.dumps(manifest))

    with pytest.raises(ValueError, match="path outside"):
        backup_service._validated_archive(archive_buffer.getvalue(), tmp_path)