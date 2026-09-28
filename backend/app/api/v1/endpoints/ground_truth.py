from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator, model_validator

from app.core import authentication
from app.core.authentication import get_session
from app.services.field_submission_service import FIELD_WORKER_ROLES, create_submission, field_worker_can_access_scope, list_submissions, review_submission

router = APIRouter(prefix="/ground-truth", tags=["ground-truth"])
bearer_scheme = HTTPBearer(auto_error=False)


class PolygonGeometry(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[tuple[float, float]]]

    @field_validator("coordinates")
    @classmethod
    def validate_rings(cls, rings: list[list[tuple[float, float]]]) -> list[list[tuple[float, float]]]:
        if not rings:
            raise ValueError("Polygon must contain an outer ring.")
        for ring in rings:
            if len(ring) < 4 or ring[0] != ring[-1]:
                raise ValueError("Each polygon ring must have at least four points and be closed.")
            if any(not (-180 <= longitude <= 180 and -90 <= latitude <= 90) for longitude, latitude in ring):
                raise ValueError("Polygon coordinates must be valid longitude/latitude values.")
        return rings


class GroundTruthRequestBody(BaseModel):
    conflict_id: str = Field(min_length=1, max_length=80)
    geometry: PolygonGeometry
    note: str = Field(min_length=1, max_length=2000)
    district: str = Field(default="", max_length=160)
    mandal: str = Field(default="", max_length=160)
    village: str = Field(default="", max_length=160)
    area_name: str = Field(default="", max_length=160)


class FieldSubmissionBody(BaseModel):
    type: Literal["Survey", "Claim", "Objection"]
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=2, max_length=4000)
    area_name: str = Field(min_length=2, max_length=160)
    attachment_name: str = Field(default="", max_length=240)
    district: str = Field(default="", max_length=160)
    mandal: str = Field(default="", max_length=160)
    village: str = Field(default="", max_length=160)


class SubmissionReviewBody(BaseModel):
    action: Literal["claim", "release", "comment", "forward", "request_rework", "resubmit", "approve", "reject", "assign_field", "release_field", "field_start", "field_submit"]
    note: str = Field(default="", max_length=2000)
    assignee_id: str = Field(default="", max_length=200)


def get_authenticated_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, str]:
    user = get_session(credentials.credentials) if credentials else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user


@router.get("/")
def list_ground_truth(user: Annotated[dict[str, str], Depends(get_authenticated_user)]) -> dict:
    return {"items": [item for item in list_submissions(user) if item.get("conflict_id")]}


@router.post("/requests", status_code=status.HTTP_201_CREATED)
def submit_ground_truth_request(
    payload: GroundTruthRequestBody,
    user: Annotated[dict[str, str], Depends(get_authenticated_user)],
) -> dict:
    try:
        request = create_submission(
            "Boundary correction",
            f"Boundary correction for {payload.conflict_id}",
            payload.note.strip(),
            payload.area_name.strip() or payload.conflict_id,
            user,
            district=payload.district,
            mandal=payload.mandal,
            village=payload.village,
            submission_type_label="Ground-truth boundary correction",
            geometry=payload.geometry.model_dump(),
            conflict_id=payload.conflict_id,
        )
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)) from error
    return {"request": request}


@router.get("/submissions")
def get_field_submissions(user: Annotated[dict[str, str], Depends(get_authenticated_user)]) -> dict:
    return {"submissions": list_submissions(user)}


@router.get("/field-workers")
def get_field_workers(user: Annotated[dict[str, str], Depends(get_authenticated_user)]) -> dict:
    from app.services.field_submission_service import REVIEW_ROLE_STAGE

    if REVIEW_ROLE_STAGE.get(user.get("role", "")) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewer access is required to list field workers.")
    workers = []
    for identity, account in authentication._load_accounts().items():
        if account.get("audience") != "officer" or account.get("role") not in FIELD_WORKER_ROLES or account.get("is_active", True) is False:
            continue
        worker = {"id": str(account.get("id") or identity), "audience": "officer", "role": str(account.get("role"))}
        worker.update({key: str(account[key]).strip() for key in ("district", "mandal", "village") if account.get(key)})
        if field_worker_can_access_scope(worker, user):
            workers.append(worker)
    return {"workers": workers}


@router.post("/submissions", status_code=status.HTTP_201_CREATED)
def submit_field_submission(
    payload: FieldSubmissionBody,
    user: Annotated[dict[str, str], Depends(get_authenticated_user)],
) -> dict:
    try:
        submission = create_submission(
            payload.type,
            payload.title.strip(),
            payload.description.strip(),
            payload.area_name.strip(),
            user,
            payload.attachment_name.strip(),
            district=payload.district,
            mandal=payload.mandal,
            village=payload.village,
        )
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)) from error
    return {"submission": submission}


@router.post("/submissions/{submission_id}/review")
def update_submission_review(
    submission_id: str,
    payload: SubmissionReviewBody,
    user: Annotated[dict[str, str], Depends(get_authenticated_user)],
) -> dict:
    field_assignee = None
    if payload.action == "assign_field":
        if not payload.assignee_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Choose a field worker.")
        for identity, account in authentication._load_accounts().items():
            candidate_id = str(account.get("id") or identity)
            if candidate_id == payload.assignee_id:
                field_assignee = {"id": candidate_id, "audience": str(account.get("audience", "")), "role": str(account.get("role", ""))}
                field_assignee.update({key: str(account[key]).strip() for key in ("district", "mandal", "village") if account.get(key)})
                break
        if not field_assignee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field worker was not found.")
    try:
        submission = review_submission(submission_id, payload.action, payload.note, user, field_assignee)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    return {"submission": submission}
