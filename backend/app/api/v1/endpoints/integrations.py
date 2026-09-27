from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.authentication import get_session
from app.services.integration_access_service import create_access_request, list_access_requests

router = APIRouter(prefix="/integrations", tags=["integrations"])
bearer_scheme = HTTPBearer(auto_error=False)


class AccessRequestBody(BaseModel):
    department: str = Field(min_length=2, max_length=160)
    method: str = Field(min_length=2, max_length=120)
    contact: str = Field(min_length=3, max_length=200)
    notes: str = Field(default="", max_length=2000)


def authenticated_user(credentials: HTTPAuthorizationCredentials | None) -> dict[str, str]:
    user = get_session(credentials.credentials) if credentials else None
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


@router.get("/access-requests")
def get_access_requests(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    user = authenticated_user(credentials)
    return {"requests": list_access_requests(user)}


@router.post("/access-requests", status_code=status.HTTP_201_CREATED)
def post_access_request(
    payload: AccessRequestBody,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    user = authenticated_user(credentials)
    return {"request": create_access_request(payload.department, payload.method, payload.contact, payload.notes, user)}
