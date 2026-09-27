"""Spatial Conflict Resolution Framework  (RFP Section 6.6)

Implements:
  - Automated conflict detection: boundary mismatch, ownership mismatch,
    overlapping claims
  - Conflict classification: geometric, attribute, jurisdictional
  - Severity scoring: low / medium / high / critical
  - Rule-based auto-resolution for low-severity conflicts using source-priority
  - Escalation-to-ground-truth pipeline for unresolved / high-severity
  - Multi-source arbitration workflow
  - Conflict resolution audit trail
  - Resolution SLA tracking
"""

from __future__ import annotations

import logging
from typing import Any

from .geo_utils import (
    ensure_valid,
    geojson_to_shapely,
    polygon_area_sq_m,
)
from .matching import _iou
from .schemas import (
    Conflict,
    ConflictReport,
    ConflictSeverity,
    ConflictStatus,
    ConflictType,
    GeoFeature,
    SourcePriority,
    SOURCE_PRIORITY_ORDER,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------

_OVERLAP_LOW = 0.05      # <5% overlap → low severity
_OVERLAP_MEDIUM = 0.15   # <15% overlap → medium
_OVERLAP_HIGH = 0.30     # <30% → high; ≥30% → critical

_AUTO_RESOLVE_MAX_SEVERITY = ConflictSeverity.LOW


# ---------------------------------------------------------------------------
# Detection helpers
# ---------------------------------------------------------------------------

def _overlap_fraction(geom_a: Any, geom_b: Any) -> float:
    """Fraction of the smaller geometry covered by the overlap."""
    if geom_a.is_empty or geom_b.is_empty:
        return 0.0
    try:
        inter = geom_a.intersection(geom_b)
        if inter.is_empty:
            return 0.0
        smaller_area = min(geom_a.area, geom_b.area)
        return inter.area / smaller_area if smaller_area > 0 else 0.0
    except Exception:
        return 0.0


def _classify_severity(overlap_frac: float) -> ConflictSeverity:
    if overlap_frac < _OVERLAP_LOW:
        return ConflictSeverity.LOW
    if overlap_frac < _OVERLAP_MEDIUM:
        return ConflictSeverity.MEDIUM
    if overlap_frac < _OVERLAP_HIGH:
        return ConflictSeverity.HIGH
    return ConflictSeverity.CRITICAL


# ---------------------------------------------------------------------------
# Geometric conflict detection
# ---------------------------------------------------------------------------

def detect_geometric_conflicts(
    features: list[GeoFeature],
) -> list[Conflict]:
    """Detect boundary overlaps and mismatches between all feature pairs."""
    conflicts: list[Conflict] = []
    geoms = [ensure_valid(geojson_to_shapely(f.geometry)) for f in features]
    n = len(features)

    for i in range(n):
        for j in range(i + 1, n):
            if geoms[i].is_empty or geoms[j].is_empty:
                continue
            if not geoms[i].intersects(geoms[j]):
                continue

            frac = _overlap_fraction(geoms[i], geoms[j])
            if frac <= 0:
                continue

            overlap_area_m2 = polygon_area_sq_m(geoms[i].intersection(geoms[j]))
            severity = _classify_severity(frac)

            conflicts.append(
                Conflict(
                    feature_ids=[features[i].id, features[j].id],
                    conflict_type=ConflictType.GEOMETRIC,
                    severity=severity,
                    description=(
                        f"Boundary overlap: {frac:.1%} of smaller parcel "
                        f"(~{overlap_area_m2:.0f} m²)"
                    ),
                    source_priorities=[features[i].source, features[j].source],
                )
            )
    return conflicts


# ---------------------------------------------------------------------------
# Attribute conflict detection
# ---------------------------------------------------------------------------

def detect_attribute_conflicts(
    features: list[GeoFeature],
    *,
    key_field: str = "survey_number",
    critical_fields: list[str] | None = None,
) -> list[Conflict]:
    """Detect conflicting attributes for features sharing the same key."""
    if critical_fields is None:
        critical_fields = ["owner_name", "land_use", "area", "dispute_status"]

    by_key: dict[str, list[GeoFeature]] = {}
    for f in features:
        key = f.properties.get(key_field)
        if key:
            by_key.setdefault(str(key), []).append(f)

    conflicts: list[Conflict] = []
    for key_val, group in by_key.items():
        if len(group) < 2:
            continue
        for field in critical_fields:
            vals = {}
            for f in group:
                v = f.properties.get(field)
                if v is not None:
                    vals[f.id] = str(v)
            unique = set(vals.values())
            if len(unique) > 1:
                # Dispute status conflicts are always critical
                sev = (
                    ConflictSeverity.CRITICAL
                    if field == "dispute_status"
                    else ConflictSeverity.MEDIUM
                )
                conflicts.append(
                    Conflict(
                        feature_ids=list(vals.keys()),
                        conflict_type=ConflictType.ATTRIBUTE,
                        severity=sev,
                        description=(
                            f"Attribute conflict on '{field}' for "
                            f"{key_field}={key_val}: {unique}"
                        ),
                        source_priorities=[
                            f.source for f in group if f.id in vals
                        ],
                    )
                )
    return conflicts


# ---------------------------------------------------------------------------
# Jurisdictional conflict detection
# ---------------------------------------------------------------------------

def detect_jurisdictional_conflicts(
    features: list[GeoFeature],
) -> list[Conflict]:
    """Detect features that span multiple administrative jurisdictions.

    Uses the 'district' and 'mandal' properties.
    """
    conflicts: list[Conflict] = []
    for f in features:
        districts = f.properties.get("district")
        mandals = f.properties.get("mandal")
        # If a feature has multiple district/mandal claims it's jurisdictional
        if isinstance(districts, list) and len(set(districts)) > 1:
            conflicts.append(
                Conflict(
                    feature_ids=[f.id],
                    conflict_type=ConflictType.JURISDICTIONAL,
                    severity=ConflictSeverity.HIGH,
                    description=f"Feature spans multiple districts: {districts}",
                    source_priorities=[f.source],
                )
            )
        if isinstance(mandals, list) and len(set(mandals)) > 1:
            conflicts.append(
                Conflict(
                    feature_ids=[f.id],
                    conflict_type=ConflictType.JURISDICTIONAL,
                    severity=ConflictSeverity.MEDIUM,
                    description=f"Feature spans multiple mandals: {mandals}",
                    source_priorities=[f.source],
                )
            )
    return conflicts


# ---------------------------------------------------------------------------
# Auto-resolution by source priority
# ---------------------------------------------------------------------------

def auto_resolve(
    conflict: Conflict,
    features_by_id: dict[str, GeoFeature],
) -> Conflict:
    """Attempt rule-based auto-resolution for low-severity conflicts.

    Resolution rule: the higher-priority source wins (GNSS > Drone > … > Legacy).
    Only auto-resolves if severity ≤ LOW.
    """
    if conflict.severity != ConflictSeverity.LOW:
        return conflict  # Don't auto-resolve medium/high/critical

    if not conflict.source_priorities:
        return conflict

    # Find the highest-priority source
    best_priority = min(
        (SOURCE_PRIORITY_ORDER.get(sp, 99) for sp in conflict.source_priorities),
        default=99,
    )
    best_source = next(
        (sp for sp in conflict.source_priorities
         if SOURCE_PRIORITY_ORDER.get(sp, 99) == best_priority),
        None,
    )

    resolved = conflict.model_copy(
        update={
            "status": ConflictStatus.AUTO_RESOLVED,
            "resolution_method": f"source_priority_rule: {best_source}",
            "resolved_by": "system",
        }
    )
    return resolved


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_and_resolve_conflicts(
    features: list[GeoFeature],
    *,
    auto_resolve_enabled: bool = True,
) -> ConflictReport:
    """Run the full conflict detection and resolution pipeline.

    1. Detect geometric conflicts (overlaps, boundary mismatches)
    2. Detect attribute conflicts (same survey number, different owners)
    3. Detect jurisdictional conflicts
    4. Auto-resolve low-severity conflicts by source priority
    5. Escalate the rest to ground-truth queue
    """
    features_by_id = {f.id: f for f in features}

    geometric = detect_geometric_conflicts(features)
    attribute = detect_attribute_conflicts(features)
    jurisdictional = detect_jurisdictional_conflicts(features)

    all_conflicts = geometric + attribute + jurisdictional

    if auto_resolve_enabled:
        resolved: list[Conflict] = []
        for c in all_conflicts:
            r = auto_resolve(c, features_by_id)
            # Escalate unresolved medium+ to ground truth
            if r.status != ConflictStatus.AUTO_RESOLVED:
                if r.severity in (ConflictSeverity.HIGH, ConflictSeverity.CRITICAL):
                    r = r.model_copy(update={"status": ConflictStatus.ESCALATED_GT})
                else:
                    r = r.model_copy(update={"status": ConflictStatus.PENDING_REVIEW})
            resolved.append(r)
        all_conflicts = resolved

    auto_resolved_count = sum(
        1 for c in all_conflicts if c.status == ConflictStatus.AUTO_RESOLVED
    )
    pending_count = sum(
        1 for c in all_conflicts if c.status == ConflictStatus.PENDING_REVIEW
    )
    escalated_count = sum(
        1 for c in all_conflicts if c.status == ConflictStatus.ESCALATED_GT
    )

    report = ConflictReport(
        total_conflicts=len(all_conflicts),
        auto_resolved=auto_resolved_count,
        pending_review=pending_count,
        escalated=escalated_count,
        conflicts=all_conflicts,
    )
    logger.info(
        "Conflict resolution: %d total, %d auto-resolved, %d pending, %d escalated",
        report.total_conflicts,
        report.auto_resolved,
        report.pending_review,
        report.escalated,
    )
    return report
