from app.engine.topology import correct_topology
from app.engine.schemas import GeoFeature, SourcePriority


def test_correct_topology_returns_corrected():
    f = GeoFeature(
        id="t1",
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        properties={"survey_number": "101"},
        source=SourcePriority.GNSS_SURVEY
    )
    repaired, report = correct_topology([f])
    assert len(repaired) == 1
    assert repaired[0].id == "t1"
