"""Threads resource manager.

Handles conversation threads including CRUD operations,
message execution with SSE streaming, and conversation history.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import quote

from .._api_client import ApiClient
from ..types import (
    CopyThreadParams,
    MessageStreamEvent,
    ResearchSession,
    SearchThreadsParams,
    SearchThreadsResponse,
    Thread,
    ThreadLogEntry,
    ThreadMessage,
)


@dataclass
class SendMessageResult:
    """Result from sending a message to a thread."""

    content: str
    """The final response content."""

    events: list[dict[str, Any]] = field(default_factory=list)
    """All SSE events received during streaming."""

    run: Optional[dict[str, Any]] = None
    """Run details if available."""


class ThreadsResource:
    """Thread (conversation) management.

    Create threads for multi-turn conversations with agents.
    Use :meth:`send_message` for SSE streaming execution.

    Example::

        thread = client.threads.create(environment_id="env_xxx")
        result = client.threads.send_message(
            thread["id"],
            content="Fix the TypeScript errors",
            on_event=lambda e: print(e),
        )
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def create(
        self,
        environment_id: str,
        *,
        agent_id: str | None = None,
        title: str | None = None,
    ) -> Thread:
        """Create a new thread."""
        body: dict[str, Any] = {"environmentId": environment_id}
        if agent_id is not None:
            body["agentId"] = agent_id
        if title is not None:
            body["title"] = title
        resp = self._client.post("/threads", body)
        return resp["thread"]

    def list(
        self,
        *,
        environment_id: str | None = None,
        status: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> dict[str, Any]:
        """List threads.

        Returns dict with ``data``, ``hasMore``, ``total`` keys.
        """
        query: dict[str, Any] = {}
        if environment_id is not None:
            query["environmentId"] = environment_id
        if status is not None:
            query["status"] = status
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get("/threads", query=query)
        return {
            "data": resp["data"],
            "hasMore": resp.get("has_more", False),
            "total": resp.get("total_count", 0),
        }

    def get(self, thread_id: str) -> Thread:
        """Get a thread by ID with full message history."""
        resp = self._client.get(f"/threads/{thread_id}")
        return resp["thread"]

    def update(self, thread_id: str, **params: Any) -> Thread:
        """Update a thread.

        Args:
            thread_id: Thread ID.
            title: New title.
            status: New status.
        """
        body: dict[str, Any] = {}
        if "title" in params:
            body["title"] = params["title"]
        if "status" in params:
            body["status"] = params["status"]
        resp = self._client.patch(f"/threads/{thread_id}", body)
        return resp["thread"]

    def delete(self, thread_id: str) -> None:
        """Delete a thread (soft delete)."""
        self._client.delete(f"/threads/{thread_id}")

    def get_messages(self, thread_id: str) -> dict[str, Any]:
        """Get message history for a thread.

        Returns dict with ``data``, ``hasMore``, ``total`` keys.
        """
        resp = self._client.get(f"/threads/{thread_id}/messages")
        return {
            "data": resp["data"],
            "hasMore": resp.get("has_more", False),
            "total": resp.get("total_count", 0),
        }

    def send_message(
        self,
        thread_id: str,
        *,
        content: str,
        agent_config: dict[str, Any] | None = None,
        mcp_servers: list[dict[str, Any]] | None = None,
        env_vars: dict[str, str] | None = None,
        secrets: list[dict[str, str]] | None = None,
        setup_scripts: list[str] | None = None,
        internet_access: bool | None = None,
        attachments: list[Any] | None = None,
        on_event: Callable[[dict[str, Any]], None] | None = None,
        timeout: float | None = None,
    ) -> SendMessageResult:
        """Send a message to a thread and stream the response.

        Example::

            result = client.threads.send_message(
                "thread_456",
                content="Create a REST API with Flask",
                on_event=lambda event: print(event["type"]),
            )
            print("Response:", result.content)
        """
        body: dict[str, Any] = {"content": content}
        if agent_config is not None:
            body["agentConfig"] = agent_config
        if mcp_servers is not None:
            body["mcpServers"] = mcp_servers
        if env_vars is not None:
            body["envVars"] = env_vars
        if secrets is not None:
            body["secrets"] = secrets
        if setup_scripts is not None:
            body["setupScripts"] = setup_scripts
        if internet_access is not None:
            body["internetAccess"] = internet_access
        if attachments is not None:
            body["attachments"] = attachments

        events: list[dict[str, Any]] = []
        final_content = ""
        run_details: dict[str, Any] | None = None

        for event in self._client.request_stream(
            "POST",
            f"/threads/{thread_id}/messages",
            body=body,
            timeout=timeout or 600.0,
        ):
            events.append(event)

            if on_event is not None:
                on_event(event)

            event_type = event.get("type", "")
            if event_type == "response.completed":
                response_data = event.get("response", {})
                final_content = response_data.get("content", "")
            elif event_type == "stream.completed":
                run_details = event.get("run")
            elif event_type == "stream.error":
                raise Exception(
                    event.get("message") or event.get("error", "Stream error")
                )

        return SendMessageResult(
            content=final_content,
            events=events,
            run=run_details,
        )

    def copy(
        self,
        thread_id: str,
        *,
        title: str | None = None,
    ) -> Thread:
        """Copy a thread with all its conversation messages.

        Example::

            copy = client.threads.copy("thread_abc", title="My experiment v2")
        """
        body: dict[str, Any] | None = None
        if title is not None:
            body = {"title": title}
        resp = self._client.post(f"/threads/{thread_id}/copy", body)
        return resp["thread"]

    def search(
        self,
        query: str,
        *,
        environment_id: str | None = None,
        status: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        include_messages: bool | None = None,
    ) -> SearchThreadsResponse:
        """Search threads by text query."""
        body: dict[str, Any] = {"query": query}
        if environment_id is not None:
            body["environmentId"] = environment_id
        if status is not None:
            body["status"] = status
        if limit is not None:
            body["limit"] = limit
        if offset is not None:
            body["offset"] = offset
        if include_messages is not None:
            body["includeMessages"] = include_messages
        return self._client.post("/threads/search", body)

    def get_logs(self, thread_id: str) -> list[ThreadLogEntry]:
        """Get execution logs for a thread."""
        resp = self._client.get(f"/threads/{thread_id}/logs")
        return resp["logs"]

    def get_status(self, thread_id: str) -> dict[str, Any]:
        """Get execution status for a thread."""
        return self._client.get(f"/threads/{thread_id}/status")

    def list_steps(
        self,
        thread_id: str,
        *,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get(f"/threads/{thread_id}/steps", query=query or None)
        return resp["data"]

    def list_step_files(
        self,
        thread_id: str,
        step_id: str,
        *,
        prefix: str | None = None,
    ) -> list[dict[str, Any]]:
        query = {"prefix": prefix} if prefix is not None else None
        resp = self._client.get(f"/threads/{thread_id}/steps/{step_id}/files", query=query)
        return resp["data"]

    def get_step_diff(
        self,
        thread_id: str,
        step_id: str,
        *,
        path: str | None = None,
    ) -> dict[str, Any]:
        query = {"path": path} if path is not None else None
        return self._client.get(f"/threads/{thread_id}/steps/{step_id}/diff", query=query)

    def get_step_file(self, thread_id: str, step_id: str, *, path: str) -> dict[str, Any]:
        return self._client.get(
            f"/threads/{thread_id}/steps/{step_id}/file",
            query={"path": path},
        )

    def download_step_file(self, thread_id: str, step_id: str, *, path: str) -> bytes:
        encoded_path = quote(path, safe="")
        resp = self._client.request_raw(
            "GET",
            f"/threads/{thread_id}/steps/{step_id}/file/download?path={encoded_path}",
        )
        return resp.content

    def fork_from_step(self, thread_id: str, step_id: str, **params: Any) -> dict[str, Any]:
        return self._client.post(f"/threads/{thread_id}/steps/{step_id}/fork", params)

    def revert_to_step(self, thread_id: str, step_id: str, **params: Any) -> dict[str, Any]:
        return self._client.post(f"/threads/{thread_id}/steps/{step_id}/revert", params)

    def get_file_history(
        self,
        thread_id: str,
        *,
        path: str,
        limit: int | None = None,
        offset: int | None = None,
    ) -> dict[str, Any]:
        query: dict[str, Any] = {"path": path}
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get(f"/threads/{thread_id}/files/history", query=query)
        return {
            "data": resp["data"],
            "hasMore": resp.get("has_more", False),
            "total": resp.get("total_count", 0),
        }

    def fork_from_message(self, thread_id: str, **params: Any) -> dict[str, Any]:
        return self._client.post(f"/threads/{thread_id}/fork-from-message", params)

    def get_context_estimate(self, thread_id: str) -> dict[str, Any]:
        return self._client.get(f"/threads/{thread_id}/context")

    def get_context_details(self, thread_id: str) -> dict[str, Any]:
        return self._client.get(f"/threads/{thread_id}/context/details")

    def run_context_action(self, thread_id: str, *, action: str, prompt: str | None = None, title: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"action": action}
        if prompt is not None:
            body["prompt"] = prompt
        if title is not None:
            body["title"] = title
        return self._client.post(f"/threads/{thread_id}/context/actions", body)

    def generate_title(
        self,
        thread_id: str,
        *,
        message: str,
        content: str | None = None,
        task: str | None = None,
        force: bool | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"message": message}
        if content is not None:
            body["content"] = content
        if task is not None:
            body["task"] = task
        if force is not None:
            body["force"] = force
        return self._client.post(f"/threads/{thread_id}/generate-title", body)

    def get_diffs(self, thread_id: str) -> list[dict[str, Any]]:
        resp = self._client.get(f"/threads/{thread_id}/diffs")
        return resp.get("diffs") or resp.get("data") or []

    def list_research(self, thread_id: str) -> list[ResearchSession]:
        """List deep research sessions for a thread."""
        resp = self._client.get(f"/threads/{thread_id}/research")
        return resp["sessions"]

    def get_research(self, thread_id: str, session_id: str) -> ResearchSession:
        """Get a specific deep research session."""
        resp = self._client.get(f"/threads/{thread_id}/research/{session_id}")
        return resp["session"]

    def delete_research(self, thread_id: str, session_id: str) -> None:
        """Delete a deep research session."""
        self._client.delete(f"/threads/{thread_id}/research/{session_id}")

    def cancel(self, thread_id: str) -> None:
        """Cancel an in-progress message execution."""
        self._client.post(f"/threads/{thread_id}/cancel")

    def resume(self, thread_id: str) -> Thread:
        """Resume a thread."""
        resp = self._client.post(f"/threads/{thread_id}/resume")
        return resp["thread"]
