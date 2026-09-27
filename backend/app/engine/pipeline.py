"""High-level orchestration for the Bhusha geospatial engine."""

from __future__ import annotations

from .matching import compute_similarity, generate_candidates


def run_pipeline(source_features: list[dict], target_features: list[dict]) -> dict:
    """Run a basic end-to-end matching flow for feature comparison."""
    candidates = generate_candidates(source_features, target_features)
    results = [
        {
            "source": source,
            "target": target,
            "similarity": compute_similarity(source, target),
        }
        for source, target in candidates
    ]
    return {"candidate_count": len(results), "results": results}
