"""Environments resource manager.

Handles environment management including CRUD operations,
container lifecycle, runtime/package management, and build management.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

from .._api_client import ApiClient
from ..types import (
    AvailableRuntimes,
    BuildLogsResult,
    BuildResult,
    BuildStatusResult,
    ContainerStatus,
    DockerfileResult,
    Environment,
    InstallPackagesResult,
    PackagesConfig,
    RuntimeConfig,
    StartContainerResult,
    TestBuildResult,
    ValidateDockerfileResult,
    EnvironmentSnapshot,
    SnapshotFileEntry,
    EnvironmentSnapshotDiffResponse,
    EnvironmentSnapshotFileResponse,
    EnvironmentForkFromSnapshotResponse,
    EnvironmentChangeListResponse,
    EnvironmentChangeOperation,
)


class EnvironmentsResource:
    """Environment management.

    Create and manage ACP computers.
    The raw API still uses the term ``environment`` in route names.

    Example::

        env = client.environments.create(
            name="production",
            internet_access=True,
        )
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    # =========================================================================
    # CRUD
    # =========================================================================

    def create(
        self,
        name: str,
        *,
        project_id: str | None = None,
        description: str | None = None,
        runtimes: dict[str, str] | None = None,
        packages: dict[str, list[str]] | None = None,
        dockerfile_extensions: str | None = None,
        environment_variables: list[dict[str, str]] | None = None,
        secrets: list[dict[str, str]] | None = None,
        setup_scripts: list[str] | None = None,
        mcp_servers: list[dict[str, Any]] | None = None,
        documentation: list[str] | None = None,
        internet_access: bool | None = None,
        is_default: bool | None = None,
        compute_profile: str | None = None,
        gui_enabled: bool | None = None,
        office_apps_enabled: bool | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Environment:
        """Create a new environment.

        Use ``compute_profile`` for ACP computer sizing presets:
        ``lite``, ``standard``, ``power``, or ``desktop``.
        """
        body: dict[str, Any] = {"name": name}
        if project_id is not None:
            body["projectId"] = project_id
        if description is not None:
            body["description"] = description
        if runtimes is not None:
            body["runtimes"] = runtimes
        if packages is not None:
            body["packages"] = packages
        if dockerfile_extensions is not None:
            body["dockerfileExtensions"] = dockerfile_extensions
        if environment_variables is not None:
            body["environmentVariables"] = environment_variables
        if secrets is not None:
            body["secrets"] = secrets
        if setup_scripts is not None:
            body["setupScripts"] = setup_scripts
        if mcp_servers is not None:
            body["mcpServers"] = mcp_servers
        if documentation is not None:
            body["documentation"] = documentation
        if internet_access is not None:
            body["internetAccess"] = internet_access
        if is_default is not None:
            body["isDefault"] = is_default
        if compute_profile is not None:
            body["computeProfile"] = compute_profile
        if gui_enabled is not None:
            body["guiEnabled"] = gui_enabled
        if office_apps_enabled is not None:
            body["officeAppsEnabled"] = office_apps_enabled
        if metadata is not None:
            body["metadata"] = metadata
        resp = self._client.post("/environments", body)
        return resp["environment"]

    def list(
        self,
        *,
        is_active: bool | None = None,
        is_default: bool | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[Environment]:
        """List all environments."""
        query: dict[str, Any] = {}
        if is_active is not None:
            query["isActive"] = str(is_active).lower()
        if is_default is not None:
            query["isDefault"] = str(is_default).lower()
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        resp = self._client.get("/environments", query=query or None)
        return resp["data"]

    def get(self, environment_id: str) -> Environment:
        """Get an environment by ID."""
        resp = self._client.get(f"/environments/{environment_id}")
        return resp["environment"]

    def get_default(self) -> Environment:
        """Get the user's default environment. Creates one if it doesn't exist."""
        return self._client.get("/environments/default")

    def set_default(self, environment_id: str) -> Environment:
        """Mark an environment as the default computer for the current user."""
        resp = self._client.post(f"/environments/{environment_id}/set-default", {})
        return resp["environment"]

    def update(self, environment_id: str, **params: Any) -> Environment:
        """Update an environment.

        Accepts keyword arguments matching :class:`UpdateEnvironmentParams` fields
        in snake_case (e.g. ``internet_access=True``).
        Use ``compute_profile="power"`` to resize a computer through ACP presets.
        """
        body: dict[str, Any] = {}
        key_map = {
            "name": "name",
            "project_id": "projectId",
            "description": "description",
            "runtimes": "runtimes",
            "packages": "packages",
            "dockerfile_extensions": "dockerfileExtensions",
            "environment_variables": "environmentVariables",
            "secrets": "secrets",
            "setup_scripts": "setupScripts",
            "mcp_servers": "mcpServers",
            "internet_access": "internetAccess",
            "is_default": "isDefault",
            "compute_profile": "computeProfile",
            "gui_enabled": "guiEnabled",
            "office_apps_enabled": "officeAppsEnabled",
            "metadata": "metadata",
        }
        for py_key, api_key in key_map.items():
            if py_key in params:
                body[api_key] = params[py_key]
        resp = self._client.patch(f"/environments/{environment_id}", body)
        return resp["environment"]

    def delete(self, environment_id: str) -> None:
        """Delete an environment (soft delete)."""
        self._client.delete(f"/environments/{environment_id}")

    # =========================================================================
    # Runtime Management
    # =========================================================================

    def list_available_runtimes(self) -> AvailableRuntimes:
        """Get all available runtime versions."""
        resp = self._client.get("/environments/runtimes/available")
        return resp["runtimes"]

    def get_runtimes(self, environment_id: str) -> RuntimeConfig:
        """Get current runtime versions for an environment."""
        resp = self._client.get(f"/environments/{environment_id}/runtimes")
        return resp["runtimes"]

    def set_runtimes(
        self, environment_id: str, runtimes: dict[str, str]
    ) -> Environment:
        """Set runtime versions. Triggers a rebuild.

        Example::

            client.environments.set_runtimes("env_xyz", {
                "python": "3.12",
                "nodejs": "20",
            })
        """
        resp = self._client.put(
            f"/environments/{environment_id}/runtimes",
            {"runtimes": runtimes},
        )
        return resp["environment"]

    # =========================================================================
    # Package Management
    # =========================================================================

    def list_packages(self, environment_id: str) -> PackagesConfig:
        """List installed packages for an environment."""
        resp = self._client.get(f"/environments/{environment_id}/packages")
        return resp["packages"]

    def install_packages(
        self,
        environment_id: str,
        package_type: str,
        packages: list[str],
    ) -> InstallPackagesResult:
        """Install packages. Triggers a rebuild.

        Args:
            environment_id: Environment ID.
            package_type: One of ``"system"``, ``"python"``, ``"node"``.
            packages: List of package names.

        Example::

            client.environments.install_packages("env_xyz", "python", ["pandas", "numpy"])
        """
        return self._client.post(
            f"/environments/{environment_id}/packages",
            {"type": package_type, "packages": packages},
        )

    def uninstall_package(
        self,
        environment_id: str,
        package_type: str,
        package_name: str,
    ) -> Environment:
        """Uninstall a package. Triggers a rebuild."""
        resp = self._client.delete(
            f"/environments/{environment_id}/packages/{package_type}/{package_name}"
        )
        return resp["environment"]

    # =========================================================================
    # Dockerfile Management
    # =========================================================================

    def get_dockerfile(self, environment_id: str) -> DockerfileResult:
        """Get the Dockerfile configuration."""
        return self._client.get(f"/environments/{environment_id}/dockerfile")

    def set_dockerfile_extensions(
        self, environment_id: str, dockerfile_extensions: str
    ) -> Environment:
        """Update Dockerfile extensions. Triggers a rebuild."""
        resp = self._client.put(
            f"/environments/{environment_id}/dockerfile",
            {"dockerfileExtensions": dockerfile_extensions},
        )
        return resp["environment"]

    def validate_dockerfile(
        self, environment_id: str, dockerfile_extensions: str
    ) -> ValidateDockerfileResult:
        """Validate Dockerfile syntax without building."""
        return self._client.post(
            f"/environments/{environment_id}/dockerfile/validate",
            {"dockerfileExtensions": dockerfile_extensions},
        )

    # =========================================================================
    # Build Management
    # =========================================================================

    def trigger_build(
        self, environment_id: str, *, force: bool = False
    ) -> dict[str, Any]:
        """Trigger a build of the environment image."""
        path = f"/environments/{environment_id}/build"
        if force:
            path += "?force=true"
        return self._client.post(path, {})

    def get_build_status(self, environment_id: str) -> BuildStatusResult:
        """Get build status."""
        return self._client.get(f"/environments/{environment_id}/build/status")

    def get_build_logs(self, environment_id: str) -> BuildLogsResult:
        """Get build logs."""
        return self._client.get(f"/environments/{environment_id}/build/logs")

    def test_build(self, environment_id: str) -> TestBuildResult:
        """Perform a test build to validate configuration."""
        return self._client.post(f"/environments/{environment_id}/build/test", {})

    # =========================================================================
    # Container Lifecycle
    # =========================================================================

    def start(
        self,
        environment_id: str,
        *,
        workspace_id: str | None = None,
        cpus: int | None = None,
        memory: str | None = None,
    ) -> StartContainerResult:
        """Start the environment's container."""
        body: dict[str, Any] = {}
        if workspace_id is not None:
            body["workspaceId"] = workspace_id
        if cpus is not None:
            body["cpus"] = cpus
        if memory is not None:
            body["memory"] = memory
        return self._client.post(f"/environments/{environment_id}/start", body)

    def stop(
        self,
        environment_id: str,
        *,
        container_id: str | None = None,
        all: bool | None = None,
    ) -> dict[str, Any]:
        """Stop the environment's container(s)."""
        body: dict[str, Any] = {}
        if container_id is not None:
            body["containerId"] = container_id
        if all is not None:
            body["all"] = all
        return self._client.post(f"/environments/{environment_id}/stop", body)

    def get_status(self, environment_id: str) -> ContainerStatus:
        """Get container status."""
        return self._client.get(f"/environments/{environment_id}/status")

    def get_analytics(self, environment_id: str) -> dict[str, Any]:
        """Get runtime analytics for a computer."""
        return self._client.get(f"/environments/{environment_id}/analytics")

    def capture_screenshot(self, environment_id: str) -> bytes:
        """Capture a PNG screenshot from the computer desktop."""
        resp = self._client.request_raw("GET", f"/environments/{environment_id}/gui/screenshot")
        return resp.content

    def create_gui_session(self, environment_id: str) -> dict[str, Any]:
        """Create a GUI session token for desktop streaming."""
        return self._client.post(f"/environments/{environment_id}/gui/session", {})

    def perform_gui_action(self, environment_id: str, **params: Any) -> dict[str, Any]:
        """Perform a GUI action on the computer desktop."""
        return self._client.post(f"/environments/{environment_id}/gui/action", params)

    def list_secrets(self, environment_id: str) -> list[dict[str, Any]]:
        """List secret keys configured on a computer."""
        resp = self._client.get(f"/environments/{environment_id}/secrets")
        return resp["data"]

    def create_secret(self, environment_id: str, *, key: str, value: str) -> dict[str, Any]:
        return self._client.post(f"/environments/{environment_id}/secrets", {"key": key, "value": value})

    def update_secret(self, environment_id: str, key: str, *, value: str) -> dict[str, Any]:
        return self._client.put(f"/environments/{environment_id}/secrets/{quote(key, safe='')}", {"value": value})

    def delete_secret(self, environment_id: str, key: str) -> dict[str, Any]:
        return self._client.delete(f"/environments/{environment_id}/secrets/{quote(key, safe='')}")

    def initialize_snapshots(self, environment_id: str) -> dict[str, Any]:
        """Initialize checkpoint history for a computer."""
        return self._client.post(f"/environments/{environment_id}/snapshots/initialize", {})

    def list_snapshots(self, environment_id: str) -> list[EnvironmentSnapshot]:
        """List computer checkpoints/snapshots."""
        resp = self._client.get(f"/environments/{environment_id}/snapshots")
        return resp["data"]

    def list_changes(
        self,
        environment_id: str,
        *,
        limit: int | None = None,
        offset: int | None = None,
        project_id: str | None = None,
        agent_id: str | None = None,
        operation: EnvironmentChangeOperation | list[EnvironmentChangeOperation] | None = None,
    ) -> EnvironmentChangeListResponse:
        """List file-level change history for a computer."""
        query: dict[str, Any] = {}
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        if project_id is not None:
            query["projectId"] = project_id
        if agent_id is not None:
            query["agentId"] = agent_id
        if operation is not None:
            query["operation"] = ",".join(operation) if isinstance(operation, list) else operation
        return self._client.get(f"/environments/{environment_id}/changes", query=query or None)

    def list_snapshot_files(
        self,
        environment_id: str,
        snapshot_id: str,
        *,
        prefix: str | None = None,
    ) -> list[SnapshotFileEntry]:
        query = {"prefix": prefix} if prefix is not None else None
        resp = self._client.get(
            f"/environments/{environment_id}/snapshots/{snapshot_id}/files",
            query=query,
        )
        return resp["data"]

    def get_snapshot_diff(
        self,
        environment_id: str,
        snapshot_id: str,
        *,
        path: str | None = None,
    ) -> EnvironmentSnapshotDiffResponse:
        query = {"path": path} if path is not None else None
        return self._client.get(
            f"/environments/{environment_id}/snapshots/{snapshot_id}/diff",
            query=query,
        )

    def get_snapshot_file(self, environment_id: str, snapshot_id: str, *, path: str) -> EnvironmentSnapshotFileResponse:
        return self._client.get(
            f"/environments/{environment_id}/snapshots/{snapshot_id}/file",
            query={"path": path},
        )

    def get_change_diff(
        self,
        environment_id: str,
        change_id: str,
        *,
        path: str | None = None,
    ) -> EnvironmentSnapshotDiffResponse:
        query = {"path": path} if path is not None else None
        return self._client.get(
            f"/environments/{environment_id}/changes/{quote(change_id, safe='')}/diff",
            query=query,
        )

    def get_change_file(self, environment_id: str, change_id: str, *, path: str) -> EnvironmentSnapshotFileResponse:
        return self._client.get(
            f"/environments/{environment_id}/changes/{quote(change_id, safe='')}/file",
            query={"path": path},
        )

    def fork_from_snapshot(
        self,
        environment_id: str,
        snapshot_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
    ) -> EnvironmentForkFromSnapshotResponse:
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        return self._client.post(
            f"/environments/{environment_id}/snapshots/{snapshot_id}/fork",
            body,
        )

    def fork_from_change(
        self,
        environment_id: str,
        change_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
    ) -> EnvironmentForkFromSnapshotResponse:
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        return self._client.post(
            f"/environments/{environment_id}/changes/{quote(change_id, safe='')}/fork",
            body,
        )

    # =========================================================================
    # Configuration Management
    # =========================================================================

    def get_config(self, environment_id: str) -> str:
        """Get the agent configuration for an environment."""
        resp = self._client.get(f"/environments/{environment_id}/config")
        return resp["config"]

    def update_config(self, environment_id: str, config: str) -> None:
        """Update the agent configuration."""
        self._client.put(f"/environments/{environment_id}/config", {"config": config})
