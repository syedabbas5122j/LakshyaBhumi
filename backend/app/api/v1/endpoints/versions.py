from fastapi import APIRouter

router = APIRouter(prefix="/versions", tags=["versions"])


@router.get("/")
def list_versions() -> dict:
    return {"versions": ["v1"]}
