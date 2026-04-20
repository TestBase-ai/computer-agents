"""Databases resource manager."""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient


class DatabasesResource:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(self, **params: Any) -> dict[str, Any]:
        resp = self._client.post("/databases", params)
        return resp["database"]

    def list(self, *, project_id: str | None = None) -> list[dict[str, Any]]:
        query = {"projectId": project_id} if project_id is not None else None
        resp = self._client.get("/databases", query=query)
        return resp["databases"]

    def get(self, database_id: str) -> dict[str, Any]:
        resp = self._client.get(f"/databases/{database_id}")
        return resp["database"]

    def update(self, database_id: str, **params: Any) -> dict[str, Any]:
        resp = self._client.patch(f"/databases/{database_id}", params)
        return resp["database"]

    def delete(self, database_id: str) -> bool:
        resp = self._client.delete(f"/databases/{database_id}")
        return bool(resp.get("success") or resp.get("deleted"))

    def get_analytics(self, database_id: str) -> dict[str, Any]:
        return self._client.get(f"/databases/{database_id}/analytics")

    def list_collections(self, database_id: str) -> list[dict[str, Any]]:
        resp = self._client.get(f"/databases/{database_id}/collections")
        return resp["collections"]

    def create_collection(
        self,
        database_id: str,
        *,
        name: str,
        description: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"name": name}
        if description is not None:
            body["description"] = description
        resp = self._client.post(f"/databases/{database_id}/collections", body)
        return resp["collection"]

    def delete_collection(self, database_id: str, collection_id: str) -> bool:
        resp = self._client.delete(f"/databases/{database_id}/collections/{collection_id}")
        return bool(resp.get("success") or resp.get("deleted"))

    def list_documents(
        self,
        database_id: str,
        collection_id: str,
        *,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        query = {"limit": limit} if limit is not None else None
        resp = self._client.get(
            f"/databases/{database_id}/collections/{collection_id}/documents",
            query=query,
        )
        return resp["documents"]

    def create_document(
        self,
        database_id: str,
        collection_id: str,
        *,
        data: dict[str, Any],
        id: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"data": data}
        if id is not None:
            body["id"] = id
        resp = self._client.post(
            f"/databases/{database_id}/collections/{collection_id}/documents",
            body,
        )
        return resp["document"]

    def get_document(self, database_id: str, collection_id: str, document_id: str) -> dict[str, Any]:
        resp = self._client.get(
            f"/databases/{database_id}/collections/{collection_id}/documents/{document_id}"
        )
        return resp["document"]

    def update_document(
        self,
        database_id: str,
        collection_id: str,
        document_id: str,
        *,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        resp = self._client.put(
            f"/databases/{database_id}/collections/{collection_id}/documents/{document_id}",
            {"data": data},
        )
        return resp["document"]

    def delete_document(self, database_id: str, collection_id: str, document_id: str) -> bool:
        resp = self._client.delete(
            f"/databases/{database_id}/collections/{collection_id}/documents/{document_id}"
        )
        return bool(resp.get("success") or resp.get("deleted"))
