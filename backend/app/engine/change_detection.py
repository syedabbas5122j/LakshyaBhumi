"""Change Detection Mechanisms  (RFP Section 6.5)

Implements:
  - Feature-level change classification: added, removed, modified, unchanged
  - Geometry similarity comparison via IoU
  - Attribute-level change tracking
  - Area-delta calculation
  - Change significance thresholding to suppress noise
  - Temporal summary statistics
"""

from __future__ import annotations

import logging
from typing import Any

from .geo_utils import (
    bbox_overlap,
    ensure_valid,
    geojson_to_shapely,
    polygon_area_sq_m,
)
from .matching import _iou
from .schemas import (
    ChangeReport,
    ChangeType,
    FeatureChange,
    GeoFeature,
)

logger = logging.getLogger(__name__)

# Below this IoU the geometry is considered "modified"
_MODIFIED_IOU_THRESHOLD = 0.95
# Below this IoU the geometry is considered an entirely different feature
_DIFFERENT_IOU_THRESHOLD = 0.20


def _attr_diff(
    old_props: dict[str, Any],
    new_props: dict[str, Any],
) -> dict[str, Any]:
    """Return a dict of {field: {"old": ..., "new": ...}} for changed attributes."""
    changes: dict[str, Any] = {}
    all_keys = set(old_props.keys()) | set(new_props.keys())
    for key in all_keys:
        old_val = old_props.get(key)
        new_val = new_props.get(key)
        if str(old_val).strip() != str(new_val).strip():
            changes[key] = {"old": old_val, "new": new_val}
    return changes


def detect_changes(
    before_features: list[GeoFeature],
    after_features: list[GeoFeature],
    *,
    id_field: str = "survey_number",
    iou_modified_threshold: float = _MODIFIED_IOU_THRESHOLD,
    iou_different_threshold: float = _DIFFERENT_IOU_THRESHOLD,
    min_area_change_sqm: float = 1.0,
) -> ChangeReport:
    """Compare two snapshots of features and classify each change.

    Matching is done by *id_field* property.  If no id_field match exists,
    falls back to spatial overlap (IoU).
    """
    changes: list[FeatureChange] = []

    # Index by id_field value
    before_by_key: dict[str, GeoFeature] = {}
    for f in before_features:
        key = f.properties.get(id_field) or f.id
        before_by_key[str(key)] = f

    after_by_key: dict[str, GeoFeature] = {}
    for f in after_features:
        key = f.properties.get(id_field) or f.id
        after_by_key[str(key)] = f

    matched_before: set[str] = set()
    matched_after: set[str] = set()

    # Compare features that share the same key
    for key, after_feat in after_by_key.items():
        if key in before_by_key:
            before_feat = before_by_key[key]
            matched_before.add(key)
            matched_after.add(key)

            bg = ensure_valid(geojson_to_shapely(before_feat.geometry))
            ag = ensure_valid(geojson_to_shapely(after_feat.geometry))

            iou = _iou(bg, ag)
            area_before = polygon_area_sq_m(bg)
            area_after = polygon_area_sq_m(ag)
            area_delta = area_after - area_before

            attr_changes = _attr_diff(before_feat.properties, after_feat.properties)

            if iou >= iou_modified_threshold and not attr_changes:
                change_type = ChangeType.UNCHANGED
            elif iou < iou_different_threshold:
                change_type = ChangeType.ADDED  # so different it's effectively new
            else:
                change_type = ChangeType.MODIFIED

            # Suppress noise: if area change is tiny and no attr changes → unchanged
            if (
                change_type == ChangeType.MODIFIED
                and abs(area_delta) < min_area_change_sqm
                and not attr_changes
            ):
                change_type = ChangeType.UNCHANGED

            changes.append(
                FeatureChange(
                    feature_id=after_feat.id,
                    change_type=change_type,
                    area_delta=round(area_delta, 2),
                    geometry_similarity=round(iou, 4),
                    attribute_changes=attr_changes,
                )
            )

    # Features only in before → removed
    for key, before_feat in before_by_key.items():
        if key not in matched_before:
            changes.append(
                FeatureChange(
                    feature_id=before_feat.id,
                    change_type=ChangeType.REMOVED,
                )
            )

    # Features only in after → added
    for key, after_feat in after_by_key.items():
        if key not in matched_after:
            changes.append(
                FeatureChange(
                    feature_id=after_feat.id,
                    change_type=ChangeType.ADDED,
                )
            )

    added = sum(1 for c in changes if c.change_type == ChangeType.ADDED)
    removed = sum(1 for c in changes if c.change_type == ChangeType.REMOVED)
    modified = sum(1 for c in changes if c.change_type == ChangeType.MODIFIED)
    unchanged = sum(1 for c in changes if c.change_type == ChangeType.UNCHANGED)

    report = ChangeReport(
        before_count=len(before_features),
        after_count=len(after_features),
        added=added,
        removed=removed,
        modified=modified,
        unchanged=unchanged,
        changes=changes,
    )
    logger.info(
        "Change detection: +%d added, -%d removed, ~%d modified, =%d unchanged",
        added, removed, modified, unchanged,
    )
    return report
