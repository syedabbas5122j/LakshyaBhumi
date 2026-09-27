"""Geometry and coordinate utilities for geospatial processing."""

from __future__ import annotations


def centroid(coords: list[list[float]]) -> tuple[float, float]:
    """Return a simple centroid approximation for a polygon coordinate ring."""
    if not coords:
        return (0.0, 0.0)
    xs = [point[0] for point in coords]
    ys = [point[1] for point in coords]
    return (sum(xs) / len(xs), sum(ys) / len(ys))
