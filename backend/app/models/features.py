from dataclasses import dataclass


@dataclass
class FeatureRecord:
    id: str
    dataset_id: str
    geometry: dict
