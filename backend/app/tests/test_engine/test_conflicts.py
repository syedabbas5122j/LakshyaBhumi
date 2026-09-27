from app.engine.conflicts import detect_and_resolve_conflicts
from app.engine.schemas import GeoFeature, SourcePriority


def test_detect_and_resolve_conflicts_returns_report():
    f1 = GeoFeature(
        id="c1",
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        properties={"survey_number": "101"},
        source=SourcePriority.CADASTRAL
    )
    result = detect_and_resolve_conflicts([f1])
    assert result.total_conflicts == 0
