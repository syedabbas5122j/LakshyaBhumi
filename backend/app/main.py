from fastapi import FastAPI

from app.api.v1.router import router as v1_router

app = FastAPI(title="Bhusha Land Intelligence Platform")
app.include_router(v1_router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "bhusha"}
