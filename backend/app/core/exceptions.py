class BhushaError(Exception):
    """Base exception for Bhusha application errors."""


class DatasetValidationError(BhushaError):
    """Raised when a dataset fails validation."""
