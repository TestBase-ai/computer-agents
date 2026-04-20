"""Files resource manager.

Handles file operations within environment workspaces.
Files are scoped to environments.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

from .._api_client import ApiClient


class FilesResource:
    """File operations on environment workspaces.

    Upload, download, and manage files in environment workspaces.

    Example::

        files = client.files.list("env_xxx")
        content = client.files.get_file("env_xxx", "src/app.py")
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def list(self, environment_id: str) -> dict[str, Any]:
        """List all files in an environment workspace.

        Returns dict with ``environmentId`` and ``files`` keys.
        """
        resp = self._client.get(f"/environments/{environment_id}/files")
        return {
            "environmentId": environment_id,
            "files": resp["data"],
        }

    def list_files(self, environment_id: str) -> list[dict[str, Any]]:
        """List files (returns just the file list)."""
        resp = self._client.get(f"/environments/{environment_id}/files")
        return resp["data"]

    def get_file(self, environment_id: str, file_path: str) -> str:
        """Download a file as text.

        Args:
            environment_id: Environment ID.
            file_path: Path to the file (e.g. ``"src/app.py"``).
        """
        normalized = file_path.lstrip("/")
        encoded = "/".join(quote(part, safe="") for part in normalized.split("/"))
        resp = self._client.request_raw(
            "GET",
            f"/environments/{environment_id}/files/{encoded}",
        )
        return resp.text

    def download_file(self, environment_id: str, file_path: str) -> bytes:
        """Download a file as bytes."""
        normalized = file_path.lstrip("/")
        encoded = "/".join(quote(part, safe="") for part in normalized.split("/"))
        resp = self._client.request_raw(
            "GET",
            f"/environments/{environment_id}/files/{encoded}",
        )
        return resp.content

    def upload_file(
        self,
        environment_id: str,
        filename: str,
        content: str | bytes,
        *,
        path: str | None = None,
        content_type: str | None = None,
    ) -> dict[str, Any]:
        """Upload a file to an environment workspace.

        Example::

            client.files.upload_file(
                "env_xxx",
                filename="app.py",
                content='print("hello")',
                path="src",
            )
        """
        if isinstance(content, str):
            content_bytes = content.encode("utf-8")
        else:
            content_bytes = content

        data: dict[str, Any] = {}
        if path is not None:
            data["path"] = path

        files = {
            "file": (filename, content_bytes, content_type or "application/octet-stream"),
        }

        return self._client.request_form(
            "POST",
            f"/environments/{environment_id}/files/upload",
            data=data,
            files=files,
        )

    def delete_file(self, environment_id: str, file_path: str) -> dict[str, Any]:
        """Delete a file from an environment workspace."""
        normalized = file_path.lstrip("/")
        encoded = "/".join(quote(part, safe="") for part in normalized.split("/"))
        return self._client.delete(f"/environments/{environment_id}/files/{encoded}")

    def move_file(
        self,
        environment_id: str,
        source_path: str,
        dest_path: str,
    ) -> dict[str, Any]:
        """Move or rename a file.

        Example::

            client.files.move_file("env_xxx", "old.py", "new.py")
        """
        return self._client.post(
            f"/environments/{environment_id}/files/move",
            {"sourcePath": source_path, "destPath": dest_path},
        )

    def create_directory(
        self, environment_id: str, path: str
    ) -> dict[str, Any]:
        """Create a directory. Parent directories are created automatically."""
        normalized = path.lstrip("/")
        return self._client.post(
            f"/environments/{environment_id}/files/mkdir",
            {"path": normalized},
        )
