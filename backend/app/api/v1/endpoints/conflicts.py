from fastapi import APIRouter

router = APIRouter(prefix="/conflicts", tags=["conflicts"])


@router.get("/")
def list_conflicts() -> dict:
    return {"conflicts": []}
