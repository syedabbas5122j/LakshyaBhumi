from fastapi import APIRouter

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/geojson")
def export_geojson() -> dict:
    return {"message": "GeoJSON export endpoint ready"}
