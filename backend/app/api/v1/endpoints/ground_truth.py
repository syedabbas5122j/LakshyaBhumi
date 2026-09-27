from fastapi import APIRouter

router = APIRouter(prefix="/ground-truth", tags=["ground-truth"])


@router.get("/")
def list_ground_truth() -> dict:
    return {"items": []}
