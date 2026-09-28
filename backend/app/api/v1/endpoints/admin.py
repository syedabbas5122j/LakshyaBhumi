from __future__ import annotations

import os
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core import authentication
from app.core.admin_storage import ADMIN_DATA_ROOT
from app.core.managed_accounts import read_managed_accounts, write_managed_accounts
from app.core.runtime_configuration import get_runtime_config, update_runtime_config
from app.services.audit_service import audit_integrity, list_audit_events, record_audit_event
from app.services.backup_service import create_backup, get_backup_path, list_backups, restore_backup

router = APIRouter(prefix="/admin", tags=["admin"])
bearer_scheme = HTTPBearer(auto_error=False)
ADMIN_ROLE = "System Administrator"
REVIEWER_SCOPE = {"village": ("district", "mandal", "village"), "mandal": ("district", "mandal"), "district": ("district",)}


class ManagedUserCreate(BaseModel):
    identity: str = Field(min_length=3, max_length=200)
    audience: Literal["officer", "citizen"]
    role: str = Field(min_length=1, max_length=120)
    password: str = Field(default="", max_length=256)
    district: str = Field(default="", max_length=160)
    mandal: str = Field(default="", max_length=160)
    village: str = Field(default="", max_length=160)


class ManagedUserUpdate(BaseModel):
    role: str | None = Field(default=None, min_length=1, max_length=120)
    district: str | None = Field(default=None, max_length=160)
    mandal: str | None = Field(default=None, max_length=160)
    village: str | None = Field(default=None, max_length=160)
    is_active: bool | None = None


class PasswordReset(BaseModel):
    password: str = Field(min_length=12, max_length=256)


class RuntimeConfigPatch(BaseModel):
    uploads_enabled: bool | None = None
    harmonization_enabled: bool | None = None
    citizen_login_enabled: bool | None = None
    support_tickets_enabled: bool | None = None


def _authenticated_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, str]:
    user = authentication.get_session(credentials.credentials) if credentials else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    if user.get("audience") != "officer" or user.get("role") != ADMIN_ROLE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Administrator access is required.")
    return user


def _role_catalog() -> dict[str, set[str]]:
    roles: dict[str, set[str]] = {"officer": set(), "citizen": set()}
    for account in authentication._read_demo_accounts():
        audience = account.get("audience")
        role = account.get("role")
        if audience in roles and isinstance(role, str):
            roles[audience].add(role)
    return roles


def _validate_role(audience: str, role: str) -> None:
    if role not in _role_catalog().get(audience, set()):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a role defined by the platform role catalog.")


def _validate_review_scope(role: str, account: dict[str, str]) -> None:
    from app.services.field_submission_service import REVIEW_ROLE_STAGE

    stage = REVIEW_ROLE_STAGE.get(role)
    required = REVIEWER_SCOPE.get(stage or "", ())
    if any(not account.get(key, "").strip() for key in required):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"This reviewer role requires assigned {', '.join(required)} scope.")


def _public_user(identity: str, account: dict, managed: bool) -> dict:
    return {
        "identity": identity,
        "id": str(account.get("id") or identity),
        "audience": account.get("audience"),
        "role": account.get("role"),
        "district": account.get("district", ""),
        "mandal": account.get("mandal", ""),
        "village": account.get("village", ""),
        "is_active": account.get("is_active", True) is not False,
        "source": "managed" if managed else "provisioned / demo (read-only)",
    }


def _ensure_active_admin_remains(identity: str, current: dict, updated: dict) -> None:
    was_admin = current.get("audience") == "officer" and current.get("role") == ADMIN_ROLE and current.get("is_active", True) is not False
    remains_admin = updated.get("audience") == "officer" and updated.get("role") == ADMIN_ROLE and updated.get("is_active", True) is not False
    if not was_admin or remains_admin:
        return
    active_admins = [
        key for key, account in authentication._load_accounts().items()
        if account.get("audience") == "officer" and account.get("role") == ADMIN_ROLE and account.get("is_active", True) is not False
    ]
    if len(active_admins) <= 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot deactivate or demote the last active System Administrator.")


@router.get("/")
def admin_status(user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    return {"status": "ready", "role": user["role"], "storage_configured": ADMIN_DATA_ROOT.exists()}


@router.get("/roles")
def list_roles(_user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict[str, list[str]]:
    catalog = _role_catalog()
    return {audience: sorted(roles) for audience, roles in catalog.items()}


@router.get("/users")
def list_users(_user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    managed = read_managed_accounts()
    all_accounts = authentication._load_accounts()
    users = [_public_user(identity, account, identity in managed) for identity, account in all_accounts.items()]
    return {"users": sorted(users, key=lambda item: (item["audience"] or "", item["role"] or "", item["identity"]))}


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(payload: ManagedUserCreate, user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    identity = payload.identity.strip().casefold()
    _validate_role(payload.audience, payload.role)
    if payload.audience == "officer" and len(payload.password) < 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Officer passwords must contain at least 12 characters.")
    managed = read_managed_accounts()
    configured = authentication._load_accounts()
    if identity in configured:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this identity.")

    account = {
        "id": uuid4().hex,
        "audience": payload.audience,
        "role": payload.role,
        "is_active": True,
        "district": payload.district.strip(),
        "mandal": payload.mandal.strip(),
        "village": payload.village.strip(),
    }
    if payload.audience == "officer":
        account["password_hash"] = authentication.hash_password(payload.password)
    else:
        account["contact"] = identity
    _validate_review_scope(payload.role, account)
    managed[identity] = account
    write_managed_accounts(managed)
    record_audit_event(user, "user_created", identity, {"audience": payload.audience, "role": payload.role})
    return {"user": _public_user(identity, account, True)}


@router.patch("/users/{identity}")
def update_user(identity: str, payload: ManagedUserUpdate, user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    identity = identity.strip().casefold()
    managed = read_managed_accounts()
    account = managed.get(identity)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Only administrator-managed accounts can be changed here.")
    updated = dict(account)
    for key in payload.model_fields_set:
        value = getattr(payload, key)
        if value is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Configuration fields cannot be null.")
        updated[key] = value.strip() if isinstance(value, str) else value
    if "role" in payload.model_fields_set:
        _validate_role(str(updated["audience"]), updated["role"])
    _validate_review_scope(str(updated["role"]), updated)
    _ensure_active_admin_remains(identity, account, updated)
    managed[identity] = updated
    write_managed_accounts(managed)
    authentication.revoke_account_sessions(str(account.get("id", identity)))
    record_audit_event(user, "user_updated", identity, {"role": updated.get("role"), "is_active": updated.get("is_active", True)})
    return {"user": _public_user(identity, updated, True)}


@router.post("/users/{identity}/reset-password")
def reset_user_password(identity: str, payload: PasswordReset, user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    identity = identity.strip().casefold()
    managed = read_managed_accounts()
    account = managed.get(identity)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Only administrator-managed accounts can be reset here.")
    if account.get("audience") != "officer":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Citizen accounts use OTP sign-in and do not have passwords.")
    account["password_hash"] = authentication.hash_password(payload.password)
    managed[identity] = account
    write_managed_accounts(managed)
    authentication.revoke_account_sessions(str(account.get("id", identity)))
    record_audit_event(user, "password_reset", identity)
    return {"status": "password_reset"}


@router.get("/config")
def read_configuration(_user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    return {"config": get_runtime_config()}


@router.patch("/config")
def patch_configuration(payload: RuntimeConfigPatch, user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    changes = {key: getattr(payload, key) for key in payload.model_fields_set}
    if any(value is None for value in changes.values()):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Configuration values cannot be null.")
    try:
        config = update_runtime_config(changes)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    record_audit_event(user, "runtime_config_updated", "runtime-config", {"changed_keys": sorted(changes)})
    return {"config": config}


@router.get("/audit")
def get_audit(
    _user: Annotated[dict[str, str], Depends(_authenticated_admin)],
    limit: int = Query(default=100, ge=1, le=500),
) -> dict:
    return {"events": list_audit_events(limit), "integrity_valid": audit_integrity()}


@router.get("/backups")
def get_backups(_user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    return {"backups": list_backups(), "encryption_configured": len(os.getenv("BHUSHA_BACKUP_KEY", "")) >= 32}


@router.post("/backups", status_code=status.HTTP_201_CREATED)
def post_backup(user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    try:
        backup = create_backup()
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    record_audit_event(user, "backup_created", backup["id"], {"size_bytes": backup["size_bytes"]})
    return {"backup": backup}


@router.get("/backups/{backup_id}/download")
def download_backup(backup_id: str, user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> FileResponse:
    try:
        path = get_backup_path(backup_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    record_audit_event(user, "backup_downloaded", backup_id)
    return FileResponse(path, media_type="application/octet-stream", filename=path.name)


@router.post("/backups/{backup_id}/restore")
def post_restore(backup_id: str, user: Annotated[dict[str, str], Depends(_authenticated_admin)]) -> dict:
    try:
        restored = restore_backup(backup_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    authentication._sessions.clear()
    authentication._otp_challenges.clear()
    record_audit_event(user, "backup_restored", backup_id)
    return {"backup": restored, "sessions_revoked": True}