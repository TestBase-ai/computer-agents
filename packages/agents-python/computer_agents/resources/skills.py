"""Skills resource manager."""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient


class SkillsResource:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(self, **params: Any) -> dict[str, Any]:
        resp = self._client.post("/skills", params)
        return resp["skill"]

    def list(
        self,
        *,
        category: str | None = None,
        is_active: bool | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if category is not None:
            query["category"] = category
        if is_active is not None:
            query["isActive"] = str(is_active).lower()
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get("/skills", query=query or None)
        return resp["data"]

    def get(self, skill_id: str) -> dict[str, Any]:
        resp = self._client.get(f"/skills/{skill_id}")
        return resp["skill"]

    def update(self, skill_id: str, **params: Any) -> dict[str, Any]:
        resp = self._client.patch(f"/skills/{skill_id}", params)
        return resp["skill"]

    def delete(self, skill_id: str) -> bool:
        resp = self._client.delete(f"/skills/{skill_id}")
        return bool(resp.get("success") or resp.get("deleted"))
