"""Confidence Scoring & Uncertainty Quantification  (RFP Section 6.7)

Implements:
  - Per-feature multi-factor confidence scoring (geometry, attribute, source, match)
  - Composite confidence score per integrated parcel
  - Positional uncertainty estimation in metres
  - Quality-flag tagging per feature
  - Confidence threshold-based routing (auto-approve / review / escalate)
  - Explainability output describing contributing factors
  - Confidence visualization support (color-coded tiers)
"""

from __future__ import annotations

import logging
from typing import Any

from .schemas import (
    ConfidenceBreakdown,
    ConfidenceReport,
    ConfidenceScore,
    GeoFeature,
    MatchCandidate,
    ReviewAction,
    SourcePriority,
    SOURCE_PRIORITY_ORDER,
    TopologyFix,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Source accuracy priors  (positional accuracy in metres, approximate)
# ---------------------------------------------------------------------------

_SOURCE_ACCURACY_M: dict[SourcePriority, float] = {
    SourcePriority.GNSS_SURVEY: 0.02,     # RTK-level
    SourcePriority.DRONE_ORI: 0.10,
    SourcePriority.GROUND_TRUTH: 0.50,
    SourcePriority.CADASTRAL: 2.0,
    SourcePriority.MUNICIPAL: 5.0,
    SourcePriority.REVENUE: 10.0,
    SourcePriority.LEGACY: 25.0,
}

_SOURCE_CONFIDENCE: dict[SourcePriority, float] = {
    SourcePriority.GNSS_SURVEY: 0.98,
    SourcePriority.DRONE_ORI: 0.92,
    SourcePriority.GROUND_TRUTH: 0.85,
    SourcePriority.CADASTRAL: 0.75,
    SourcePriority.MUNICIPAL: 0.65,
    SourcePriority.REVENUE: 0.55,
    SourcePriority.LEGACY: 0.35,
}


# ---------------------------------------------------------------------------
# Individual confidence factors
# ---------------------------------------------------------------------------

def _geometry_confidence(
    feature: GeoFeature,
    topology_fixes: list[TopologyFix],
) -> tuple[float, list[str]]:
    """Score geometry quality.  Deductions for each topology fix applied."""
    score = 1.0
    flags: list[str] = []

    fixes_for_feat = [f for f in topology_fixes if f.feature_id == feature.id]
    for fix in fixes_for_feat:
        if fix.fix_type == "make_valid":
            score -= 0.15
            flags.append("geometry_repaired")
        elif fix.fix_type == "snap":
            score -= 0.05
            flags.append("boundary_snapped")
        elif fix.fix_type == "gap_fill":
            score -= 0.10
            flags.append("gap_filled")
        elif fix.fix_type == "overlap_trim":
            score -= 0.12
            flags.append("overlap_trimmed")
        elif fix.fix_type == "collection_collapse":
            score -= 0.20
            flags.append("collection_collapsed")

    return max(0.0, score), flags


def _attribute_confidence(
    feature: GeoFeature,
    attribute_conflicts: list[str],
) -> tuple[float, list[str]]:
    """Score attribute completeness and consistency."""
    score = 1.0
    flags: list[str] = []

    # Deduct for missing critical fields
    critical = ["owner_name", "survey_number", "area", "land_use"]
    missing = [f for f in critical if not feature.properties.get(f)]
    if missing:
        score -= 0.10 * len(missing)
        flags.append(f"missing_fields:{','.join(missing)}")

    # Deduct for attribute conflicts
    if attribute_conflicts:
        score -= 0.15 * len(attribute_conflicts)
        flags.append("attribute_conflict")

    return max(0.0, score), flags


def _source_confidence(feature: GeoFeature) -> tuple[float, list[str]]:
    """Score based on source data quality tier."""
    conf = _SOURCE_CONFIDENCE.get(feature.source, 0.40)
    flags: list[str] = [f"source_tier:{feature.source.value}"]
    return conf, flags


def _match_confidence(match: MatchCandidate | None) -> tuple[float, list[str]]:
    """Score based on match quality (if feature was matched to a target)."""
    if match is None:
        return 0.5, ["unmatched"]
    score = match.composite_score
    flags: list[str] = [f"match_method:{match.match_method}"]
    if score < 0.5:
        flags.append("low_confidence_match")
    return score, flags


# ---------------------------------------------------------------------------
# Composite scoring
# ---------------------------------------------------------------------------

def score_feature(
    feature: GeoFeature,
    *,
    topology_fixes: list[TopologyFix] | None = None,
    attribute_conflicts: list[str] | None = None,
    match: MatchCandidate | None = None,
    auto_approve_threshold: float = 0.80,
    review_threshold: float = 0.50,
    w_geometry: float = 0.30,
    w_attribute: float = 0.25,
    w_source: float = 0.25,
    w_match: float = 0.20,
) -> ConfidenceScore:
    """Compute a multi-factor confidence score for a single feature."""
    topology_fixes = topology_fixes or []
    attribute_conflicts = attribute_conflicts or []

    geom_conf, geom_flags = _geometry_confidence(feature, topology_fixes)
    attr_conf, attr_flags = _attribute_confidence(feature, attribute_conflicts)
    src_conf, src_flags = _source_confidence(feature)
    mtch_conf, mtch_flags = _match_confidence(match)

    composite = (
        w_geometry * geom_conf
        + w_attribute * attr_conf
        + w_source * src_conf
        + w_match * mtch_conf
    )
    composite = round(max(0.0, min(1.0, composite)), 4)

    # Review routing
    if composite >= auto_approve_threshold:
        action = ReviewAction.AUTO_APPLY
    elif composite >= review_threshold:
        action = ReviewAction.PENDING_REVIEW
    else:
        action = ReviewAction.ESCALATE

    # Positional error estimate from source tier
    pos_error = _SOURCE_ACCURACY_M.get(feature.source, 25.0)

    all_flags = geom_flags + attr_flags + src_flags + mtch_flags

    # Build human-readable explanation
    explanation_parts = [
        f"geometry={geom_conf:.2f} (w={w_geometry})",
        f"attribute={attr_conf:.2f} (w={w_attribute})",
        f"source={src_conf:.2f} (w={w_source})",
        f"match={mtch_conf:.2f} (w={w_match})",
        f"→ composite={composite:.4f}",
        f"→ action={action.value}",
    ]
    if all_flags:
        explanation_parts.append(f"flags: {', '.join(all_flags)}")

    return ConfidenceScore(
        feature_id=feature.id,
        composite_score=composite,
        breakdown=ConfidenceBreakdown(
            geometry_confidence=round(geom_conf, 4),
            attribute_confidence=round(attr_conf, 4),
            source_confidence=round(src_conf, 4),
            match_confidence=round(mtch_conf, 4),
        ),
        positional_error_m=round(pos_error, 3),
        quality_flags=all_flags,
        review_action=action,
        explanation=" | ".join(explanation_parts),
    )


# ---------------------------------------------------------------------------
# Batch scoring
# ---------------------------------------------------------------------------

def score_features(
    features: list[GeoFeature],
    *,
    topology_fixes: list[TopologyFix] | None = None,
    attribute_conflicts_map: dict[str, list[str]] | None = None,
    matches_map: dict[str, MatchCandidate] | None = None,
    auto_approve_threshold: float = 0.80,
    review_threshold: float = 0.50,
) -> ConfidenceReport:
    """Score all features and produce an aggregate report."""
    topology_fixes = topology_fixes or []
    attribute_conflicts_map = attribute_conflicts_map or {}
    matches_map = matches_map or {}

    scores: list[ConfidenceScore] = []
    for feat in features:
        cs = score_feature(
            feat,
            topology_fixes=topology_fixes,
            attribute_conflicts=attribute_conflicts_map.get(feat.id, []),
            match=matches_map.get(feat.id),
            auto_approve_threshold=auto_approve_threshold,
            review_threshold=review_threshold,
        )
        scores.append(cs)

    mean_conf = (
        sum(s.composite_score for s in scores) / len(scores) if scores else 0.0
    )
    auto_count = sum(1 for s in scores if s.review_action == ReviewAction.AUTO_APPLY)
    review_count = sum(
        1 for s in scores if s.review_action == ReviewAction.PENDING_REVIEW
    )
    escalate_count = sum(
        1 for s in scores if s.review_action == ReviewAction.ESCALATE
    )

    report = ConfidenceReport(
        total_scored=len(scores),
        mean_confidence=round(mean_conf, 4),
        auto_approved=auto_count,
        needs_review=review_count,
        escalated=escalate_count,
        scores=scores,
    )
    logger.info(
        "Confidence scoring: %d features, mean=%.4f, auto=%d, review=%d, escalate=%d",
        report.total_scored,
        report.mean_confidence,
        report.auto_approved,
        report.needs_review,
        report.escalated,
    )
    return report
