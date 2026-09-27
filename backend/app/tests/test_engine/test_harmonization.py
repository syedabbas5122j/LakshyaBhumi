"""Tests for AI/GeoAI Harmonization Engine (RFP Sections 3-6)"""

import pytest
from app.engine.schemas import GeoFeature, SourcePriority, ChangeType, ConflictSeverity, ReviewAction
from app.engine.matching import match_features, compute_composite_score
from app.engine.topology import correct_topology
from app.engine.change_detection import detect_changes
from app.engine.conflicts import detect_and_resolve_conflicts
from app.engine.confidence import score_feature, score_features
from app.engine.pipeline import run_pipeline, HarmonizationRequest


def sample_poly(feature_id: str, offset: float = 0.0, owner: str = "Alice", survey_no: str = "101") -> GeoFeature:
    return GeoFeature(
        id=feature_id,
        geometry={
            "type": "Polygon",
            "coordinates": [[
                [78.47 + offset, 17.37],
                [78.48 + offset, 17.37],
                [78.48 + offset, 17.38],
                [78.47 + offset, 17.38],
                [78.47 + offset, 17.37]
            ]]
        },
        properties={
            "survey_number": survey_no,
            "owner_name": owner,
            "area": 1000.0,
            "land_use": "Agricultural"
        },
        source=SourcePriority.GNSS_SURVEY
    )


def test_matching_engine():
    f1 = sample_poly("f1", offset=0.0)
    f2 = sample_poly("f2", offset=0.0001)
    res = match_features([f1], [f2], threshold=0.1)
    assert res.matched == 1
    assert len(res.matches) == 1
    assert res.matches[0].source_id == "f1"
    assert res.matches[0].target_id == "f2"


def test_topology_engine():
    f1 = sample_poly("f1")
    repaired, report = correct_topology([f1])
    assert len(repaired) == 1
    assert repaired[0].id == "f1"


def test_change_detection_engine():
    before = sample_poly("b1", owner="Alice")
    after = sample_poly("b1", owner="Bob")
    report = detect_changes([before], [after])
    assert report.before_count == 1
    assert report.after_count == 1
    assert report.modified == 1


def test_conflict_resolution_engine():
    f1 = sample_poly("f1", offset=0.0)
    f2 = sample_poly("f2", offset=0.0001) # overlapping
    report = detect_and_resolve_conflicts([f1, f2])
    assert report.total_conflicts >= 1


def test_confidence_scoring_engine():
    f1 = sample_poly("f1")
    score = score_feature(f1)
    assert 0.0 <= score.composite_score <= 1.0
    assert score.review_action in (ReviewAction.AUTO_APPLY, ReviewAction.PENDING_REVIEW, ReviewAction.ESCALATE)


def test_full_pipeline():
    f1 = sample_poly("f1", 0.0)
    f2 = sample_poly("f2", 0.0001)
    req = HarmonizationRequest(source_features=[f1], target_features=[f2])
    result = run_pipeline(req)
    assert len(result.harmonized_features) >= 1
    assert result.confidence is not None
