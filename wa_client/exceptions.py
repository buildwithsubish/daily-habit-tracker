"""Custom exceptions for wa_client."""


class WAClientError(Exception):
    """Base error for WhatsApp client operations."""


class WAConnectionError(WAClientError):
    """Raised when the WhatsApp server cannot be reached."""


class WAApiError(WAClientError):
    """Raised when the server returns a non-success HTTP status."""

    def __init__(self, status: int, detail: str, endpoint: str = "") -> None:
        self.status = status
        self.detail = detail
        self.endpoint = endpoint
        super().__init__(f"{endpoint or 'API'} failed ({status}): {detail}")