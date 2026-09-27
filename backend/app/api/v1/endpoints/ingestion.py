from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.authentication import get_session
from app.services.upload_service import create_upload, list_uploads

router = APIRouter(prefix="/ingestion", tags=["ingestion"])
bearer_scheme = HTTPBearer(auto_error=False)
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
AREA_LEVELS = ("ward", "village", "town", "city", "mandal", "district")

ROLE_UPLOAD_SCOPES: dict[str, tuple[str, ...]] = {
    "Village Surveyor": ("ward", "village"),
    "Ground Truth Surveyor": ("ward", "village"),
    "Drone Pilot": ("ward", "village", "town", "city"),
    "GCP Marker": ("ward", "village"),
    "Field Data Collector": ("ward", "village"),
    "Village Revenue Officer (VRO)": ("ward", "village"),
    "Ward Secretary": ("ward",),
    "Patwari / Lekhpal": ("village",),
    "Village Administrative Officer": ("village",),
    "Mandal Revenue Officer (MRO)": ("ward", "village", "mandal"),
    "Tahsildar": ("ward", "village", "mandal"),
    "Survey Inspector": ("ward", "village", "mandal"),
    "Mandal Surveyor": ("ward", "village", "mandal"),
    "District Collector / District Magistrate": AREA_LEVELS,
    "District Survey Officer": AREA_LEVELS,
    "City Surveyor": ("ward", "town", "city"),
    "District Land Records Officer": AREA_LEVELS,
    "Municipal Commissioner": ("ward", "town", "city"),
    "Chief Town Planner": ("town", "city"),
    "GIS Manager (Municipality)": ("ward", "town", "city"),
    "Property Tax Officer": ("ward", "town", "city"),
    "Commissioner of Land Administration": AREA_LEVELS,
    "Director of Survey & Land Records": AREA_LEVELS,
    "State GIS Coordinator": AREA_LEVELS,
    "Chief Cartographer": AREA_LEVELS,
    "System Administrator": AREA_LEVELS,
    "Data Entry Operator": AREA_LEVELS,
}


def _authenticated_user(credentials: HTTPAuthorizationCredentials | None) -> dict[str, str]:
    user = get_session(credentials.credentials) if credentials else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user


@router.get("/upload-scopes")
def get_upload_scopes(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    user = _authenticated_user(credentials)
    scopes = list(ROLE_UPLOAD_SCOPES.get(user.get("role", ""), ()))
    return {"role": user.get("role"), "area_levels": scopes}


@router.get("/uploads")
def get_uploads(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    user = _authenticated_user(credentials)
    scopes = list(ROLE_UPLOAD_SCOPES.get(user.get("role", ""), ()))
    return {"uploads": list_uploads(scopes)}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    file: UploadFile = File(...),
    dataset_name: str = Form(min_length=2, max_length=120),
    area_level: str = Form(...),
    area_name: str = Form(min_length=1, max_length=160),
    parent_area: str = Form(default="", max_length=240),
    crs: str = Form(default="", max_length=120),
) -> dict:
    user = _authenticated_user(credentials)
    allowed_scopes = ROLE_UPLOAD_SCOPES.get(user.get("role", ""), ())
    if area_level not in allowed_scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your role cannot upload data at this administrative level.")

    filename = Path(file.filename or "").name
    if Path(filename).suffix.lower() not in {".geojson", ".json"}:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a .geojson or GeoJSON .json file.")

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="The upload exceeds the 25 MB limit.")

    try:
        record = create_upload(contents, filename, dataset_name.strip(), area_level, area_name.strip(), parent_area.strip(), crs.strip(), user)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except OSError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not store the uploaded file.") from error
    finally:
        await file.close()

    return {"upload": record}
