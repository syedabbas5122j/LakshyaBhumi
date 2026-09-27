from fastapi import APIRouter

from app.api.v1.endpoints import engine, export, ingestion

router = APIRouter(prefix="/api/v1")
router.include_router(engine.router)
router.include_router(export.router)
router.include_router(ingestion.router)
