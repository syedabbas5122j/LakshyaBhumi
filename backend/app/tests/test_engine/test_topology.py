from app.engine.topology import repair_geometry


def test_repair_geometry_returns_geometry():
    sample = {"type": "Polygon", "coordinates": []}
    assert repair_geometry(sample) == sample
