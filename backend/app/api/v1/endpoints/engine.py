from fastapi import APIRouter

router = APIRouter(prefix="/engine", tags=["engine"])


@router.get("/health")
def engine_health() -> dict:
    return {"status": "ok", "engine": "ready"}


@router.post("/match")
def match_features() -> dict:
    return {"message": "Spatial matching endpoint ready"}


@router.post("/correct-topology")
def correct_topology() -> dict:
    return {"message": "Topology correction endpoint ready"}


@router.post("/score")
def score_features() -> dict:
    return {"message": "Confidence scoring endpoint ready"}
