"""Reference Data Service for Andhra Pradesh Administrative Boundaries & Gazette Master Data.

Provides standardized access to:
- Official AP Districts master list (26 districts with standardized IDs)
- Assembly & Parliamentary Constituencies GeoJSON boundaries
- State District boundary GeoJSON
- District Mandals Gazette mappings
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Base path to input location data
INPUT_DIR = Path("input/andhrapradesh_opendata_locations-main/andhrapradesh_opendata_locations-main")


def load_districts_master() -> list[dict[str, str]]:
    """Return the official list of 26 AP districts with names and standardized IDs."""
    path = INPUT_DIR / "AP_Districts_Final.json"
    if not path.exists():
        logger.warning("Districts master JSON not found at %s", path)
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_constituencies_master() -> list[dict[str, Any]]:
    """Return the official list of AP Assembly Constituencies."""
    path = INPUT_DIR / "Final_Andhra_Constituencies_2024.json"
    if not path.exists():
        logger.warning("Constituencies master JSON not found at %s", path)
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_district_geojson() -> dict[str, Any]:
    """Load the state-wide AP Districts GeoJSON for spatial overlay/geo-referencing."""
    path = INPUT_DIR / "AndhraPradesh_Districts.geojson"
    if not path.exists():
        logger.warning("Districts GeoJSON not found at %s", path)
        return {"type": "FeatureCollection", "features": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_constituencies_geojson() -> dict[str, Any]:
    """Load the state-wide AP Assembly Constituencies GeoJSON."""
    path = INPUT_DIR / "Constituencies_AndhraPradesh_2024.geojson"
    if not path.exists():
        logger.warning("Constituencies GeoJSON not found at %s", path)
        return {"type": "FeatureCollection", "features": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_gazette_documents() -> list[dict[str, Any]]:
    """List all available Gazette PDFs for District-Mandal restructuring."""
    gazette_dir = INPUT_DIR / "District_MandalsGazette"
    if not gazette_dir.exists():
        return []
    
    pdfs = []
    for pdf_file in gazette_dir.glob("*.pdf"):
        dist_name = pdf_file.stem
        dist_id = dist_name.lower().replace(" ", "_").replace(".", "")
        pdfs.append({
            "district_name": dist_name,
            "district_id": dist_id,
            "filename": pdf_file.name,
            "path": str(pdf_file)
        })
    return sorted(pdfs, key=lambda x: x["district_name"])
