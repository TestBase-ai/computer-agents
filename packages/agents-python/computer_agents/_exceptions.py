"""Exception classes for the Computer Agents SDK."""

from __future__ import annotations

from typing import Any


class ApiClientError(Exception):
    """Error returned by the Computer Agents API.

    Attributes:
        message: Human-readable error message.
        status: HTTP status code.
        code: Machine-readable error code (e.g. ``"TIMEOUT"``).
        details: Additional error context from the API.
    """

    def __init__(
        self,
        message: str,
        status: int,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.details = details

    def __repr__(self) -> str:
        return f"ApiClientError(message={self.message!r}, status={self.status}, code={self.code!r})"
