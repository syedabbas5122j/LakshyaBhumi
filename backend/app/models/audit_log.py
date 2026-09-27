from dataclasses import dataclass


@dataclass
class AuditLog:
    id: str
    entity_type: str
    entity_id: str
    action: str
