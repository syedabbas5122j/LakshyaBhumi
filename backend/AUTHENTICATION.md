# Authentication Setup

The API accepts provisioned identities only and does not accept arbitrary credentials. The explicitly gated demo fixture is for local demonstrations only.

## Role demo accounts

`app/core/demo_accounts.json` contains a unique demo identity for each of the 34 landing-page roles. Enable the fixture only on a local demo server:

```powershell
$env:BHUSHA_AUTH_DEMO = "true"
$env:BHUSHA_AUTH_DEV_OTP = "true"
```

With both flags enabled, the development login page's **Fill demo access** action fills the selected role's account. Officer accounts are then submitted with their demo username and password. Citizen accounts fill a test contact; request its OTP and enter the development code shown by the page. `GET /api/v1/auth/demo-access?role=...` returns only the selected role's credentials and responds with 404 when demo mode is off.

Do not enable either flag in a deployed environment. The credentials in the fixture are public demo credentials, not real user accounts.

## Officer accounts

Generate a password hash from the backend directory; the password is read through a prompt and is not part of the command line:

```powershell
..\.venv\Scripts\python.exe -m app.core.authentication
```

Set `BHUSHA_AUTH_USERS` to a JSON object keyed by login identifier. Officer records require a PBKDF2 hash and an exact role:

```json
{
  "employee-42": {
    "audience": "officer",
    "role": "Village Surveyor",
    "district": "Tirupati District",
    "mandal": "Tirupati Urban",
    "village": "Tirupati Urban",
    "password_hash": "pbkdf2_sha256$310000$...$..."
  },
  "owner@example.com": {
    "audience": "citizen",
    "role": "Land Owner"
  }
}
```

The role must match the role selected in the portal. Citizen accounts are bound to a registered contact and role; the citizen login does not use a password.

Officer accounts may include `district`, `mandal`, and `village` to define their review jurisdiction. Village reviewers need all three values; mandal reviewers need district and mandal; district reviewers need district. Submitted cases carry all three scope values and route village → mandal → district. Configure these fields for provisioned reviewer accounts; the local demo accounts include a Tirupati example scope.

Reviewers claim a case before forwarding it, requesting field rework, or recording the district decision. Each handoff, claim, release, comment, rework request, resubmission, approval, and rejection is stored in the case correspondence history. Submitters retain access to their own case; reviewers can follow cases in their jurisdiction through later stages and after closure.

## Local OTP testing

Real SMS/email delivery is not configured in this repository. For local development only, set `BHUSHA_AUTH_DEV_OTP=true`. The OTP request response then includes `debug_code`, which the frontend displays. Do not enable this setting in a deployed environment.

Run the API from this directory after setting account variables:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

The Vite development server proxies `/api/v1` requests to port 8001. In production, configure a delivery provider before enabling citizen OTP sign-in. Without it, the OTP request endpoint returns HTTP 503 rather than claiming a code was sent.

Sessions are random bearer tokens held in process memory for eight hours. This is suitable for the current single-process scaffold, not multi-worker or production deployment; use a persistent session store and transport security before deployment.
