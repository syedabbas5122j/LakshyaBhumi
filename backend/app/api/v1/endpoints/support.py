from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

from app.core.authentication import get_session
from app.core.runtime_configuration import get_runtime_config
from app.services.support_service import SUPPORT_OPERATORS, create_ticket, get_diagnostics, list_tickets, update_ticket

router = APIRouter(prefix="/support", tags=["support"])
bearer_scheme = HTTPBearer(auto_error=False)
TicketCategory = Literal["Account access", "Upload or sync", "System availability", "Other"]
TicketStatus = Literal["New", "In progress", "Resolved"]


class TicketCreate(BaseModel):
    category: TicketCategory
    summary: str = Field(min_length=10, max_length=500)

    @field_validator("summary")
    @classmethod
    def reject_sensitive_details(cls, value: str) -> str:
        import re

        patterns = (
            r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b",
            r"(?<!\w)\d{10,12}(?!\w)",
            r"-?\d{1,3}\.\d+\s*[,/]\s*-?\d{1,2}\.\d+",
            r"\b(?:password|passcode|otp|one-time code|access token)\s*[:=]\s*\S+",
            r"\b(?:parcel|survey|khata|case)\s*(?:no|number|id)\s*[:#=-]?\s*[\w/-]+",
        )
        if any(re.search(pattern, value, re.IGNORECASE) for pattern in patterns):
            raise ValueError("Remove contact details, credentials, coordinates, and parcel or case identifiers from the summary.")
        return value.strip()


class TicketUpdate(BaseModel):
    status: TicketStatus
    assigned_to: Literal["Help Desk Operator", "IT Support Staff"] | None = None


def _authenticated_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, str]:
    actor = get_session(credentials.credentials) if credentials else None
    if not actor:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return actor


def _support_operator(actor: dict[str, str]) -> None:
    if actor.get("audience") != "officer" or actor.get("role") not in SUPPORT_OPERATORS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Support operator access is required.")


@router.get("/tickets")
def get_tickets(user: Annotated[dict[str, str], Depends(_authenticated_user)]) -> dict:
    return {
        "tickets": list_tickets(user),
        "ticket_intake_enabled": get_runtime_config()["support_tickets_enabled"],
    }


@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def post_ticket(payload: TicketCreate, user: Annotated[dict[str, str], Depends(_authenticated_user)]) -> dict:
    if not get_runtime_config()["support_tickets_enabled"]:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Support tickets are temporarily disabled.")
    return {"ticket": create_ticket(payload.category, payload.summary, user)}


@router.patch("/tickets/{ticket_id}")
def patch_ticket(ticket_id: str, payload: TicketUpdate, user: Annotated[dict[str, str], Depends(_authenticated_user)]) -> dict:
    _support_operator(user)
    try:
        ticket = update_ticket(ticket_id, payload.status, payload.assigned_to, user)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    return {"ticket": ticket}


@router.get("/diagnostics")
def diagnostics(user: Annotated[dict[str, str], Depends(_authenticated_user)]) -> dict:
    _support_operator(user)
    if user.get("role") == "Help Desk Operator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operational diagnostics are limited to IT Support and System Administrators.")
    return get_diagnostics()