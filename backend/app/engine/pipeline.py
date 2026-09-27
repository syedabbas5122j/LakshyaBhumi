"""AI/GeoAI Harmonization Pipeline  (RFP Sections 3–6)

Orchestrates the full harmonization lifecycle:

  1. Geo-referencing  — normalise all datasets to a common CRS
  2. Spatial Matching — IoU / Hausdorff / centroid-based feature alignment
  3. Topology Correction — repair, snap, gap-fill, overlap-trim
  4. Attribute Mapping — ontology + fuzzy reconciliation
  5. Conflict Resolution — detect → auto-resolve → escalate
  6. Confidence Scoring — multi-factor scores + uncertainty
  7. Lineage Recording — full provenance chain
  8. Change Detection — classify deltas vs. a baseline

Every step feeds its output to the next, and all steps produce auditable
reports bundled into a single *HarmonizationResult*.
"""

from __future__ import annotations

import logging
from typing import Any

from .attributes import match_schemas, reconcile_feature_attributes
from .change_detection import detect_changes
from .confidence import score_features
from .conflicts import detect_and_resolve_conflicts
from .georeferencing import transform_features
from .lineage import LineageTracker
from .matching import match_features
from .schemas import (
    ChangeReport,
    GeoFeature,
    HarmonizationRequest,
    HarmonizationResult,
    MatchCandidate,
)
from .topology import correct_topology

logger = logging.getLogger(__name__)


def run_pipeline(
    request: HarmonizationRequest,
) -> HarmonizationResult:
    """Execute the end-to-end AI harmonization pipeline.

    Parameters
    ----------
    request : HarmonizationRequest
        Contains source_features, target_features, and tuning parameters.

    Returns
    -------
    HarmonizationResult
        Aggregate result with per-step reports + harmonized features.
    """
    tracker = LineageTracker()

    # ------------------------------------------------------------------
    # 1. Geo-referencing — normalise CRS
    # ------------------------------------------------------------------
    logger.info("Step 1/7: CRS normalisation → %s", request.target_crs)

    source_features, src_transform = transform_features(
        request.source_features, target_crs=request.target_crs
    )
    target_features, tgt_transform = transform_features(
        request.target_features, target_crs=request.target_crs
    )

    # Record lineage for ingestion
    for f in source_features:
        tracker.record_ingestion(f, source_dataset=f.dataset_id or "source")
    for f in target_features:
        tracker.record_ingestion(f, source_dataset=f.dataset_id or "target")

    transform_result = src_transform  # Use source transform as the primary report
    transform_result.features_transformed += tgt_transform.features_transformed

    # ------------------------------------------------------------------
    # 2. Spatial Matching
    # ------------------------------------------------------------------
    logger.info("Step 2/7: Spatial matching (threshold=%.2f)", request.match_threshold)

    match_result = match_features(
        source_features,
        target_features,
        threshold=request.match_threshold,
    )

    # Build lookup: feature_id → MatchCandidate
    matches_by_source: dict[str, MatchCandidate] = {}
    for m in match_result.matches:
        matches_by_source[m.source_id] = m

    # Record lineage for matches
    for m in match_result.matches:
        tracker.record_merge(
            output_feature_id=m.source_id,
            source_feature_ids=[m.source_id, m.target_id],
            method=f"spatial_match:{m.match_method}",
            notes=f"Composite score={m.composite_score:.4f}",
        )

    # ------------------------------------------------------------------
    # 3. Topology Correction
    # ------------------------------------------------------------------
    logger.info("Step 3/7: Topology correction")

    all_features = list(source_features) + list(target_features)
    corrected_features, topo_report = correct_topology(
        all_features,
        snap_tolerance=request.snap_tolerance,
    )

    for fix in topo_report.fixes_applied:
        feat = next((f for f in corrected_features if f.id == fix.feature_id), None)
        if feat:
            tracker.record_transform(
                feat,
                method=f"topology:{fix.fix_type}",
                notes=f"auto_fixed={fix.auto_fixed}",
            )

    # ------------------------------------------------------------------
    # 4. Attribute Mapping
    # ------------------------------------------------------------------
    logger.info("Step 4/7: Attribute mapping & reconciliation")

    # Gather all unique property keys across both datasets
    source_keys: set[str] = set()
    target_keys: set[str] = set()
    for f in source_features:
        source_keys.update(f.properties.keys())
    for f in target_features:
        target_keys.update(f.properties.keys())

    attr_report = match_schemas(sorted(source_keys), sorted(target_keys))

    # Apply attribute reconciliation for matched pairs
    attr_conflicts_map: dict[str, list[str]] = {}
    for m in match_result.matches:
        src_feat = next((f for f in source_features if f.id == m.source_id), None)
        tgt_feat = next((f for f in target_features if f.id == m.target_id), None)
        if src_feat and tgt_feat:
            merged_props, conflicts = reconcile_feature_attributes(
                src_feat, tgt_feat, attr_report
            )
            # Update the source feature's properties with merged values
            idx = next(
                (i for i, f in enumerate(corrected_features) if f.id == m.source_id),
                None,
            )
            if idx is not None:
                corrected_features[idx] = corrected_features[idx].model_copy(
                    update={"properties": merged_props}
                )
            if conflicts:
                attr_conflicts_map[m.source_id] = conflicts
                tracker.record_transform(
                    src_feat,
                    method="attribute_reconciliation",
                    notes=f"{len(conflicts)} conflicts",
                )

    attr_report.value_normalizations = sum(
        len(v) for v in attr_conflicts_map.values()
    )

    # ------------------------------------------------------------------
    # 5. Conflict Detection & Resolution
    # ------------------------------------------------------------------
    logger.info("Step 5/7: Conflict detection & resolution")

    conflict_report = detect_and_resolve_conflicts(corrected_features)

    for conflict in conflict_report.conflicts:
        for fid in conflict.feature_ids:
            tracker.record_conflict_resolution(
                feature_id=fid,
                conflict_id=conflict.id,
                resolution=conflict.status.value,
                resolved_by=conflict.resolved_by or "system",
            )

    # ------------------------------------------------------------------
    # 6. Confidence Scoring
    # ------------------------------------------------------------------
    logger.info("Step 6/7: Confidence scoring")

    confidence_report = score_features(
        corrected_features,
        topology_fixes=topo_report.fixes_applied,
        attribute_conflicts_map=attr_conflicts_map,
        matches_map=matches_by_source,
        auto_approve_threshold=request.confidence_auto_approve,
        review_threshold=request.confidence_review,
    )

    # ------------------------------------------------------------------
    # 7. Change Detection  (source vs. corrected)
    # ------------------------------------------------------------------
    logger.info("Step 7/7: Change detection")

    change_report = detect_changes(
        before_features=request.source_features,
        after_features=corrected_features[:len(source_features)],
    )

    # ------------------------------------------------------------------
    # Assemble result
    # ------------------------------------------------------------------
    result = HarmonizationResult(
        matching=match_result,
        topology=topo_report,
        attributes=attr_report,
        transform=transform_result,
        conflicts=conflict_report,
        confidence=confidence_report,
        changes=change_report,
        lineage=tracker.entries,
        harmonized_features=corrected_features,
    )

    logger.info(
        "Pipeline complete: %d harmonized features, mean confidence=%.4f",
        len(corrected_features),
        confidence_report.mean_confidence,
    )
    return result


# ---------------------------------------------------------------------------
# Convenience wrapper that accepts raw dicts (backward-compat)
# ---------------------------------------------------------------------------

def run_pipeline_raw(
    source_features: list[dict[str, Any]],
    target_features: list[dict[str, Any]],
    **kwargs: Any,
) -> dict[str, Any]:
    """Accept raw GeoJSON-style dicts and return a plain dict result."""
    request = HarmonizationRequest(
        source_features=[GeoFeature(**f) for f in source_features],
        target_features=[GeoFeature(**f) for f in target_features],
        **kwargs,
    )
    result = run_pipeline(request)
    return result.model_dump()
