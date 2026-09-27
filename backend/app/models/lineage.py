from dataclasses import dataclass


@dataclass
class LineageRecord:
    id: str
    feature_id: str
    source: str
    method: str
