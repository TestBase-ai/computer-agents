"""Projects resource manager.

Handles project-related API operations.
Each API key is bound to exactly one project.
"""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from ..types import FileEntry, Project


class ProjectsResource:
    """Project access (internal).

    Each API key is bound to exactly one project.
    Use ``client.files`` for file operations instead.
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def get(self) -> Project:
        """Get the current project (bound to this API key)."""
        resp = self._client.get("/project")
        return resp["project"]

    def update(self, **params: Any) -> Project:
        """Update the current project."""
        body: dict[str, Any] = {}
        key_map = {
            "name": "name",
            "description": "description",
            "metadata": "metadata",
            "tags": "tags",
        }
        for py_key, api_key in key_map.items():
            if py_key in params:
                body[api_key] = params[py_key]
        resp = self._client.patch("/project", body)
        return resp["project"]

    def sync(
        self,
        *,
        added: list[str] | None = None,
        modified: list[str] | None = None,
        deleted: list[str] | None = None,
    ) -> dict[str, Any]:
        """Sync project with cloud storage."""
        changes: dict[str, list[str]] = {}
        if added is not None:
            changes["added"] = added
        if modified is not None:
            changes["modified"] = modified
        if deleted is not None:
            changes["deleted"] = deleted
        return self._client.post("/project/sync", {"changes": changes or None})
