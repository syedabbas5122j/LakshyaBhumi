"""Shared data models for the AI harmonization engine.

Every module in the engine operates on these types so the full pipeline
can be composed without ad-hoc dict shapes leaking across boundaries.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class GeometryType(str, Enum):
    POINT = "Point"
    MULTI_POINT = "MultiPoint"
    LINE_STRING = "LineString"
    MULTI_LINE_STRING = "MultiLineString"
    POLYGON = "Polygon"
    MULTI_POLYGON = "MultiPolygon"
    GEOMETRY_COLLECTION = "GeometryCollection"


class ConflictType(str, Enum):
    GEOMETRIC = "geometric"
    ATTRIBUTE = "attribute"
    JURISDICTIONAL = "jurisdictional"


class ConflictSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ConflictStatus(str, Enum):
    DETECTED = "detected"
    AUTO_RESOLVED = "auto_resolved"
    PENDING_REVIEW = "pending_review"
    ESCALATED_GT = "escalated_gt"
    RESOLVED = "resolved"


class ReviewAction(str, Enum):
    AUTO_APPLY = "auto_apply"
    PENDING_REVIEW = "pending_review"
    ESCALATE = "escalate"


class ChangeType(str, Enum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    UNCHANGED = "unchanged"


class SourcePriority(str, Enum):
    """Source quality tiers used by topology correction & conflict resolution."""
    GNSS_SURVEY = "gnss_survey"       # Highest accuracy
    DRONE_ORI = "drone_ori"
    GROUND_TRUTH = "ground_truth"
    CADASTRAL = "cadastral"
    MUNICIPAL = "municipal"
    REVENUE = "revenue"
    LEGACY = "legacy"                 # Lowest accuracy


# Default ordering — higher index = lower priority
SOURCE_PRIORITY_ORDER: dict[SourcePriority, int] = {
    SourcePriority.GNSS_SURVEY: 0,
    SourcePriority.DRONE_ORI: 1,
    SourcePriority.GROUND_TRUTH: 2,
    SourcePriority.CADASTRAL: 3,
    SourcePriority.MUNICIPAL: 4,
    SourcePriority.REVENUE: 5,
    SourcePriority.LEGACY: 6,
}


# ---------------------------------------------------------------------------
# Geometry & Feature models  (GeoJSON-compatible)
# ---------------------------------------------------------------------------

class GeoJSONGeometry(BaseModel):
    """Standard GeoJSON geometry object."""
    type: GeometryType
    coordinates: Any  # Coordinate nesting varies by geometry type


class GeoFeature(BaseModel):
    """A single geospatial feature with properties and lineage metadata."""
    id: str = Field(default_factory=lambda: uuid4().hex[:12])
    dataset_id: str = ""
    source: SourcePriority = SourcePriority.LEGACY
    geometry: GeoJSONGeometry
    properties: dict[str, Any] = Field(default_factory=dict)
    crs: str = "EPSG:4326"


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

class MatchCandidate(BaseModel):
    """A scored candidate pair produced by the spatial matcher."""
    source_id: str
    target_id: str
    iou_score: float = 0.0
    hausdorff_distance: float = 0.0
    centroid_distance: float = 0.0
    composite_score: float = 0.0
    match_method: str = "geometric"


class MatchResult(BaseModel):
    """Aggregate result from a matching run."""
    total_source: int
    total_target: int
    candidate_pairs: int
    matched: int
    unmatched_source: list[str] = Field(default_factory=list)
    unmatched_target: list[str] = Field(default_factory=list)
    matches: list[MatchCandidate] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Topology
# ---------------------------------------------------------------------------

class TopologyFix(BaseModel):
    feature_id: str
    fix_type: str              # e.g. "make_valid", "snap", "gap_fill", "overlap_trim"
    before_wkt: str = ""
    after_wkt: str = ""
    auto_fixed: bool = True
    needs_review: bool = False


class TopologyReport(BaseModel):
    total_features: int
    invalid_count: int
    fixes_applied: list[TopologyFix] = Field(default_factory=list)
    remaining_issues: int = 0


# ---------------------------------------------------------------------------
# Attributes
# ---------------------------------------------------------------------------

class AttributeMapping(BaseModel):
    source_field: str
    target_field: str
    similarity_score: float
    method: str = "fuzzy"      # fuzzy | exact | ontology
    approved: bool = False


class AttributeReport(BaseModel):
    source_schema: list[str]
    target_schema: list[str]
    mappings: list[AttributeMapping] = Field(default_factory=list)
    unmapped_source: list[str] = Field(default_factory=list)
    unmapped_target: list[str] = Field(default_factory=list)
    value_normalizations: int = 0


# ---------------------------------------------------------------------------
# Geo-referencing
# ---------------------------------------------------------------------------

class TransformResult(BaseModel):
    source_crs: str
    target_crs: str
    features_transformed: int
    rmse: Optional[float] = None   # Root mean square error in metres


# ---------------------------------------------------------------------------
# Change Detection
# ---------------------------------------------------------------------------

class FeatureChange(BaseModel):
    feature_id: str
    change_type: ChangeType
    area_delta: Optional[float] = None      # sq metres
    geometry_similarity: Optional[float] = None
    attribute_changes: dict[str, Any] = Field(default_factory=dict)


class ChangeReport(BaseModel):
    before_count: int
    after_count: int
    added: int = 0
    removed: int = 0
    modified: int = 0
    unchanged: int = 0
    changes: list[FeatureChange] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Conflicts
# ---------------------------------------------------------------------------

class Conflict(BaseModel):
    id: str = Field(default_factory=lambda: f"CONF-{uuid4().hex[:8].upper()}")
    feature_ids: list[str] = Field(default_factory=list)
    conflict_type: ConflictType = ConflictType.GEOMETRIC
    severity: ConflictSeverity = ConflictSeverity.MEDIUM
    status: ConflictStatus = ConflictStatus.DETECTED
    description: str = ""
    resolution_method: str = ""
    resolved_by: str = ""
    source_priorities: list[SourcePriority] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConflictReport(BaseModel):
    total_conflicts: int
    auto_resolved: int = 0
    pending_review: int = 0
    escalated: int = 0
    conflicts: list[Conflict] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Confidence & Uncertainty
# ---------------------------------------------------------------------------

class ConfidenceBreakdown(BaseModel):
    geometry_confidence: float = 0.0
    attribute_confidence: float = 0.0
    source_confidence: float = 0.0
    match_confidence: float = 0.0


class ConfidenceScore(BaseModel):
    feature_id: str
    composite_score: float = 0.0
    breakdown: ConfidenceBreakdown = Field(default_factory=ConfidenceBreakdown)
    positional_error_m: Optional[float] = None   # metres
    quality_flags: list[str] = Field(default_factory=list)
    review_action: ReviewAction = ReviewAction.PENDING_REVIEW
    explanation: str = ""


class ConfidenceReport(BaseModel):
    total_scored: int
    mean_confidence: float = 0.0
    auto_approved: int = 0
    needs_review: int = 0
    escalated: int = 0
    scores: list[ConfidenceScore] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Lineage
# ---------------------------------------------------------------------------

class LineageEntry(BaseModel):
    feature_id: str
    source_dataset: str
    source_feature_id: str = ""
    integration_method: str = ""
    processing_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    parent_lineage_ids: list[str] = Field(default_factory=list)
    notes: str = ""


# ---------------------------------------------------------------------------
# Full Pipeline I/O
# ---------------------------------------------------------------------------

class HarmonizationRequest(BaseModel):
    """Input to the full harmonization pipeline."""
    source_features: list[GeoFeature]
    target_features: list[GeoFeature]
    target_crs: str = "EPSG:4326"
    match_threshold: float = 0.4
    confidence_auto_approve: float = 0.80
    confidence_review: float = 0.50
    snap_tolerance: float = 0.00001  # ~1 m in decimal degrees at equator


class HarmonizationResult(BaseModel):
    """Output from the full harmonization pipeline."""
    matching: MatchResult
    topology: TopologyReport
    attributes: AttributeReport
    transform: TransformResult
    conflicts: ConflictReport
    confidence: ConfidenceReport
    changes: ChangeReport
    lineage: list[LineageEntry] = Field(default_factory=list)
    harmonized_features: list[GeoFeature] = Field(default_factory=list)
