"""Intelligent Attribute Mapping  (RFP Section 6.3)

Implements:
  - Schema auto-detection across source datasets
  - NLP / ontology-based field-name reconciliation
    (e.g. "owner_nm" → "pattadar_name")
  - Attribute value normalization (units, dates, land-use codes)
  - Cross-department code-list harmonization
  - Mapping-rule suggestion engine with approval step
  - Reusable mapping templates per department
  - Conflicting-attribute detection
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any

from rapidfuzz import fuzz, process

from .schemas import (
    AttributeMapping,
    AttributeReport,
    GeoFeature,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Indian land-records ontology (field-name aliases)
# ---------------------------------------------------------------------------

# Maps canonical field names → known aliases across Indian departments.
# This acts as a lightweight ontology for NLP-free reconciliation.
FIELD_ONTOLOGY: dict[str, list[str]] = {
    "owner_name": [
        "owner_nm", "pattadar_name", "pattadar_nm", "owner",
        "land_owner", "proprietor", "holder_name", "khatedar_name",
        "khatedar", "pattadar", "malik", "bhuswami",
    ],
    "survey_number": [
        "survey_no", "srv_no", "sy_no", "svy_num", "survey_num",
        "khasra_no", "khasra_number", "dag_no", "ts_no",
        "plot_no", "plot_number", "gat_no",
    ],
    "area": [
        "area_sqm", "area_sq_m", "area_ha", "area_acres",
        "extent", "extent_area", "land_area", "parcel_area",
        "kshetra", "kshetrafal",
    ],
    "land_use": [
        "land_type", "land_use_type", "land_classification",
        "bhumi_prakar", "bhumi_upyog", "crop_type", "use_type",
        "land_category",
    ],
    "village": [
        "village_name", "gram", "grama", "habitation",
        "revenue_village", "rev_village",
    ],
    "district": [
        "district_name", "dist", "jila", "zilla",
    ],
    "mandal": [
        "mandal_name", "taluk", "taluka", "tehsil", "tahsil",
        "block", "block_name",
    ],
    "state": [
        "state_name", "rajya", "pradesh",
    ],
    "khata_number": [
        "khata_no", "khata", "khewat_no", "khewat",
        "account_no", "patta_no", "patta_number",
    ],
    "encumbrance": [
        "encumbrance_status", "mortgage", "lien",
        "hypothecation", "charge",
    ],
    "dispute_status": [
        "dispute", "litigation_status", "legal_status",
        "court_case", "dispute_flag",
    ],
    "geometry_type": [
        "geom_type", "shape_type", "feature_type",
    ],
}

# Build reverse index: alias → canonical
_ALIAS_TO_CANONICAL: dict[str, str] = {}
for canonical, aliases in FIELD_ONTOLOGY.items():
    _ALIAS_TO_CANONICAL[canonical] = canonical
    for alias in aliases:
        _ALIAS_TO_CANONICAL[alias.lower()] = canonical


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

def normalize_field_name(name: str) -> str:
    """Lowercase, strip, collapse separators → underscores."""
    name = name.strip().lower()
    name = re.sub(r"[\s\-\.]+", "_", name)
    name = re.sub(r"_+", "_", name)
    return name.strip("_")


def canonicalize_field(name: str) -> str | None:
    """Return the canonical name if *name* is a known alias, else None."""
    return _ALIAS_TO_CANONICAL.get(normalize_field_name(name))


# ---------------------------------------------------------------------------
# Value normalization
# ---------------------------------------------------------------------------

_AREA_UNITS: dict[str, float] = {
    "sqm": 1.0,
    "sq_m": 1.0,
    "sqft": 0.0929,
    "sq_ft": 0.0929,
    "hectares": 10_000.0,
    "ha": 10_000.0,
    "acres": 4_046.86,
    "ac": 4_046.86,
    "guntha": 101.17,
    "cent": 40.47,
    "bigha": 2_529.29,       # varies by state; approximate
    "kanal": 505.857,
}


def normalize_area(value: float, unit: str) -> float:
    """Convert an area value to square metres."""
    factor = _AREA_UNITS.get(unit.lower().strip(), 1.0)
    return value * factor


_DATE_FORMATS = [
    "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d",
    "%d-%b-%Y", "%d %b %Y", "%Y%m%d",
]


def normalize_date(value: str) -> str | None:
    """Try to parse various date formats and return ISO-8601."""
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


LAND_USE_CODELIST: dict[str, str] = {
    # English variations
    "residential": "RESIDENTIAL",
    "commercial": "COMMERCIAL",
    "industrial": "INDUSTRIAL",
    "agricultural": "AGRICULTURAL",
    "mixed": "MIXED_USE",
    "mixed use": "MIXED_USE",
    "govt": "GOVERNMENT",
    "government": "GOVERNMENT",
    "institutional": "INSTITUTIONAL",
    "public": "PUBLIC_PURPOSE",
    "barren": "BARREN",
    "forest": "FOREST",
    "waterbody": "WATERBODY",
    "water body": "WATERBODY",
    "wetland": "WETLAND",
    "plantation": "PLANTATION",
    "transport": "TRANSPORT",
    "road": "TRANSPORT",
    "open space": "OPEN_SPACE",
    "recreational": "RECREATIONAL",
    # Hindi / regional variations
    "awaasi": "RESIDENTIAL",
    "vyaparik": "COMMERCIAL",
    "krishi": "AGRICULTURAL",
    "van": "FOREST",
    "banjari": "BARREN",
}


def normalize_land_use(value: str) -> str:
    """Map various land-use strings to a standardized code."""
    return LAND_USE_CODELIST.get(value.strip().lower(), value.upper())


# ---------------------------------------------------------------------------
# Schema matching (fuzzy + ontology)
# ---------------------------------------------------------------------------

def match_schemas(
    source_fields: list[str],
    target_fields: list[str],
    *,
    threshold: float = 70.0,
) -> AttributeReport:
    """Match fields from two schemas using ontology lookup + fuzzy matching.

    Matching strategy (in priority order):
      1. Exact canonical match via ontology
      2. RapidFuzz token-sort-ratio above *threshold*
    """
    mappings: list[AttributeMapping] = []
    unmapped_source: list[str] = []
    used_targets: set[str] = set()

    for sf in source_fields:
        sf_norm = normalize_field_name(sf)
        sf_canonical = canonicalize_field(sf)
        matched = False

        # 1. Ontology exact match
        if sf_canonical:
            for tf in target_fields:
                if tf in used_targets:
                    continue
                tf_canonical = canonicalize_field(tf)
                if tf_canonical and sf_canonical == tf_canonical:
                    mappings.append(
                        AttributeMapping(
                            source_field=sf,
                            target_field=tf,
                            similarity_score=1.0,
                            method="ontology",
                            approved=True,
                        )
                    )
                    used_targets.add(tf)
                    matched = True
                    break

        # 2. Fuzzy fallback
        if not matched:
            available = [tf for tf in target_fields if tf not in used_targets]
            if available:
                result = process.extractOne(
                    sf_norm,
                    [normalize_field_name(t) for t in available],
                    scorer=fuzz.token_sort_ratio,
                )
                if result and result[1] >= threshold:
                    best_idx = result[2]
                    mappings.append(
                        AttributeMapping(
                            source_field=sf,
                            target_field=available[best_idx],
                            similarity_score=round(result[1] / 100.0, 4),
                            method="fuzzy",
                            approved=False,  # Fuzzy matches need approval
                        )
                    )
                    used_targets.add(available[best_idx])
                    matched = True

        if not matched:
            unmapped_source.append(sf)

    unmapped_target = [tf for tf in target_fields if tf not in used_targets]

    return AttributeReport(
        source_schema=source_fields,
        target_schema=target_fields,
        mappings=mappings,
        unmapped_source=unmapped_source,
        unmapped_target=unmapped_target,
    )


# ---------------------------------------------------------------------------
# Attribute reconciliation across features
# ---------------------------------------------------------------------------

def reconcile_feature_attributes(
    source: GeoFeature,
    target: GeoFeature,
    mapping_report: AttributeReport,
) -> tuple[dict[str, Any], list[str]]:
    """Merge attributes from source into target using the mapping report.

    Returns (merged_properties, list_of_conflict_descriptions).
    """
    merged = dict(target.properties)
    conflicts: list[str] = []

    for am in mapping_report.mappings:
        src_val = source.properties.get(am.source_field)
        tgt_val = target.properties.get(am.target_field)

        if src_val is None:
            continue

        if tgt_val is None or tgt_val == "":
            # Target empty — fill from source
            merged[am.target_field] = src_val
        elif str(src_val).strip().lower() != str(tgt_val).strip().lower():
            # Conflicting values
            conflicts.append(
                f"{am.target_field}: source='{src_val}' vs target='{tgt_val}'"
            )
            # Keep target value but record conflict
        # else: values agree — no action

    return merged, conflicts


def detect_attribute_conflicts(
    features: list[GeoFeature],
    key_field: str = "survey_number",
) -> list[dict[str, Any]]:
    """Find features with the same key (e.g. survey number) but conflicting attributes."""
    by_key: dict[str, list[GeoFeature]] = {}
    for f in features:
        key_val = f.properties.get(key_field)
        if key_val:
            by_key.setdefault(str(key_val), []).append(f)

    conflicts: list[dict[str, Any]] = []
    for key_val, group in by_key.items():
        if len(group) < 2:
            continue
        # Compare all property keys across the group
        all_keys = set()
        for f in group:
            all_keys.update(f.properties.keys())

        for prop_key in all_keys:
            values = {f.id: f.properties.get(prop_key) for f in group}
            unique_vals = set(str(v) for v in values.values() if v is not None)
            if len(unique_vals) > 1:
                conflicts.append({
                    "key_field": key_field,
                    "key_value": key_val,
                    "attribute": prop_key,
                    "values": values,
                    "feature_ids": [f.id for f in group],
                })

    logger.info("Attribute conflict detection: %d conflicts found", len(conflicts))
    return conflicts
