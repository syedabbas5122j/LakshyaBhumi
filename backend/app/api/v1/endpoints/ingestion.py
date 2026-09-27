from fastapi import APIRouter

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.post("/upload")
def upload_dataset() -> dict:
    return {"message": "Dataset ingestion endpoint ready"}
