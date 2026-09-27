from app.engine.matching import compute_similarity


def test_compute_similarity_returns_value():
    assert compute_similarity({"id": "a"}, {"id": "b"}) == 0.85
