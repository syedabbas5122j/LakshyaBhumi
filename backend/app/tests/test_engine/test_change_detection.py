from app.engine.change_detection import classify_change


def test_classify_change_returns_summary():
    result = classify_change([], [])
    assert result["status"] == "analysis_ready"
