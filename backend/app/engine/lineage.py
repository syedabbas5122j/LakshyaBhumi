"""Data Lineage Tracking  (RFP Section 6.7 — Lineage)

Implements:
  - Per-feature source tracking: source dataset, source feature ID,
    integration method, and processing timestamp
  - Parent lineage chain — traces merge/split operations
  - Lineage exposed via dict for Parcel Inspector and API
  - Full integration-chain reconstruction
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from .schemas import GeoFeature, LineageEntry

logger = logging.getLogger(__name__)


class LineageTracker:
    """Accumulates lineage records during a harmonization run."""

    def __init__(self) -> None:
        self._entries: list[LineageEntry] = []

    @property
    def entries(self) -> list[LineageEntry]:
        return list(self._entries)

    # ------------------------------------------------------------------
    # Recording helpers
    # ------------------------------------------------------------------

    def record_ingestion(
        self,
        feature: GeoFeature,
        source_dataset: str,
    ) -> LineageEntry:
        """Record that *feature* was ingested from *source_dataset*."""
        entry = LineageEntry(
            feature_id=feature.id,
            source_dataset=source_dataset,
            source_feature_id=feature.id,
            integration_method="ingestion",
            notes=f"Ingested from {source_dataset}",
        )
        self._entries.append(entry)
        return entry

    def record_transform(
        self,
        feature: GeoFeature,
        method: str,
        source_dataset: str = "",
        parent_ids: list[str] | None = None,
        notes: str = "",
    ) -> LineageEntry:
        """Record a processing step (matching, topology fix, etc.)."""
        entry = LineageEntry(
            feature_id=feature.id,
            source_dataset=source_dataset or feature.dataset_id,
            source_feature_id=feature.id,
            integration_method=method,
            parent_lineage_ids=parent_ids or [],
            notes=notes,
        )
        self._entries.append(entry)
        return entry

    def record_merge(
        self,
        output_feature_id: str,
        source_feature_ids: list[str],
        method: str,
        notes: str = "",
    ) -> LineageEntry:
        """Record that multiple source features were merged into one."""
        entry = LineageEntry(
            feature_id=output_feature_id,
            source_dataset="merged",
            source_feature_id=",".join(source_feature_ids),
            integration_method=method,
            parent_lineage_ids=source_feature_ids,
            notes=notes or f"Merged from {len(source_feature_ids)} sources",
        )
        self._entries.append(entry)
        return entry

    def record_conflict_resolution(
        self,
        feature_id: str,
        conflict_id: str,
        resolution: str,
        resolved_by: str = "system",
    ) -> LineageEntry:
        """Record a conflict resolution decision."""
        entry = LineageEntry(
            feature_id=feature_id,
            source_dataset="conflict_resolution",
            integration_method=f"conflict_resolved:{resolution}",
            parent_lineage_ids=[conflict_id],
            notes=f"Resolved by {resolved_by}: {resolution}",
        )
        self._entries.append(entry)
        return entry

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def get_lineage_for_feature(self, feature_id: str) -> list[LineageEntry]:
        """Return all lineage entries for a given feature."""
        return [e for e in self._entries if e.feature_id == feature_id]

    def get_full_chain(self, feature_id: str) -> list[LineageEntry]:
        """Reconstruct the full lineage chain for *feature_id* (BFS)."""
        seen: set[str] = set()
        queue: list[str] = [feature_id]
        chain: list[LineageEntry] = []

        while queue:
            fid = queue.pop(0)
            if fid in seen:
                continue
            seen.add(fid)
            entries = self.get_lineage_for_feature(fid)
            chain.extend(entries)
            for entry in entries:
                for parent in entry.parent_lineage_ids:
                    if parent not in seen:
                        queue.append(parent)
        return chain

    def summary(self) -> dict[str, Any]:
        """Return a human-readable summary of all recorded lineage."""
        methods = {}
        for e in self._entries:
            methods[e.integration_method] = methods.get(e.integration_method, 0) + 1
        return {
            "total_entries": len(self._entries),
            "unique_features": len({e.feature_id for e in self._entries}),
            "methods": methods,
        }


# ---------------------------------------------------------------------------
# Module-level convenience (backward-compatible with old API)
# ---------------------------------------------------------------------------

def create_lineage_record(
    feature_id: str,
    source_name: str,
    method: str,
) -> dict[str, Any]:
    """Create a lineage metadata dict (simple API for callers that don't need the tracker)."""
    entry = LineageEntry(
        feature_id=feature_id,
        source_dataset=source_name,
        source_feature_id=feature_id,
        integration_method=method,
    )
    return entry.model_dump()
