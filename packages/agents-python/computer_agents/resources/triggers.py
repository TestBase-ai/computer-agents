"""Triggers resource manager.

Handles event-driven trigger management including CRUD operations,
enable/disable control, testing, and execution history.
"""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from ..types import Trigger, TriggerExecution


class TriggersResource:
    """Event-driven trigger management.

    Example::

        trigger = client.triggers.create(
            name="On Push",
            environment_id="env_xxx",
            source="github",
            event="push",
            action={"type": "send_message", "message": "New push detected"},
        )
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(
        self,
        name: str,
        environment_id: str,
        source: str,
        event: str,
        action: dict[str, Any],
        *,
        agent_id: str | None = None,
        filters: dict[str, Any] | None = None,
        enabled: bool | None = None,
    ) -> Trigger:
        """Create a new trigger."""
        body: dict[str, Any] = {
            "name": name,
            "environmentId": environment_id,
            "source": source,
            "event": event,
            "action": action,
        }
        if agent_id is not None:
            body["agentId"] = agent_id
        if filters is not None:
            body["filters"] = filters
        if enabled is not None:
            body["enabled"] = enabled
        resp = self._client.post("/triggers", body)
        return resp["trigger"]

    def list(
        self,
        *,
        environment_id: str | None = None,
        enabled: bool | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[Trigger]:
        """List all triggers."""
        query: dict[str, Any] = {}
        if environment_id is not None:
            query["environmentId"] = environment_id
        if enabled is not None:
            query["enabled"] = enabled
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get("/triggers", query=query or None)
        return resp["data"]

    def get(self, trigger_id: str) -> Trigger:
        """Get a trigger by ID."""
        resp = self._client.get(f"/triggers/{trigger_id}")
        return resp["trigger"]

    def update(self, trigger_id: str, **params: Any) -> Trigger:
        """Update a trigger."""
        body: dict[str, Any] = {}
        key_map = {
            "name": "name",
            "agent_id": "agentId",
            "event": "event",
            "filters": "filters",
            "action": "action",
            "enabled": "enabled",
        }
        for py_key, api_key in key_map.items():
            if py_key in params:
                body[api_key] = params[py_key]
        resp = self._client.patch(f"/triggers/{trigger_id}", body)
        return resp["trigger"]

    def delete(self, trigger_id: str) -> None:
        """Delete a trigger."""
        self._client.delete(f"/triggers/{trigger_id}")

    # =========================================================================
    # Trigger Control
    # =========================================================================

    def enable(self, trigger_id: str) -> Trigger:
        """Enable a trigger."""
        resp = self._client.patch(f"/triggers/{trigger_id}/enable")
        return resp["trigger"]

    def disable(self, trigger_id: str) -> Trigger:
        """Disable a trigger."""
        resp = self._client.patch(f"/triggers/{trigger_id}/disable")
        return resp["trigger"]

    def test(
        self, trigger_id: str, payload: dict[str, Any] | None = None
    ) -> TriggerExecution:
        """Test-fire a trigger with an optional payload."""
        body = {"payload": payload} if payload else None
        resp = self._client.post(f"/triggers/{trigger_id}/test", body)
        return resp["execution"]

    # =========================================================================
    # Execution History
    # =========================================================================

    def list_executions(
        self,
        trigger_id: str,
        *,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[TriggerExecution]:
        """List past executions for a trigger."""
        query: dict[str, Any] = {}
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get(
            f"/triggers/{trigger_id}/executions", query=query or None
        )
        return resp["data"]
