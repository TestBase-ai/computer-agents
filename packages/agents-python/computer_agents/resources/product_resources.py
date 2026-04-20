"""Product-shaped resource managers built on top of the generic resources API."""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from .resources import ResourcesResource


class _KindScopedResource:
    def __init__(self, client: ApiClient, kind: str) -> None:
        self._resources = ResourcesResource(client)
        self._kind = kind

    def create(self, **params: Any) -> dict[str, Any]:
        body = dict(params)
        body["kind"] = self._kind
        return self._resources.create(**body)

    def list(
        self,
        *,
        project_id: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[dict[str, Any]]:
        resources = self._resources.list(project_id=project_id, limit=limit, offset=offset)
        return [resource for resource in resources if resource.get("kind") == self._kind]

    def get(self, server_id: str) -> dict[str, Any]:
        return self._resources.get(server_id)

    def update(self, server_id: str, **params: Any) -> dict[str, Any]:
        body = dict(params)
        body["kind"] = self._kind
        return self._resources.update(server_id, **body)

    def delete(self, server_id: str) -> bool:
        return self._resources.delete(server_id)

    def deploy(self, server_id: str) -> dict[str, Any]:
        return self._resources.deploy(server_id)

    def invoke(self, server_id: str, **params: Any) -> dict[str, Any]:
        return self._resources.invoke(server_id, **params)

    def get_analytics(self, server_id: str) -> dict[str, Any]:
        return self._resources.get_analytics(server_id)

    def get_logs(
        self,
        server_id: str,
        *,
        kind: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        return self._resources.get_logs(server_id, kind=kind, limit=limit)

    def list_bindings(self, server_id: str) -> list[dict[str, Any]]:
        return self._resources.list_bindings(server_id)

    def upsert_binding(
        self,
        server_id: str,
        target_type: str,
        *,
        target_id: str,
        alias: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        return self._resources.upsert_binding(
            server_id,
            target_type,
            target_id=target_id,
            alias=alias,
            metadata=metadata,
        )

    def delete_binding(self, server_id: str, target_type: str) -> list[dict[str, Any]]:
        return self._resources.delete_binding(server_id, target_type)

    def get_context(self, server_id: str) -> dict[str, Any]:
        return self._resources.get_context(server_id)

    def get_runtime_config(self, server_id: str) -> dict[str, Any]:
        return self._resources.get_runtime_config(server_id)

    def get_runtime(self, server_id: str) -> dict[str, Any]:
        return self._resources.get_runtime(server_id)

    def list_files(
        self,
        server_id: str,
        *,
        path: str | None = None,
        depth: int | None = None,
    ) -> list[dict[str, Any]]:
        return self._resources.list_files(server_id, path=path, depth=depth)

    def get_file_content(self, server_id: str, file_path: str) -> str:
        return self._resources.get_file_content(server_id, file_path)

    def write_file_content(self, server_id: str, file_path: str, content: str) -> dict[str, Any]:
        return self._resources.write_file_content(server_id, file_path, content)

    def download_file(self, server_id: str, file_path: str) -> bytes:
        return self._resources.download_file(server_id, file_path)

    def upload_file(
        self,
        server_id: str,
        *,
        filename: str,
        content: str | bytes,
        path: str | None = None,
        content_type: str | None = None,
    ) -> dict[str, Any]:
        return self._resources.upload_file(
            server_id,
            filename=filename,
            content=content,
            path=path,
            content_type=content_type,
        )

    def delete_file(self, server_id: str, file_path: str) -> dict[str, Any]:
        return self._resources.delete_file(server_id, file_path)


class WebAppsResource(_KindScopedResource):
    def __init__(self, client: ApiClient) -> None:
        super().__init__(client, "web_app")

    def create_ai_chat_app_template(self, **params: Any) -> dict[str, Any]:
        return self._resources.create_ai_chat_app_template(**params)


class FunctionsResource(_KindScopedResource):
    def __init__(self, client: ApiClient) -> None:
        super().__init__(client, "function")


class AuthResource(_KindScopedResource):
    def __init__(self, client: ApiClient) -> None:
        super().__init__(client, "auth")

    def list_users(
        self,
        server_id: str,
        *,
        limit: int | None = None,
        next_page_token: str | None = None,
    ) -> list[dict[str, Any]]:
        return self._resources.list_auth_users(server_id, limit=limit, next_page_token=next_page_token)

    def create_user(
        self,
        server_id: str,
        *,
        email: str,
        password: str,
        display_name: str | None = None,
    ) -> dict[str, Any]:
        return self._resources.create_auth_user(
            server_id,
            email=email,
            password=password,
            display_name=display_name,
        )

    def sign_up(
        self,
        server_id: str,
        *,
        email: str,
        password: str,
        display_name: str | None = None,
    ) -> dict[str, Any]:
        return self._resources.sign_up(
            server_id,
            email=email,
            password=password,
            display_name=display_name,
        )

    def sign_in(self, server_id: str, *, email: str, password: str) -> dict[str, Any]:
        return self._resources.sign_in(server_id, email=email, password=password)


class AgentRuntimesResource(_KindScopedResource):
    def __init__(self, client: ApiClient) -> None:
        super().__init__(client, "agent_runtime")


RuntimesResource = AgentRuntimesResource
