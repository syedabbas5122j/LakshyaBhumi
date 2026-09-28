from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.core.authentication import get_session
from app.engine.pipeline import run_pipeline
from app.engine.schemas import GeoFeature, HarmonizationRequest, SourcePriority
from app.services.harmonization_service import get_harmonization_file, list_harmonization_runs, persist_harmonization_run
from app.services.upload_service import read_upload

router = APIRouter(prefix="/engine", tags=["engine"])
bearer_scheme = HTTPBearer(auto_error=False)

HARMONIZATION_ROLES = {
    "District Survey Officer",
    "District Land Records Officer",
    "Commissioner of Land Administration",
    "Director of Survey & Land Records",
    "State GIS Coordinator",
    "Chief Cartographer",
    "GIS Manager (Municipality)",
}


class HarmonizationRunRequest(BaseModel):
    source_upload_id: str | None = Field(default=None, min_length=1, max_length=80)
    target_upload_id: str | None = Field(default=None, min_length=1, max_length=80)
    target_crs: str = Field(default="EPSG:4326", min_length=1, max_length=40)


def _authorized_user(credentials: HTTPAuthorizationCredentials | None) -> dict[str, str]:
    user = get_session(credentials.credentials) if credentials else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    if user.get("role") not in HARMONIZATION_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your role cannot start harmonization runs.")
    return user


def _features_from_geojson(payload: dict[str, Any], dataset_id: str, source: SourcePriority) -> list[GeoFeature]:
    features: list[GeoFeature] = []
    for index, feature in enumerate(payload.get("features", [])):
        geometry = feature.get("geometry")
        if not geometry:
            continue
        features.append(GeoFeature(
            id=str(feature.get("id") or feature.get("properties", {}).get("id") or f"{dataset_id}-{index + 1}"),
            dataset_id=dataset_id,
            source=source,
            geometry=geometry,
            properties=feature.get("properties") or {},
        ))
    if not features:
        raise ValueError(f"Dataset {dataset_id} contains no features with geometry.")
    return features


def _demo_dataset(dataset_id: str, name: str, offset: float) -> tuple[dict[str, str], dict[str, Any]]:
    return (
        {"id": dataset_id, "dataset_name": name},
        {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "id": f"{dataset_id}-parcel-101", "properties": {"survey_number": "101", "owner_name": "Demo record", "land_use": "Agricultural"}, "geometry": {"type": "Polygon", "coordinates": [[[79.42 + offset, 13.67], [79.43 + offset, 13.67], [79.43 + offset, 13.68], [79.42 + offset, 13.68], [79.42 + offset, 13.67]]]}},
                {"type": "Feature", "id": f"{dataset_id}-parcel-102", "properties": {"survey_number": "102", "owner_name": "Demo record", "land_use": "Residential"}, "geometry": {"type": "Polygon", "coordinates": [[[79.43 + offset, 13.67], [79.44 + offset, 13.67], [79.44 + offset, 13.68], [79.43 + offset, 13.68], [79.43 + offset, 13.67]]]}},
            ],
        },
    )


@router.get("/health")
def engine_health() -> dict:
    return {"status": "ok", "engine": "ready"}


@router.post("/harmonize")
def harmonize_datasets(
    request: HarmonizationRunRequest,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    user = _authorized_user(credentials)
    if bool(request.source_upload_id) != bool(request.target_upload_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose both a source and target dataset, or use demo data.")
    if request.source_upload_id == request.target_upload_id and request.source_upload_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose two different datasets.")

    try:
        if request.source_upload_id and request.target_upload_id:
            source_record, source_payload = read_upload(request.source_upload_id, ["ward", "village", "town", "city", "mandal", "district"])
            target_record, target_payload = read_upload(request.target_upload_id, ["ward", "village", "town", "city", "mandal", "district"])
        else:
            source_record, source_payload = _demo_dataset("DEMO-CADASTRAL", "Demo cadastral database", 0.0)
            target_record, target_payload = _demo_dataset("DEMO-DRONE", "Demo drone database", 0.0008)
        source_features = _features_from_geojson(source_payload, source_record["id"], SourcePriority.CADASTRAL)
        target_features = _features_from_geojson(target_payload, target_record["id"], SourcePriority.DRONE_ORI)
        result = run_pipeline(HarmonizationRequest(
            source_features=source_features,
            target_features=target_features,
            target_crs=request.target_crs,
        ))
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

    run_id = f"live-{source_record['id']}-{target_record['id']}-{uuid4().hex[:8]}"
    stored_files = persist_harmonization_run(
        run_id,
        source_record,
        target_record,
        user,
        request.target_crs,
        result,
    )

    return {
        "run_id": run_id,
        "started_by": user.get("role"),
        "source": {"id": source_record["id"], "name": source_record["dataset_name"], "features": len(source_features)},
        "target": {"id": target_record["id"], "name": target_record["dataset_name"], "features": len(target_features)},
        "steps": [
            {"key": "georeferencing", "label": "Geo-referencing", "status": "completed", "detail": f"{result.transform.features_transformed} features normalised to {request.target_crs}"},
            {"key": "matching", "label": "Spatial matching", "status": "completed", "detail": f"{result.matching.matched} matched pairs from {result.matching.candidate_pairs} candidates"},
            {"key": "topology", "label": "Topology correction", "status": "completed", "detail": f"{len(result.topology.fixes_applied)} fixes applied"},
            {"key": "attributes", "label": "Attribute mapping", "status": "completed", "detail": f"{len(result.attributes.mappings)} field mappings reviewed"},
            {"key": "conflicts", "label": "Conflict resolution", "status": "completed", "detail": f"{result.conflicts.total_conflicts} conflicts detected, {result.conflicts.auto_resolved} auto-resolved", "metrics": {"Conflicts detected": result.conflicts.total_conflicts, "Human verification": result.conflicts.pending_review + result.conflicts.escalated, "Auto-resolved": result.conflicts.auto_resolved}},
            {"key": "confidence", "label": "Confidence scoring", "status": "completed", "detail": f"{result.confidence.mean_confidence:.0%} mean confidence"},
            {"key": "changes", "label": "Change detection", "status": "completed", "detail": f"{result.changes.modified} modified, {result.changes.added} added, {result.changes.removed} removed", "metrics": {"Changes detected": result.changes.modified + result.changes.added + result.changes.removed, "Modified": result.changes.modified, "Human verification": result.changes.modified + result.changes.added}},
        ],
        "output": {
            "features": len(result.harmonized_features),
            "confidence": round(result.confidence.mean_confidence * 100),
            "uncertainty_meters": round(sum((score.positional_error_m or 0) for score in result.confidence.scores) / max(len(result.confidence.scores), 1), 2),
            "lineage_entries": len(result.lineage),
            "geojson": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": feature.id,
                        "geometry": feature.geometry.model_dump(mode="json"),
                        "properties": feature.properties,
                    }
                    for feature in result.harmonized_features
                ],
            },
            "report": {
                "run_id": run_id,
                "source_dataset": source_record["dataset_name"],
                "target_dataset": target_record["dataset_name"],
                "target_crs": request.target_crs,
                "steps": [
                    {"key": "georeferencing", "label": "Geo-referencing", "features_transformed": result.transform.features_transformed},
                    {"key": "matching", "label": "Spatial matching", "matched": result.matching.matched, "candidates": result.matching.candidate_pairs},
                    {"key": "topology", "label": "Topology correction", "fixes_applied": len(result.topology.fixes_applied)},
                    {"key": "attributes", "label": "Attribute mapping", "mappings": len(result.attributes.mappings)},
                    {"key": "conflicts", "label": "Conflict resolution", "total": result.conflicts.total_conflicts, "auto_resolved": result.conflicts.auto_resolved},
                    {"key": "confidence", "label": "Confidence scoring", "mean_confidence": result.confidence.mean_confidence},
                    {"key": "changes", "label": "Change detection", "modified": result.changes.modified, "added": result.changes.added, "removed": result.changes.removed},
                ],
            },
        },
        "stored_files": stored_files,
    }


@router.get("/runs")
def get_harmonization_runs(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    _authorized_user(credentials)
    return {"runs": list_harmonization_runs()}


@router.get("/runs/{run_id}/{kind}")
def download_harmonization_file(
    run_id: str,
    kind: str,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> FileResponse:
    _authorized_user(credentials)
    try:
        record, path = get_harmonization_file(run_id, kind)
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    media_type = "application/geo+json" if kind == "geojson" else "application/json"
    return FileResponse(path, media_type=media_type, filename=path.name, headers={"X-Harmonization-Run": record["run_id"]})


@router.post("/match")
def match_features() -> dict:
    return {"message": "Spatial matching endpoint ready"}


@router.post("/correct-topology")
def correct_topology() -> dict:
    return {"message": "Topology correction endpoint ready"}


@router.post("/score")
def score_features() -> dict:
    return {"message": "Confidence scoring endpoint ready"}
