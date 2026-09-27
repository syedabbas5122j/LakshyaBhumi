from app.engine.confidence import score_feature
from app.engine.schemas import GeoFeature, SourcePriority


def test_score_feature_clamps_between_zero_and_one():
    f = GeoFeature(
        id="f1",
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        properties={"survey_number": "101"},
        source=SourcePriority.GNSS_SURVEY
    )
    score = score_feature(f)
    assert 0.0 <= score.composite_score <= 1.0
