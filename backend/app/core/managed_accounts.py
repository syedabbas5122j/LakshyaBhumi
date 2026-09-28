"""Persistent account records created through the administrator API."""

from pathlib import Path
from typing import Any

from app.core.admin_storage import ADMIN_DATA_ROOT, read_json, write_json

ACCOUNTS_PATH = ADMIN_DATA_ROOT / "managed-accounts.json"


def read_managed_accounts() -> dict[str, dict[str, Any]]:
    payload = read_json(ACCOUNTS_PATH, {})
    if not isinstance(payload, dict) or not all(isinstance(item, dict) for item in payload.values()):
        raise RuntimeError("Managed account store has an invalid format.")
    return {str(identity).strip().casefold(): account for identity, account in payload.items()}


def write_managed_accounts(accounts: dict[str, dict[str, Any]]) -> None:
    write_json(ACCOUNTS_PATH, accounts)


def managed_account_path() -> Path:
    return ACCOUNTS_PATH