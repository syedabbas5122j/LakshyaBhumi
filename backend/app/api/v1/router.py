from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, engine, export, ground_truth, ingestion, integrations, support

router = APIRouter(prefix="/api/v1")
router.include_router(admin.router)
router.include_router(auth.router)
router.include_router(support.router)
router.include_router(engine.router)
router.include_router(export.router)
router.include_router(ground_truth.router)
router.include_router(ingestion.router)
router.include_router(integrations.router)
