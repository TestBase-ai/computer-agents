"""Schedules resource manager.

Handles scheduled task management including CRUD operations
and schedule control (trigger/enable/disable).
"""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from ..types import Schedule


class SchedulesResource:
    """Scheduled task management.

    Example::

        schedule = client.schedules.create(
            name="Daily Report",
            agent_id="agent_xxx",
            agent_name="Reporter",
            task="Generate daily report",
            schedule_type="recurring",
            cron_expression="0 9 * * *",
        )
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(
        self,
        name: str,
        agent_id: str,
        agent_name: str,
        task: str,
        schedule_type: str,
        *,
        description: str | None = None,
        workspace_id: str | None = None,
        workspace_name: str | None = None,
        context_id: str | None = None,
        context_name: str | None = None,
        environment_id: str | None = None,
        environment_name: str | None = None,
        cron_expression: str | None = None,
        scheduled_time: str | None = None,
        timezone: str | None = None,
        enabled: bool | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Schedule:
        """Create a new schedule."""
        body: dict[str, Any] = {
            "name": name,
            "agentId": agent_id,
            "agentName": agent_name,
            "task": task,
            "scheduleType": schedule_type,
        }
        optionals = {
            "description": description,
            "workspaceId": workspace_id,
            "workspaceName": workspace_name,
            "contextId": context_id,
            "contextName": context_name,
            "environmentId": environment_id,
            "environmentName": environment_name,
            "cronExpression": cron_expression,
            "scheduledTime": scheduled_time,
            "timezone": timezone,
            "enabled": enabled,
            "metadata": metadata,
        }
        for key, val in optionals.items():
            if val is not None:
                body[key] = val
        resp = self._client.post("/schedules", body)
        return resp["schedule"]

    def list(
        self,
        *,
        enabled: bool | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[Schedule]:
        """List all schedules."""
        query: dict[str, Any] = {}
        if enabled is not None:
            query["enabled"] = enabled
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get("/schedules", query=query or None)
        return resp["data"]

    def get(self, schedule_id: str) -> Schedule:
        """Get a schedule by ID."""
        resp = self._client.get(f"/schedules/{schedule_id}")
        return resp["schedule"]

    def update(self, schedule_id: str, **params: Any) -> Schedule:
        """Update a schedule."""
        body: dict[str, Any] = {}
        key_map = {
            "name": "name",
            "description": "description",
            "task": "task",
            "cron_expression": "cronExpression",
            "scheduled_time": "scheduledTime",
            "timezone": "timezone",
            "enabled": "enabled",
            "metadata": "metadata",
        }
        for py_key, api_key in key_map.items():
            if py_key in params:
                body[api_key] = params[py_key]
        resp = self._client.patch(f"/schedules/{schedule_id}", body)
        return resp["schedule"]

    def delete(self, schedule_id: str) -> None:
        """Delete a schedule."""
        self._client.delete(f"/schedules/{schedule_id}")

    # =========================================================================
    # Schedule Control
    # =========================================================================

    def trigger(self, schedule_id: str) -> dict[str, Any]:
        """Manually trigger a schedule."""
        return self._client.post(f"/schedules/{schedule_id}/trigger")

    def enable(self, schedule_id: str) -> Schedule:
        """Enable a schedule."""
        resp = self._client.patch(f"/schedules/{schedule_id}/enable")
        return resp["schedule"]

    def disable(self, schedule_id: str) -> Schedule:
        """Disable a schedule."""
        resp = self._client.patch(f"/schedules/{schedule_id}/disable")
        return resp["schedule"]
