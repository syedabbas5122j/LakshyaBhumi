"""Geometry and coordinate utilities for geospatial processing.

Provides helpers used across the entire engine — Shapely conversion, centroid
computation, bounding-box overlap checks, and coordinate-ring area calculation.
"""

from __future__ import annotations

import math
from typing import Any

from shapely.geometry import (
    GeometryCollection,
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
    mapping,
    shape,
)
from shapely.validation import make_valid

from .schemas import GeoJSONGeometry, GeometryType


# ---------------------------------------------------------------------------
# GeoJSON ↔ Shapely conversion
# ---------------------------------------------------------------------------

def geojson_to_shapely(geojson: dict[str, Any] | GeoJSONGeometry) -> Any:
    """Convert a GeoJSON dict or *GeoJSONGeometry* model to a Shapely object."""
    if isinstance(geojson, GeoJSONGeometry):
        geojson = {"type": geojson.type.value, "coordinates": geojson.coordinates}
    return shape(geojson)


def shapely_to_geojson(geom: Any) -> GeoJSONGeometry:
    """Convert a Shapely geometry back to a *GeoJSONGeometry* model."""
    m = mapping(geom)
    return GeoJSONGeometry(type=GeometryType(m["type"]), coordinates=m["coordinates"])


def ensure_valid(geom: Any) -> Any:
    """Return a valid version of *geom* (no-op if already valid)."""
    if geom.is_valid:
        return geom
    return make_valid(geom)


# ---------------------------------------------------------------------------
# Centroid helpers
# ---------------------------------------------------------------------------

def centroid(coords: list[list[float]]) -> tuple[float, float]:
    """Return a simple centroid approximation for a polygon coordinate ring."""
    if not coords:
        return (0.0, 0.0)
    xs = [point[0] for point in coords]
    ys = [point[1] for point in coords]
    return (sum(xs) / len(xs), sum(ys) / len(ys))


def shapely_centroid(geom: Any) -> tuple[float, float]:
    """Return the centroid (x, y) of a Shapely geometry."""
    c = geom.centroid
    return (c.x, c.y)


# ---------------------------------------------------------------------------
# Distance / metric helpers
# ---------------------------------------------------------------------------

def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Great-circle distance in **metres** between two WGS-84 points."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bbox_overlap(a: Any, b: Any) -> bool:
    """Quick bounding-box overlap test for two Shapely geometries."""
    ax0, ay0, ax1, ay1 = a.bounds
    bx0, by0, bx1, by1 = b.bounds
    return not (ax1 < bx0 or bx1 < ax0 or ay1 < by0 or by1 < ay0)


def polygon_area_sq_m(geom: Any, *, approx_lat: float | None = None) -> float:
    """Approximate area in square metres for a polygon in EPSG:4326.

    Uses a cos(lat) correction.  For proper area calculations use a projected
    CRS — this is a fast approximation for display / scoring only.
    """
    if geom.is_empty:
        return 0.0
    deg_area = geom.area  # in square degrees
    if approx_lat is None:
        approx_lat = geom.centroid.y
    m_per_deg_lat = 111_320.0
    m_per_deg_lon = 111_320.0 * math.cos(math.radians(approx_lat))
    return deg_area * m_per_deg_lat * m_per_deg_lon
