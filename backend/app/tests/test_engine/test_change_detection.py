from app.engine.change_detection import detect_changes
from app.engine.schemas import GeoFeature, SourcePriority


def test_detect_changes_returns_report():
    f1 = GeoFeature(
        id="b1",
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        properties={"survey_number": "101", "owner_name": "Alice"},
        source=SourcePriority.CADASTRAL
    )
    f2 = GeoFeature(
        id="b1",
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        properties={"survey_number": "101", "owner_name": "Bob"},
        source=SourcePriority.CADASTRAL
    )
    result = detect_changes([f1], [f2])
    assert result.modified == 1
