"""Environment-configured authentication primitives for the API."""

import hashlib
import hmac
import json
import os
import secrets
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

PASSWORD_ITERATIONS = 310_000
SESSION_TTL_SECONDS = 8 * 60 * 60
OTP_TTL_SECONDS = 5 * 60
OTP_RESEND_SECONDS = 30
OTP_MAX_ATTEMPTS = 5

_otp_hmac_key = secrets.token_bytes(32)
_otp_challenges: dict[str, tuple[str, float, int, float]] = {}
_sessions: dict[str, tuple[dict[str, str], float]] = {}
_demo_accounts_path = Path(__file__).with_name("demo_accounts.json")


class AuthenticationNotConfiguredError(RuntimeError):
    """Raised when a required identity or delivery provider is not configured."""


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PASSWORD_ITERATIONS,
        _encode_bytes(salt),
        _encode_bytes(digest),
    )


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = encoded_hash.split("$", 3)
        iterations = int(iterations_text)
        if algorithm != "pbkdf2_sha256" or not 100_000 <= iterations <= 1_000_000:
            return False
        salt = _decode_bytes(salt_text)
        expected = _decode_bytes(digest_text)
    except (AttributeError, ValueError):
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)


def _encode_bytes(value: bytes) -> str:
    import base64

    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode_bytes(value: str) -> bytes:
    import base64

    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def demo_mode_enabled() -> bool:
    return os.getenv("BHUSHA_AUTH_DEMO", "").strip().lower() in {"1", "true", "yes"}


@lru_cache(maxsize=1)
def _read_demo_accounts() -> tuple[dict[str, str], ...]:
    try:
        payload = json.loads(_demo_accounts_path.read_text(encoding="utf-8"))
        accounts = payload["accounts"]
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as error:
        raise AuthenticationNotConfiguredError("The demo account file is unavailable or invalid.") from error

    if not isinstance(accounts, list) or not all(isinstance(account, dict) for account in accounts):
        raise AuthenticationNotConfiguredError("The demo account file must contain an accounts list.")
    return tuple(accounts)


@lru_cache(maxsize=64)
def _demo_password_hash(username: str, password: str) -> str:
    salt = hashlib.sha256(f"bhusha-demo:{username}".encode("utf-8")).digest()[:16]
    return hash_password(password, salt)


def get_demo_access(role: str) -> dict[str, str] | None:
    if not demo_mode_enabled():
        return None

    for account in _read_demo_accounts():
        if account.get("role") != role:
            continue
        if account.get("audience") == "officer":
            return {
                "audience": "officer",
                "role": role,
                "username": account["username"],
                "password": account["password"],
            }
        if account.get("audience") == "citizen":
            return {"audience": "citizen", "role": role, "contact": account["contact"]}
    return None


def _load_accounts() -> dict[str, dict[str, Any]]:
    raw_accounts = os.getenv("BHUSHA_AUTH_USERS", "{}")
    try:
        parsed = json.loads(raw_accounts)
    except json.JSONDecodeError as error:
        raise AuthenticationNotConfiguredError("BHUSHA_AUTH_USERS must contain valid JSON.") from error

    if not isinstance(parsed, dict):
        raise AuthenticationNotConfiguredError("BHUSHA_AUTH_USERS must be a JSON object.")

    configured = {
        str(identity).strip().casefold(): account
        for identity, account in parsed.items()
        if isinstance(account, dict)
    }
    if demo_mode_enabled():
        for demo_account in _read_demo_accounts():
            identity = str(demo_account.get("username") or demo_account.get("contact") or "").strip().casefold()
            if not identity:
                continue
            account = dict(demo_account)
            if account.get("audience") == "officer":
                account["password_hash"] = _demo_password_hash(account["username"], account["password"])
            configured.setdefault(identity, account)
    return configured


def _principal(identity: str, account: dict[str, Any]) -> dict[str, str]:
    principal = {
        "id": str(account.get("id") or identity),
        "audience": str(account["audience"]),
        "role": str(account["role"]),
    }
    for key in ("district", "mandal", "village"):
        value = account.get(key)
        if isinstance(value, str) and value.strip():
            principal[key] = value.strip()
    return principal


def _issue_session(identity: str, account: dict[str, Any]) -> dict[str, Any]:
    now = time.time()
    for token, (_, expires_at) in list(_sessions.items()):
        if expires_at <= now:
            del _sessions[token]

    token = secrets.token_urlsafe(32)
    user = _principal(identity, account)
    _sessions[token] = (user, now + SESSION_TTL_SECONDS)
    return {"access_token": token, "token_type": "bearer", "expires_in": SESSION_TTL_SECONDS, "user": user}


def authenticate_officer(username: str, password: str, role: str) -> dict[str, Any] | None:
    identity = username.strip().casefold()
    account = _load_accounts().get(identity)
    if not account or account.get("audience") != "officer":
        return None

    password_hash = account.get("password_hash")
    if not isinstance(password_hash, str) or not verify_password(password, password_hash):
        return None
    if not hmac.compare_digest(str(account.get("role", "")), role):
        return None

    return _issue_session(identity, account)


def request_citizen_otp(contact: str) -> str | None:
    if os.getenv("BHUSHA_AUTH_DEV_OTP", "").strip().lower() not in {"1", "true", "yes"}:
        raise AuthenticationNotConfiguredError("OTP delivery is not configured. Enable a delivery provider before use.")

    identity = contact.strip().casefold()
    account = _load_accounts().get(identity)
    if not account or account.get("audience") != "citizen":
        return None

    now = time.time()
    previous = _otp_challenges.get(identity)
    if previous and now - previous[3] < OTP_RESEND_SECONDS:
        raise ValueError("An OTP was sent recently. Wait before requesting another.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    digest = hmac.new(_otp_hmac_key, code.encode("ascii"), hashlib.sha256).hexdigest()
    _otp_challenges[identity] = (digest, now + OTP_TTL_SECONDS, 0, now)
    return code


def authenticate_citizen_otp(contact: str, code: str, role: str) -> dict[str, Any] | None:
    identity = contact.strip().casefold()
    account = _load_accounts().get(identity)
    challenge = _otp_challenges.get(identity)
    if not account or account.get("audience") != "citizen" or account.get("role") != role or not challenge:
        return None

    digest, expires_at, attempts, created_at = challenge
    if time.time() >= expires_at or attempts >= OTP_MAX_ATTEMPTS:
        _otp_challenges.pop(identity, None)
        return None

    actual_digest = hmac.new(_otp_hmac_key, code.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(actual_digest, digest):
        _otp_challenges[identity] = (digest, expires_at, attempts + 1, created_at)
        return None

    _otp_challenges.pop(identity, None)
    return _issue_session(identity, account)


def get_session(token: str) -> dict[str, str] | None:
    session = _sessions.get(token)
    if not session:
        return None

    user, expires_at = session
    if time.time() >= expires_at:
        _sessions.pop(token, None)
        return None
    return user


def revoke_session(token: str) -> None:
    _sessions.pop(token, None)


if __name__ == "__main__":
    from getpass import getpass

    print(hash_password(getpass("Password to hash: ")))
