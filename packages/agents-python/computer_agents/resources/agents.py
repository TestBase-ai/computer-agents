"""Agents resource manager.

Handles agent configuration including CRUD operations
and model/skill configuration.
"""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from ..types import CloudAgent


class AgentsResource:
    """Agent configuration.

    Create and manage agent configurations, instructions, skills,
    and workspace model selection.

    Example::

        agent = client.agents.create(
            name="Code Assistant",
            model="claude-sonnet-4-5",
            instructions="You are a helpful coding assistant.",
        )
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(
        self,
        name: str,
        model: str,
        *,
        description: str | None = None,
        instructions: str | None = None,
        reasoning_effort: str | None = None,
        enabled_skills: list[str] | None = None,
        deep_research_model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> CloudAgent:
        """Create a new agent."""
        body: dict[str, Any] = {"name": name, "model": model}
        if description is not None:
            body["description"] = description
        if instructions is not None:
            body["instructions"] = instructions
        if reasoning_effort is not None:
            body["reasoningEffort"] = reasoning_effort
        if enabled_skills is not None:
            body["enabledSkills"] = enabled_skills
        if deep_research_model is not None:
            body["deepResearchModel"] = deep_research_model
        if metadata is not None:
            body["metadata"] = metadata
        resp = self._client.post("/agents", body)
        return resp["agent"]

    def list(self) -> list[CloudAgent]:
        """List all agents."""
        resp = self._client.get("/agents")
        return resp["data"]

    def list_models(self) -> dict[str, Any]:
        """List built-in and external model entries available to this workspace."""
        return self._client.get("/agents/models")

    def get(self, agent_id: str) -> CloudAgent:
        """Get an agent by ID."""
        resp = self._client.get(f"/agents/{agent_id}")
        return resp["agent"]

    def update(self, agent_id: str, **params: Any) -> CloudAgent:
        """Update an agent.

        Args:
            agent_id: Agent ID.
            name: New name.
            description: New description.
            model: New model.
            instructions: New instructions.
            reasoning_effort: New reasoning effort.
            enabled_skills: New list of enabled skills.
            metadata: New metadata.
        """
        body: dict[str, Any] = {}
        key_map = {
            "name": "name",
            "description": "description",
            "model": "model",
            "instructions": "instructions",
            "reasoning_effort": "reasoningEffort",
            "enabled_skills": "enabledSkills",
            "metadata": "metadata",
        }
        for py_key, api_key in key_map.items():
            if py_key in params:
                body[api_key] = params[py_key]
        resp = self._client.patch(f"/agents/{agent_id}", body)
        return resp["agent"]

    def get_analytics(self, agent_id: str) -> dict[str, Any]:
        """Summarize recent activity for an agent or team."""
        return self._client.get(f"/agents/{agent_id}/analytics")

    def delete(self, agent_id: str, *, hard: bool = False) -> None:
        """Delete an agent."""
        path = f"/agents/{agent_id}"
        if hard:
            path += "?hard=true"
        self._client.delete(path)
