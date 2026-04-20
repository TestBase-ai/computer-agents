"""Resources resource manager.

Managed resources include web apps, functions, auth modules, and agent runtimes.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

from .._api_client import ApiClient


class ResourcesResource:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(self, **params: Any) -> dict[str, Any]:
        resp = self._client.post("/servers", params)
        return resp["server"]

    def list(
        self,
        *,
        project_id: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if project_id is not None:
            query["projectId"] = project_id
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get("/servers", query=query or None)
        return resp.get("data") or resp.get("servers") or []

    def get(self, server_id: str) -> dict[str, Any]:
        resp = self._client.get(f"/servers/{server_id}")
        return resp["server"]

    def update(self, server_id: str, **params: Any) -> dict[str, Any]:
        resp = self._client.patch(f"/servers/{server_id}", params)
        return resp["server"]

    def delete(self, server_id: str) -> bool:
        resp = self._client.delete(f"/servers/{server_id}")
        return bool(resp.get("deleted"))

    def deploy(self, server_id: str) -> dict[str, Any]:
        return self._client.post(f"/servers/{server_id}/deploy", {})

    def invoke(self, server_id: str, **params: Any) -> dict[str, Any]:
        return self._client.post(f"/servers/{server_id}/invoke", params)

    def create_ai_chat_app_template(self, **params: Any) -> dict[str, Any]:
        return self._client.post("/servers/templates/ai-chat-app", params)

    def get_analytics(self, server_id: str) -> dict[str, Any]:
        return self._client.get(f"/servers/{server_id}/analytics")

    def get_logs(
        self,
        server_id: str,
        *,
        kind: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if kind is not None:
            query["kind"] = kind
        if limit is not None:
            query["limit"] = limit
        resp = self._client.get(f"/servers/{server_id}/logs", query=query or None)
        return resp["logs"]

    def list_bindings(self, server_id: str) -> list[dict[str, Any]]:
        resp = self._client.get(f"/servers/{server_id}/bindings")
        return resp["bindings"]

    def upsert_binding(
        self,
        server_id: str,
        target_type: str,
        *,
        target_id: str,
        alias: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        body: dict[str, Any] = {"targetId": target_id}
        if alias is not None:
            body["alias"] = alias
        if metadata is not None:
            body["metadata"] = metadata
        resp = self._client.put(f"/servers/{server_id}/bindings/{target_type}", body)
        return resp["bindings"]

    def delete_binding(self, server_id: str, target_type: str) -> list[dict[str, Any]]:
        resp = self._client.delete(f"/servers/{server_id}/bindings/{target_type}")
        return resp["bindings"]

    def list_auth_users(
        self,
        server_id: str,
        *,
        limit: int | None = None,
        next_page_token: str | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if limit is not None:
            query["limit"] = limit
        if next_page_token is not None:
            query["nextPageToken"] = next_page_token
        resp = self._client.get(f"/servers/{server_id}/auth-users", query=query or None)
        return resp["users"]

    def create_auth_user(
        self,
        server_id: str,
        *,
        email: str,
        password: str,
        display_name: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"email": email, "password": password}
        if display_name is not None:
            body["displayName"] = display_name
        return self._client.post(f"/servers/{server_id}/auth-users", body)

    def sign_up(
        self,
        server_id: str,
        *,
        email: str,
        password: str,
        display_name: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"email": email, "password": password}
        if display_name is not None:
            body["displayName"] = display_name
        return self._client.post(f"/servers/{server_id}/auth/sign-up", body)

    def sign_in(self, server_id: str, *, email: str, password: str) -> dict[str, Any]:
        return self._client.post(f"/servers/{server_id}/auth/sign-in", {"email": email, "password": password})

    def get_context(self, server_id: str) -> dict[str, Any]:
        return self._client.get(f"/servers/{server_id}/context")

    def get_runtime_config(self, server_id: str) -> dict[str, Any]:
        return self._client.get(f"/servers/{server_id}/runtime-config")

    def get_runtime(self, server_id: str) -> dict[str, Any]:
        return self._client.get(f"/servers/{server_id}/runtime")

    def list_files(
        self,
        server_id: str,
        *,
        path: str | None = None,
        depth: int | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if path is not None:
            query["path"] = path
        if depth is not None:
            query["depth"] = depth
        resp = self._client.get(f"/servers/{server_id}/files", query=query or None)
        return resp.get("files") or resp.get("data") or []

    def get_file_content(self, server_id: str, file_path: str) -> str:
        normalized = file_path.lstrip("/")
        encoded = "/".join(quote(part, safe="") for part in normalized.split("/"))
        resp = self._client.get(f"/servers/{server_id}/files/content/{encoded}")
        return resp["content"]

    def write_file_content(self, server_id: str, file_path: str, content: str) -> dict[str, Any]:
        normalized = file_path.lstrip("/")
        encoded = "/".join(quote(part, safe="") for part in normalized.split("/"))
        return self._client.put(f"/servers/{server_id}/files/content/{encoded}", {"content": content})

    def download_file(self, server_id: str, file_path: str) -> bytes:
        normalized = file_path.lstrip("/")
        encoded = "/".join(quote(part, safe="") for part in normalized.split("/"))
        resp = self._client.request_raw("GET", f"/servers/{server_id}/files/download/{encoded}")
        return resp.content

    def upload_file(
        self,
        server_id: str,
        *,
        filename: str,
        content: str | bytes,
        path: str | None = None,
        content_type: str | None = None,
    ) -> dict[str, Any]:
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
            f"/servers/{server_id}/files/upload",
            data=data,
            files=files,
        )

    def delete_file(self, server_id: str, file_path: str) -> dict[str, Any]:
        normalized = file_path.lstrip("/")
        encoded = "/".join(quote(part, safe="") for part in normalized.split("/"))
        return self._client.delete(f"/servers/{server_id}/files/{encoded}")
