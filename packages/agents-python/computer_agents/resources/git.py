"""Git resource manager.

Handles git operations on cloud workspaces including
diff, commit, and push.
"""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from ..types import GitCommitResult, GitDiffResult, GitPushResult


class GitResource:
    """Git operations on ACP computers.

    Example::

        diff = client.git.diff("env_xxx")
        client.git.commit("env_xxx", message="Add feature")
        client.git.push("env_xxx")
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def diff(self, workspace_id: str) -> GitDiffResult:
        """Compatibility alias that maps current Git status into a diff-like payload."""
        status = self.get_status(workspace_id)
        changed_files = status.get("changedFiles", [])
        return {
            "diffs": [
                {
                    "path": str(file.get("path", "")),
                    "additions": 0,
                    "deletions": 0,
                    "changes": str(file.get("status", "modified")),
                }
                for file in changed_files
            ],
            "stats": {
                "filesChanged": len(changed_files),
                "insertions": 0,
                "deletions": 0,
            },
        }

    def get_status(self, environment_id: str, *, path: str | None = None) -> dict[str, Any]:
        query = {"path": path} if path is not None else None
        return self._client.get(f"/environments/{environment_id}/git/status", query=query)

    def stage(
        self,
        environment_id: str,
        *,
        files: list[str] | None = None,
        path: str | None = None,
        all: bool | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if files is not None:
            body["files"] = files
        if path is not None:
            body["path"] = path
        if all is not None:
            body["all"] = all
        return self._client.post(f"/environments/{environment_id}/git/stage", body)

    def unstage(
        self,
        environment_id: str,
        *,
        files: list[str] | None = None,
        path: str | None = None,
        all: bool | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if files is not None:
            body["files"] = files
        if path is not None:
            body["path"] = path
        if all is not None:
            body["all"] = all
        return self._client.post(f"/environments/{environment_id}/git/unstage", body)

    def commit(
        self,
        workspace_id: str,
        message: str,
        *,
        author: dict[str, str] | None = None,
        files: list[str] | None = None,
    ) -> GitCommitResult:
        """Create a git commit."""
        if files:
            self.stage(workspace_id, files=files)
        resp = self._client.post(f"/environments/{workspace_id}/git/commit", {"message": message})
        return {
            "success": bool(resp.get("success")),
            "commit": {
                "sha": resp.get("sha"),
                "message": resp.get("message", message),
                "author": author or {"name": "", "email": ""},
                "timestamp": "",
                "filesChanged": len(files or []),
            },
        }

    def push(
        self,
        workspace_id: str,
        *,
        remote: str | None = None,
        branch: str | None = None,
        force: bool | None = None,
    ) -> GitPushResult:
        """Push commits to remote."""
        body: dict[str, Any] = {}
        if remote is not None:
            body["remote"] = remote
        if branch is not None:
            body["branch"] = branch
        if force is not None:
            body["force"] = force
        resp = self._client.post(f"/environments/{workspace_id}/git/push", body)
        return {
            "success": bool(resp.get("success")),
            "push": {
                "remote": remote or "origin",
                "branch": resp.get("branch", branch or ""),
                "commits": 0,
            },
        }

    def create_branch(self, environment_id: str, name: str, *, path: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"name": name}
        if path is not None:
            body["path"] = path
        return self._client.post(f"/environments/{environment_id}/git/branch", body)

    def switch_branch(self, environment_id: str, name: str, *, path: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"name": name}
        if path is not None:
            body["path"] = path
        return self._client.put(f"/environments/{environment_id}/git/branch", body)

    def list_branches(self, environment_id: str, *, path: str | None = None) -> dict[str, Any]:
        query = {"path": path} if path is not None else None
        return self._client.get(f"/environments/{environment_id}/git/branches", query=query)

    def list_commits(
        self,
        environment_id: str,
        *,
        path: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        query: dict[str, Any] = {}
        if path is not None:
            query["path"] = path
        if limit is not None:
            query["limit"] = limit
        return self._client.get(f"/environments/{environment_id}/git/commits", query=query or None)

    def prepare_github(
        self,
        environment_id: str,
        *,
        repo_full_name: str,
        branch: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"repoFullName": repo_full_name}
        if branch is not None:
            body["branch"] = branch
        return self._client.post(f"/environments/{environment_id}/github/prepare", body)

    def clone(
        self,
        environment_id: str,
        *,
        repo_url: str,
        branch: str | None = None,
        target_path: str | None = None,
        token: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"repoUrl": repo_url}
        if branch is not None:
            body["branch"] = branch
        if target_path is not None:
            body["targetPath"] = target_path
        if token is not None:
            body["token"] = token
        return self._client.post(f"/environments/{environment_id}/git/clone", body)

    def get_commit_diff(
        self, workspace_id: str, commit_sha: str
    ) -> GitDiffResult:
        """Commit diffs are no longer exposed as a standalone public ACP route."""
        raise NotImplementedError(
            "get_commit_diff() is not available in the current ACP public API. "
            "Use thread step diffs or computer snapshot diffs instead."
        )
