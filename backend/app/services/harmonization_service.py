"""Persistent local storage for harmonization outputs and audit reports."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.engine.schemas import HarmonizationResult

OUTPUT_ROOT = Path(__file__).resolve().parents[2] / "harmonized-data"
MANIFEST_PATH = OUTPUT_ROOT / "manifest.json"


def _read_manifest() -> list[dict[str, Any]]:
    if not MANIFEST_PATH.exists():
        return []
    try:
        payload = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Harmonization manifest is unreadable.") from error
    if not isinstance(payload, list):
        raise RuntimeError("Harmonization manifest has an invalid format.")
    return payload


def persist_harmonization_run(
    run_id: str,
    source_record: dict[str, Any],
    target_record: dict[str, Any],
    user: dict[str, str],
    target_crs: str,
    result: HarmonizationResult,
) -> dict[str, Any]:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    safe_run_id = "".join(character if character.isalnum() or character in {"-", "_"} else "-" for character in run_id)
    geojson_filename = f"{safe_run_id}-harmonized.geojson"
    report_filename = f"{safe_run_id}-pipeline-report.json"
    geojson_path = OUTPUT_ROOT / geojson_filename
    report_path = OUTPUT_ROOT / report_filename

    geojson = {
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
    }
    report = {
        "run_id": run_id,
        "started_by": user.get("role", "unknown"),
        "source_dataset": source_record.get("dataset_name", source_record.get("id")),
        "target_dataset": target_record.get("dataset_name", target_record.get("id")),
        "target_crs": target_crs,
        "output_features": len(result.harmonized_features),
        "mean_confidence": result.confidence.mean_confidence,
        "lineage_entries": len(result.lineage),
        "steps": {
            "georeferencing": {"features_transformed": result.transform.features_transformed},
            "matching": {"matched": result.matching.matched, "candidates": result.matching.candidate_pairs},
            "topology": {"fixes_applied": len(result.topology.fixes_applied)},
            "attributes": {"mappings": len(result.attributes.mappings)},
            "conflicts": {"total": result.conflicts.total_conflicts, "auto_resolved": result.conflicts.auto_resolved},
            "confidence": {"mean": result.confidence.mean_confidence, "scored": result.confidence.total_scored},
            "changes": {"modified": result.changes.modified, "added": result.changes.added, "removed": result.changes.removed},
        },
    }

    geojson_path.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    record = {
        "run_id": run_id,
        "source_dataset": source_record.get("dataset_name", source_record.get("id")),
        "target_dataset": target_record.get("dataset_name", target_record.get("id")),
        "started_by": user.get("id", "unknown"),
        "started_role": user.get("role", "unknown"),
        "target_crs": target_crs,
        "feature_count": len(result.harmonized_features),
        "geojson_filename": geojson_filename,
        "report_filename": report_filename,
    }
    manifest = [item for item in _read_manifest() if item.get("run_id") != run_id]
    manifest.append(record)
    MANIFEST_PATH.with_suffix(".tmp").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    MANIFEST_PATH.with_suffix(".tmp").replace(MANIFEST_PATH)
    return record


def list_harmonization_runs() -> list[dict[str, Any]]:
    return list(reversed(_read_manifest()))


def get_harmonization_file(run_id: str, kind: str) -> tuple[dict[str, Any], Path]:
    record = next((item for item in _read_manifest() if item.get("run_id") == run_id), None)
    if record is None:
        raise FileNotFoundError("Harmonization run was not found.")
    filename_key = "geojson_filename" if kind == "geojson" else "report_filename" if kind == "report" else ""
    filename = record.get(filename_key)
    if not filename:
        raise ValueError("Unsupported harmonization file type.")
    path = OUTPUT_ROOT / Path(str(filename)).name
    if not path.exists():
        raise FileNotFoundError("The generated harmonization file is missing.")
    return record, path
