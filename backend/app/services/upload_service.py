"""Local GeoJSON upload storage and manifest for the platform scaffold."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.services.integration_sync_service import INTEGRATION_TARGETS, enqueue_upload

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploaded-data"
MANIFEST_PATH = UPLOAD_ROOT / "manifest.json"
ALLOWED_GEOMETRIES = {"Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"}


def validate_geojson(data: bytes) -> tuple[dict[str, Any], int]:
    try:
        payload = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("The uploaded file is not valid UTF-8 JSON.") from error

    if not isinstance(payload, dict) or payload.get("type") != "FeatureCollection":
        raise ValueError("Upload a GeoJSON FeatureCollection.")

    features = payload.get("features")
    if not isinstance(features, list):
        raise ValueError("GeoJSON features must be an array.")
    if not features:
        raise ValueError("GeoJSON must contain at least one feature.")

    for index, feature in enumerate(features):
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise ValueError(f"Feature {index + 1} is not a GeoJSON Feature.")
        geometry = feature.get("geometry")
        if geometry is not None:
            if not isinstance(geometry, dict) or geometry.get("type") not in ALLOWED_GEOMETRIES:
                raise ValueError(f"Feature {index + 1} has an unsupported geometry type.")
            if geometry.get("type") != "GeometryCollection" and not isinstance(geometry.get("coordinates"), list):
                raise ValueError(f"Feature {index + 1} has invalid coordinates.")
            if geometry.get("type") == "GeometryCollection" and not isinstance(geometry.get("geometries"), list):
                raise ValueError(f"Feature {index + 1} has invalid geometries.")
        properties = feature.get("properties")
        if properties is not None and not isinstance(properties, dict):
            raise ValueError(f"Feature {index + 1} properties must be an object or null.")

    return payload, len(features)


def _read_manifest() -> list[dict[str, Any]]:
    if not MANIFEST_PATH.exists():
        return []
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Upload manifest is unreadable; no upload was accepted.") from error
    if not isinstance(manifest, list):
        raise RuntimeError("Upload manifest has an invalid format.")
    return manifest


def create_upload(
    data: bytes,
    original_filename: str,
    dataset_name: str,
    area_level: str,
    area_name: str,
    parent_area: str,
    crs: str,
    user: dict[str, str],
) -> dict[str, Any]:
    extension = Path(original_filename).suffix.lower()
    if extension in {".tif", ".tiff"}:
        feature_count = 0
        dataset_format = "COG/GeoTIFF raster"
    else:
        _, feature_count = validate_geojson(data)
        dataset_format = "GeoJSON vector"
    upload_id = f"UP-{uuid4().hex[:12].upper()}"
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{upload_id.lower()}{extension or '.geojson'}"
    stored_path = UPLOAD_ROOT / stored_filename
    stored_path.write_bytes(data)

    record = {
        "id": upload_id,
        "dataset_name": dataset_name,
        "original_filename": Path(original_filename).name,
        "stored_filename": stored_filename,
        "size_bytes": len(data),
        "feature_count": feature_count,
        "format": dataset_format,
        "area_level": area_level,
        "area_name": area_name,
        "parent_area": parent_area,
        "crs": crs or "Unspecified",
        "status": "Received - validation pending",
        "submitted_by": user.get("id", "unknown"),
        "submitted_role": user.get("role", "unknown"),
        "sync_status": "Queued - connector approval pending",
        "sync_targets": [
            {"integration_id": integration_id, "integration_name": integration_name, "status": "Queued - connector approval pending"}
            for integration_id, integration_name in INTEGRATION_TARGETS
        ],
    }

    try:
        manifest = _read_manifest()
        manifest.append(record)
        temporary_path = MANIFEST_PATH.with_suffix(".tmp")
        temporary_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        temporary_path.replace(MANIFEST_PATH)
        enqueue_upload(record)
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise

    return record


def list_uploads(allowed_scopes: list[str]) -> list[dict[str, Any]]:
    return [record for record in _read_manifest() if record.get("area_level") in allowed_scopes]


def read_upload(upload_id: str, allowed_scopes: list[str]) -> tuple[dict[str, Any], dict[str, Any]]:
    record = next(
        (
            item for item in _read_manifest()
            if item.get("id") == upload_id and item.get("area_level") in allowed_scopes
        ),
        None,
    )
    if record is None:
        raise FileNotFoundError("The requested dataset is not available to this account.")

    stored_filename = Path(str(record.get("stored_filename", ""))).name
    stored_path = UPLOAD_ROOT / stored_filename
    try:
        payload = json.loads(stored_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("The stored dataset could not be read as GeoJSON.") from error

    if not isinstance(payload, dict) or payload.get("type") != "FeatureCollection":
        raise ValueError("The stored dataset is not a GeoJSON FeatureCollection.")
    return record, payload
