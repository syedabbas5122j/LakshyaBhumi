from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.authentication import get_session
from app.engine.review_queue import create_ground_truth_request, list_ground_truth_requests

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


def get_authenticated_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, str]:
    user = get_session(credentials.credentials) if credentials else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user


@router.get("/")
def list_ground_truth(_user: Annotated[dict[str, str], Depends(get_authenticated_user)]) -> dict:
    return {"items": list_ground_truth_requests()}


@router.post("/requests", status_code=status.HTTP_201_CREATED)
def submit_ground_truth_request(
    payload: GroundTruthRequestBody,
    user: Annotated[dict[str, str], Depends(get_authenticated_user)],
) -> dict:
    request = create_ground_truth_request(
        payload.conflict_id,
        payload.geometry.model_dump(),
        payload.note,
        user,
    )
    return {"request": request}
