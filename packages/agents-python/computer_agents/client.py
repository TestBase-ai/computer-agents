"""ComputerAgentsClient - The Official Computer Agents Python SDK.

A clean, simple SDK for interacting with the Computer Agents Cloud API.
Provides typed access to all API resources with streaming support.

Example::

    from computer_agents import ComputerAgentsClient

    client = ComputerAgentsClient()

    # Execute a task — that's it. No setup needed.
    result = client.run("Create a REST API with Flask")
    print(result.content)

    # With streaming events
    result = client.run(
        "Build a web scraper",
        on_event=lambda e: print(e["type"]),
    )

    # Continue the conversation
    follow_up = client.run("Add error handling", thread_id=result.thread_id)
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Callable

from ._api_client import ApiClient
from .resources import (
    AgentRuntimesResource,
    AgentsResource,
    AuthResource,
    BillingResource,
    BudgetResource,
    DatabasesResource,
    EnvironmentsResource,
    FilesResource,
    FunctionsResource,
    GitResource,
    OrchestrationsResource,
    ProjectsResource,
    ResourcesResource,
    WebAppsResource,
    SchedulesResource,
    SendMessageResult,
    SkillsResource,
    ThreadsResource,
    TriggersResource,
)
from .types import Environment, HealthCheck, Metrics, Project


@dataclass
class RunResult:
    """Result from the :meth:`ComputerAgentsClient.run` method."""

    content: str
    """The final response content."""

    thread_id: str
    """The thread ID (for continuing conversations)."""

    run: dict[str, Any] | None = None
    """Run details if available."""


class ComputerAgentsClient:
    """Complete SDK for the Computer Agents Cloud API.

    This is the main entry point for the SDK. It provides access to all API
    resources through typed methods:

    - ``threads`` -- Conversation management with SSE streaming
    - ``environments`` / ``computers`` -- Computer configuration and lifecycle
    - ``resources`` -- Web apps, functions, auth modules, and runtimes
    - ``web_apps`` / ``functions`` / ``auth`` / ``runtimes`` -- Product-shaped resource managers
    - ``databases`` -- Managed database surfaces
    - ``skills`` -- Custom ACP skills
    - ``agents`` -- Agent configuration
    - ``files`` -- File management in computer workspaces
    - ``schedules`` -- Scheduled task management
    - ``triggers`` -- Event-driven triggers
    - ``orchestrations`` -- Agent-to-agent orchestration
    - ``budget`` -- Budget and usage tracking
    - ``billing`` -- Billing records and statistics
    - ``git`` -- Git operations on computers (compatibility helper)

    For simple use cases, use the :meth:`run` method which handles thread
    creation and streaming automatically.

    Args:
        api_key: API key for authentication. Falls back to
            ``COMPUTER_AGENTS_API_KEY`` environment variable.
        base_url: Base URL for the API. Defaults to
            ``https://api.computer-agents.com``.
        timeout: Request timeout in seconds. Defaults to 60.
        debug: Enable debug logging. Defaults to False.
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
        debug: bool = False,
    ) -> None:
        resolved_key = (
            api_key
            or os.environ.get("COMPUTER_AGENTS_API_KEY")
            or os.environ.get("TESTBASE_API_KEY")
        )

        if not resolved_key:
            raise ValueError(
                "ComputerAgentsClient requires an API key. Provide it via:\n"
                '1. Constructor: ComputerAgentsClient(api_key="...")\n'
                "2. Environment variable: COMPUTER_AGENTS_API_KEY"
            )

        self.api = ApiClient(
            api_key=resolved_key,
            base_url=base_url,
            timeout=timeout,
            debug=debug,
        )

        # Initialize all resource managers
        self.threads = ThreadsResource(self.api)
        self.environments = EnvironmentsResource(self.api)
        self.computers = self.environments
        self.agents = AgentsResource(self.api)
        self.resources = ResourcesResource(self.api)
        self.web_apps = WebAppsResource(self.api)
        self.functions = FunctionsResource(self.api)
        self.auth = AuthResource(self.api)
        self.runtimes = AgentRuntimesResource(self.api)
        self.agent_runtimes = self.runtimes
        self.databases = DatabasesResource(self.api)
        self.skills = SkillsResource(self.api)
        self.files = FilesResource(self.api)
        self.schedules = SchedulesResource(self.api)
        self.triggers = TriggersResource(self.api)
        self.orchestrations = OrchestrationsResource(self.api)
        self.budget = BudgetResource(self.api)
        self.billing = BillingResource(self.api)
        self.git = GitResource(self.api)
        self.projects = ProjectsResource(self.api)

        # Cached default environment (populated on first run without environment_id)
        self._default_environment_id: str | None = None

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self.api.close()

    def __enter__(self) -> "ComputerAgentsClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    # =========================================================================
    # High-Level Convenience Methods
    # =========================================================================

    def run(
        self,
        task: str,
        environment_id: str | None = None,
        *,
        computer_id: str | None = None,
        thread_id: str | None = None,
        agent_config: dict[str, Any] | None = None,
        on_event: Callable[[dict[str, Any]], None] | None = None,
        timeout: float | None = None,
    ) -> RunResult:
        """Execute a task with automatic thread management.

        This is the simplest way to run an agent task. It handles:
        - Auto-creating a default environment (if ``environment_id`` not provided)
        - Creating a thread (if ``thread_id`` not provided)
        - Sending the message with SSE streaming
        - Returning the result with thread ID for follow-ups

        Args:
            task: The task to execute (e.g. ``"Create a REST API with Flask"``).
            environment_id: Environment ID to execute in. If not provided,
                a default environment is created automatically.
            thread_id: Thread ID to continue (optional).
            agent_config: Agent configuration override (model, instructions, etc.).
            on_event: Callback for streaming events.
            timeout: Execution timeout in seconds.

        Returns:
            :class:`RunResult` with ``content``, ``thread_id``, and ``run``.

        Example::

            # Simplest usage — no setup needed
            result = client.run("Create hello.py")
            print(result.content)

            # With streaming progress
            result = client.run(
                "Build a REST API",
                on_event=lambda e: print(e.get("type")),
            )

            # Continue the conversation
            follow_up = client.run(
                "Add authentication",
                thread_id=result.thread_id,
            )

            # Explicit environment
            result = client.run("Deploy to prod", environment_id="env_xxx")
        """
        # Auto-resolve environment/computer if not provided
        environment_id = computer_id or environment_id
        if environment_id is None:
            environment_id = self._ensure_default_environment()

        # Create or reuse thread
        if thread_id is None:
            thread = self.threads.create(environment_id=environment_id)
            thread_id = thread["id"]

        # Send message and stream response
        result = self.threads.send_message(
            thread_id,
            content=task,
            agent_config=agent_config,
            on_event=on_event,
            timeout=timeout,
        )

        return RunResult(
            content=result.content,
            thread_id=thread_id,
            run=result.run,
        )

    def _ensure_default_environment(self) -> str:
        """Return the cached default environment ID, creating one if needed."""
        if self._default_environment_id is not None:
            return self._default_environment_id

        environments = self.environments.list()
        default_env = next((e for e in environments if e.get("isDefault")), None)

        if default_env is None:
            default_env = self.environments.create(
                name="default",
                internet_access=True,
                is_default=True,
            )

        self._default_environment_id = default_env["id"]
        return self._default_environment_id

    def quick_setup(
        self,
        *,
        internet_access: bool = True,
        environment_name: str | None = None,
        computer_name: str | None = None,
    ) -> dict[str, Any]:
        """Quick setup with default environment.

        Creates a default environment if none exists, returning both
        the project and environment ready for execution.

        .. note::
            You usually don't need to call this directly. ``run()`` auto-creates
            a default environment when ``environment_id`` is omitted.

        Returns:
            Dict with ``project``, ``environment``, and ``computer`` keys.

        Example::

            setup = client.quick_setup(internet_access=True)
            env_id = setup["environment"]["id"]
        """
        project = self.projects.get()

        environments = self.environments.list()
        default_env = next((e for e in environments if e.get("isDefault")), None)

        if default_env is None:
            default_env = self.environments.create(
                name=computer_name or environment_name or "default",
                internet_access=internet_access,
                is_default=True,
            )

        return {"project": project, "environment": default_env, "computer": default_env}

    # =========================================================================
    # Health & Monitoring
    # =========================================================================

    def health(self) -> HealthCheck:
        """Check API health status."""
        return self.api.get("/health")

    def metrics(self) -> Metrics:
        """Get API metrics."""
        return self.api.get("/metrics")

    @property
    def base_url(self) -> str:
        """Get API base URL."""
        return self.api.base_url
