from app.engine.matching import compute_composite_score


def test_compute_composite_score_returns_value():
    score = compute_composite_score(0.8, 0.0001, 10.0)
    assert 0.0 <= score <= 1.0
