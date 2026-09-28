# Backend Startup Troubleshooting

## Errors encountered

- `No module named uvicorn`: the virtual environment did not have the ASGI server installed.
- Installing the original requirements failed while building `pydantic-core==2.23.4`. Python 3.14 had no compatible wheel for that pinned version, so pip attempted a native build and failed with `link.exe not found` because the Visual C++ build tools were unavailable.
- After Uvicorn was installed, startup exposed missing `rapidfuzz`, `scipy`, and `python-multipart` packages. The first two are imported by the harmonization engine; multipart is required when FastAPI registers the upload route. The interrupted requirements install had not installed them.
- Port 8000 remained bound to a stale Uvicorn listener that Windows no longer exposed as a process, causing `WinError 10048`. FastAPI and the Vite `/api/v1` proxy now use port 8001.

## Changes and approach

- Updated the FastAPI and Pydantic pins in `requirements.txt` to `fastapi==0.141.1` and `pydantic==2.13.5`. These are the versions already present in the Python 3.14 environment where the API started successfully; the newer Pydantic core provides a compatible wheel instead of requiring a local native build.
- Installed Uvicorn, RapidFuzz, SciPy, scikit-learn, and python-multipart into the existing virtual environment. All are listed in `requirements.txt`.
- Kept the frontend and the Node data API running as separate processes: the frontend uses FastAPI for `/api/v1` and the Node server for `/api/overview` and related data endpoints.
- Added a persistent village → mandal → district review workflow for field submissions and boundary corrections, including scoped queues, claims, correspondence, rework, and final district decisions.

## Run in PowerShell

Start each service in its own terminal from the repository root.

```powershell
cd backend
& "..\.venv\Scripts\python.exe" -m pip install -r requirements.txt
$env:BHUSHA_AUTH_DEMO = "true"
$env:BHUSHA_AUTH_DEV_OTP = "true"
& "..\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --app-dir . --host 127.0.0.1 --port 8001
```

These flags enable fixture accounts and display development OTPs. Use them only for local development, never in a deployed environment.

```powershell
cd frontend
npm run dev -- --host 127.0.0.1
```

```powershell
node backend/server.js
```

## Verified endpoints

- Frontend: `http://127.0.0.1:5174/` returned HTTP 200 after port 5173 was found unavailable.
- FastAPI: `http://127.0.0.1:8001/health` returned `{"status":"ok","service":"bhusha"}`.
- Node data API: `http://127.0.0.1:4000/api/overview` returned the overview data.