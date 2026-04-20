/**
 * Git Resource Manager
 *
 * Handles git operations on cloud workspaces including
 * diff, commit, and push.
 */

import type { ApiClient } from '../ApiClient';
import type {
  GitDiffResult,
  GitCommitParams,
  GitCommitResult,
  GitPushParams,
  GitPushResult,
} from '../types';

export interface GitStatusResult {
  isGitRepo: boolean;
  path?: string;
  message?: string | null;
  branch?: string | null;
  remoteUrl?: string | null;
  changedFiles?: Array<Record<string, unknown>>;
  stagedFiles?: Array<Record<string, unknown>>;
  unstagedFiles?: Array<Record<string, unknown>>;
  hasChanges?: boolean;
  hasStagedChanges?: boolean;
  hasUnstagedChanges?: boolean;
  hasUnpushedCommits?: boolean;
}

export class GitResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Compatibility alias for Git status on a computer workspace.
   */
  async diff(workspaceId: string): Promise<GitDiffResult> {
    const status = await this.getStatus(workspaceId);
    const files = status.changedFiles ?? [];
    return {
      diffs: files.map((file) => ({
        path: String(file.path ?? ''),
        additions: 0,
        deletions: 0,
        changes: String(file.status ?? 'modified'),
      })),
      stats: {
        filesChanged: files.length,
        insertions: 0,
        deletions: 0,
      },
    };
  }

  /**
   * Get Git status for a computer workspace or repository path.
   */
  async getStatus(environmentId: string, path?: string): Promise<GitStatusResult> {
    return this.client.get(`/environments/${environmentId}/git/status`, path ? { path } : undefined);
  }

  /**
   * Stage files before committing.
   */
  async stage(
    environmentId: string,
    params: { files?: string[]; path?: string; all?: boolean } = {},
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/environments/${environmentId}/git/stage`, params);
  }

  /**
   * Unstage previously staged files.
   */
  async unstage(
    environmentId: string,
    params: { files?: string[]; path?: string; all?: boolean } = {},
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/environments/${environmentId}/git/unstage`, params);
  }

  /**
   * Create a git commit
   */
  async commit(
    workspaceId: string,
    params: GitCommitParams
  ): Promise<GitCommitResult> {
    if (params.files?.length) {
      await this.stage(workspaceId, { files: params.files });
    }
    const response = await this.client.post<Record<string, unknown>>(
      `/environments/${workspaceId}/git/commit`,
      { message: params.message }
    );
    return {
      success: !!response.success,
      commit: {
        sha: String(response.sha ?? ''),
        message: String(response.message ?? params.message),
        author: params.author ?? { name: '', email: '' },
        timestamp: new Date().toISOString(),
        filesChanged: params.files?.length ?? 0,
      },
    };
  }

  /**
   * Push commits to remote
   */
  async push(
    workspaceId: string,
    params: GitPushParams = {}
  ): Promise<GitPushResult> {
    const response = await this.client.post<Record<string, unknown>>(
      `/environments/${workspaceId}/git/push`,
      params
    );
    return {
      success: !!response.success,
      push: {
        remote: 'origin',
        branch: String(response.branch ?? params.branch ?? ''),
        commits: 0,
      },
    };
  }

  /**
   * Create a branch inside a computer workspace.
   */
  async createBranch(environmentId: string, name: string, path?: string): Promise<Record<string, unknown>> {
    return this.client.post(`/environments/${environmentId}/git/branch`, { name, path });
  }

  /**
   * Switch the active branch in a computer workspace.
   */
  async switchBranch(environmentId: string, name: string, path?: string): Promise<Record<string, unknown>> {
    return this.client.put(`/environments/${environmentId}/git/branch`, { name, path });
  }

  async listBranches(environmentId: string, path?: string): Promise<Record<string, unknown>> {
    return this.client.get(`/environments/${environmentId}/git/branches`, path ? { path } : undefined);
  }

  async listCommits(environmentId: string, params: { path?: string; limit?: number } = {}): Promise<Record<string, unknown>> {
    return this.client.get(`/environments/${environmentId}/git/commits`, params);
  }

  async prepareGithub(environmentId: string, params: { repoFullName: string; branch?: string }): Promise<Record<string, unknown>> {
    return this.client.post(`/environments/${environmentId}/github/prepare`, params);
  }

  async clone(
    environmentId: string,
    params: { repoUrl: string; branch?: string; targetPath?: string; token?: string | null },
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/environments/${environmentId}/git/clone`, params);
  }

  /**
   * Commit diffs are no longer exposed as a standalone public ACP route.
   * Use thread steps, thread diffs, or environment snapshot diffs instead.
   */
  async getCommitDiff(workspaceId: string, commitSha: string): Promise<GitDiffResult> {
    void workspaceId;
    void commitSha;
    throw new Error(
      'getCommitDiff() is not available in the current ACP public API. Use thread step diffs or computer snapshot diffs instead.',
    );
  }
}
