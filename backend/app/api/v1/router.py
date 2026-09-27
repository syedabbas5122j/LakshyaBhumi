from fastapi import APIRouter

from app.api.v1.endpoints import auth, engine, export, ground_truth, ingestion

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(engine.router)
router.include_router(export.router)
router.include_router(ground_truth.router)
router.include_router(ingestion.router)
