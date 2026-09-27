import json
import time

import app.core.authentication as authentication


def _set_accounts(monkeypatch, accounts):
    monkeypatch.setenv("BHUSHA_AUTH_USERS", json.dumps(accounts))


def setup_function():
    authentication._otp_challenges.clear()
    authentication._sessions.clear()


def test_officer_login_checks_password_and_role(monkeypatch):
    password_hash = authentication.hash_password("correct horse battery staple")
    _set_accounts(monkeypatch, {
        "employee-42": {
            "audience": "officer",
            "role": "Village Surveyor",
            "password_hash": password_hash,
        },
    })

    assert authentication.authenticate_officer("EMPLOYEE-42", "wrong password", "Village Surveyor") is None
    assert authentication.authenticate_officer("employee-42", "correct horse battery staple", "Tahsildar") is None

    session = authentication.authenticate_officer("employee-42", "correct horse battery staple", "Village Surveyor")
    assert session is not None
    assert authentication.get_session(session["access_token"]) == {
        "id": "employee-42",
        "audience": "officer",
        "role": "Village Surveyor",
    }


def test_citizen_otp_is_single_use_and_role_bound(monkeypatch):
    _set_accounts(monkeypatch, {
        "owner@example.com": {"audience": "citizen", "role": "Land Owner"},
    })
    monkeypatch.setenv("BHUSHA_AUTH_DEV_OTP", "true")
    code = authentication.request_citizen_otp("Owner@Example.com")

    assert code is not None
    assert authentication.authenticate_citizen_otp("owner@example.com", code, "Property Lawyer") is None
    session = authentication.authenticate_citizen_otp("owner@example.com", code, "Land Owner")

    assert session is not None
    assert authentication.authenticate_citizen_otp("owner@example.com", code, "Land Owner") is None


def test_expired_otp_is_rejected(monkeypatch):
    _set_accounts(monkeypatch, {
        "owner@example.com": {"audience": "citizen", "role": "Land Owner"},
    })
    digest = authentication.hmac.new(
        authentication._otp_hmac_key,
        b"123456",
        authentication.hashlib.sha256,
    ).hexdigest()
    authentication._otp_challenges["owner@example.com"] = (digest, time.time() - 1, 0, time.time())

    assert authentication.authenticate_citizen_otp("owner@example.com", "123456", "Land Owner") is None
    assert "owner@example.com" not in authentication._otp_challenges


def test_otp_attempt_limit_blocks_later_correct_code(monkeypatch):
    _set_accounts(monkeypatch, {
        "owner@example.com": {"audience": "citizen", "role": "Land Owner"},
    })
    monkeypatch.setenv("BHUSHA_AUTH_DEV_OTP", "true")
    code = authentication.request_citizen_otp("owner@example.com")
    assert code is not None
    wrong_code = "000000" if code != "000000" else "000001"

    for _ in range(authentication.OTP_MAX_ATTEMPTS):
        assert authentication.authenticate_citizen_otp("owner@example.com", wrong_code, "Land Owner") is None

    assert authentication.authenticate_citizen_otp("owner@example.com", code, "Land Owner") is None


def test_demo_access_is_disabled_by_default(monkeypatch):
    monkeypatch.delenv("BHUSHA_AUTH_DEMO", raising=False)
    assert authentication.get_demo_access("Village Surveyor") is None


def test_demo_fixture_authenticates_every_role(monkeypatch):
    monkeypatch.setenv("BHUSHA_AUTH_DEMO", "true")
    monkeypatch.setenv("BHUSHA_AUTH_DEV_OTP", "true")
    accounts = authentication._read_demo_accounts()

    assert len(accounts) == 34
    for account in accounts:
        demo_access = authentication.get_demo_access(account["role"])
        assert demo_access is not None
        if account["audience"] == "officer":
            session = authentication.authenticate_officer(
                demo_access["username"],
                demo_access["password"],
                account["role"],
            )
        else:
            code = authentication.request_citizen_otp(demo_access["contact"])
            assert code is not None
            session = authentication.authenticate_citizen_otp(demo_access["contact"], code, account["role"])
        assert session is not None


def test_demo_access_endpoint_is_gated(monkeypatch):
    import pytest
    from fastapi import HTTPException

    from app.api.v1.endpoints.auth import demo_access

    monkeypatch.delenv("BHUSHA_AUTH_DEMO", raising=False)
    with pytest.raises(HTTPException) as error:
        demo_access("Village Surveyor")
    assert error.value.status_code == 404

    monkeypatch.setenv("BHUSHA_AUTH_DEMO", "true")
    assert demo_access("Village Surveyor")["username"] == "demo.village-surveyor"
