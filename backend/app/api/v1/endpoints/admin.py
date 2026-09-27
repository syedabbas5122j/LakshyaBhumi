from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/")
def admin_status() -> dict:
    return {"status": "admin-ready"}
