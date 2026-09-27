"""Storage abstraction for data and export objects."""


def get_storage_client() -> dict:
    return {"provider": "local", "status": "ready"}
