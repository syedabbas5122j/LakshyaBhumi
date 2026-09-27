from app.engine.conflicts import detect_conflicts


def test_detect_conflicts_returns_list():
    result = detect_conflicts([{"id": "c1"}])
    assert len(result) == 1
