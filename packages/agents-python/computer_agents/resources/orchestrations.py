"""Orchestrations resource manager.

Handles agent-to-agent orchestration including CRUD operations,
running orchestrations, and tracking run status.
"""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from ..types import Orchestration, OrchestrationRun


class OrchestrationsResource:
    """Agent-to-agent orchestration management.

    Example::

        orch = client.orchestrations.create(
            name="Code Review Pipeline",
            environment_id="env_xxx",
            strategy="sequential",
            steps=[
                {"agentId": "agent_a", "name": "Write code"},
                {"agentId": "agent_b", "name": "Review code", "dependsOn": ["step_1"]},
            ],
        )
        run = client.orchestrations.run(orch["id"])
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(
        self,
        name: str,
        environment_id: str,
        strategy: str,
        steps: list[dict[str, Any]],
        *,
        coordinator_agent_id: str | None = None,
    ) -> Orchestration:
        """Create a new orchestration."""
        body: dict[str, Any] = {
            "name": name,
            "environmentId": environment_id,
            "strategy": strategy,
            "steps": steps,
        }
        if coordinator_agent_id is not None:
            body["coordinatorAgentId"] = coordinator_agent_id
        resp = self._client.post("/orchestrations", body)
        return resp["orchestration"]

    def list(
        self,
        *,
        environment_id: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[Orchestration]:
        """List all orchestrations."""
        query: dict[str, Any] = {}
        if environment_id is not None:
            query["environmentId"] = environment_id
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get("/orchestrations", query=query or None)
        return resp["data"]

    def get(self, orchestration_id: str) -> Orchestration:
        """Get an orchestration by ID."""
        resp = self._client.get(f"/orchestrations/{orchestration_id}")
        return resp["orchestration"]

    def update(self, orchestration_id: str, **params: Any) -> Orchestration:
        """Update an orchestration."""
        body: dict[str, Any] = {}
        key_map = {
            "name": "name",
            "strategy": "strategy",
            "coordinator_agent_id": "coordinatorAgentId",
            "steps": "steps",
        }
        for py_key, api_key in key_map.items():
            if py_key in params:
                body[api_key] = params[py_key]
        resp = self._client.patch(f"/orchestrations/{orchestration_id}", body)
        return resp["orchestration"]

    def delete(self, orchestration_id: str) -> None:
        """Delete an orchestration."""
        self._client.delete(f"/orchestrations/{orchestration_id}")

    # =========================================================================
    # Orchestration Runs
    # =========================================================================

    def run(
        self,
        orchestration_id: str,
        *,
        inputs: dict[str, Any] | None = None,
    ) -> OrchestrationRun:
        """Execute an orchestration."""
        body: dict[str, Any] | None = None
        if inputs is not None:
            body = {"inputs": inputs}
        resp = self._client.post(f"/orchestrations/{orchestration_id}/runs", body)
        return resp["run"]

    def get_run(
        self, orchestration_id: str, run_id: str
    ) -> OrchestrationRun:
        """Get a specific run."""
        resp = self._client.get(
            f"/orchestrations/{orchestration_id}/runs/{run_id}"
        )
        return resp["run"]

    def list_runs(
        self,
        orchestration_id: str,
        *,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[OrchestrationRun]:
        """List all runs for an orchestration."""
        query: dict[str, Any] = {}
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get(
            f"/orchestrations/{orchestration_id}/runs", query=query or None
        )
        return resp["data"]
