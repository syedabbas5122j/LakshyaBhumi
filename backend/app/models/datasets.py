from dataclasses import dataclass


@dataclass
class Dataset:
    id: str
    name: str
    source: str
