from app.engine.confidence import score_match


def test_score_match_clamps_between_zero_and_one():
    assert 0.0 <= score_match(0.9) <= 1.0
    assert score_match(2.0) == 1.0
