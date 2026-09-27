from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.authentication import (
    AuthenticationNotConfiguredError,
    authenticate_citizen_otp,
    authenticate_officer,
    demo_mode_enabled,
    get_demo_access,
    get_session,
    request_citizen_otp,
    revoke_session,
)


router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


class OfficerLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1, max_length=256)
    role: str = Field(min_length=1, max_length=120)


class CitizenOtpRequest(BaseModel):
    contact: str = Field(min_length=3, max_length=254)
    role: str = Field(min_length=1, max_length=120)


class CitizenOtpVerifyRequest(CitizenOtpRequest):
    code: str = Field(pattern=r"^[0-9]{6}$")


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/officer/login")
def officer_login(payload: OfficerLoginRequest) -> dict:
    try:
        session = authenticate_officer(payload.username, payload.password, payload.role)
    except AuthenticationNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error

    if not session:
        raise _unauthorized()
    return session


@router.post("/citizen/otp/request", status_code=status.HTTP_202_ACCEPTED)
def citizen_otp_request(payload: CitizenOtpRequest) -> dict:
    try:
        code = request_citizen_otp(payload.contact)
    except AuthenticationNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(error)) from error

    response = {"message": "If the account is registered, an OTP will be sent."}
    if code:
        response["debug_code"] = code
    return response


@router.post("/citizen/otp/verify")
def citizen_otp_verify(payload: CitizenOtpVerifyRequest) -> dict:
    session = authenticate_citizen_otp(payload.contact, payload.code, payload.role)
    if not session:
        raise _unauthorized()
    return session


@router.get("/demo-access")
def demo_access(role: str = Query(min_length=1, max_length=120)) -> dict:
    if not demo_mode_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo access is disabled.")
    access = get_demo_access(role)
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No demo account exists for this role.")
    return access


@router.get("/me")
def get_me(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    if not credentials:
        raise _unauthorized()
    user = get_session(credentials.credentials)
    if not user:
        raise _unauthorized()
    return {"user": user}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> None:
    if not credentials or not get_session(credentials.credentials):
        raise _unauthorized()
    revoke_session(credentials.credentials)
