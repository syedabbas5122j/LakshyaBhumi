"""Allowlisted operational switches controlled by a system administrator."""

from app.core.admin_storage import ADMIN_DATA_ROOT, read_json, write_json

CONFIG_PATH = ADMIN_DATA_ROOT / "runtime-config.json"
DEFAULT_CONFIG = {
    "uploads_enabled": True,
    "harmonization_enabled": True,
    "citizen_login_enabled": True,
    "support_tickets_enabled": True,
}


def get_runtime_config() -> dict[str, bool]:
    stored = read_json(CONFIG_PATH, {})
    if not isinstance(stored, dict):
        raise RuntimeError("Runtime configuration has an invalid format.")
    config = dict(DEFAULT_CONFIG)
    for key, value in stored.items():
        if key not in DEFAULT_CONFIG or not isinstance(value, bool):
            raise RuntimeError("Runtime configuration contains an unsupported value.")
        config[key] = value
    return config


def update_runtime_config(changes: dict[str, bool]) -> dict[str, bool]:
    if not changes or any(key not in DEFAULT_CONFIG or not isinstance(value, bool) for key, value in changes.items()):
        raise ValueError("Provide one or more supported boolean configuration values.")
    config = get_runtime_config()
    config.update(changes)
    write_json(CONFIG_PATH, config)
    return config