from dataclasses import dataclass


@dataclass
class ConflictRecord:
    id: str
    feature_id: str
    severity: str
    status: str
