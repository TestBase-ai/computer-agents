/**
 * Environments Resource Manager
 *
 * Handles environment management including CRUD operations,
 * container lifecycle, runtime/package management, and build management.
 *
 * Note: userId is now embedded in the API key, so routes use
 * simplified paths without /projects/:projectId prefix.
 */

import type { ApiClient } from '../ApiClient';
import type {
  Environment,
  CreateEnvironmentParams,
  UpdateEnvironmentParams,
  ContainerStatus,
  BuildResult,
  BuildStatusResult,
  BuildLogsResult,
  TestBuildResult,
  StartContainerParams,
  StartContainerResult,
  RuntimeConfig,
  PackagesConfig,
  AvailableRuntimes,
  PackageType,
  InstallPackagesResult,
  DockerfileResult,
  ValidateDockerfileResult,
  EnvironmentSnapshot,
  EnvironmentChangeListResponse,
  EnvironmentChangeOperation,
  EnvironmentSnapshotDiffResponse,
  EnvironmentSnapshotFileResponse,
  EnvironmentForkFromSnapshotResponse,
  SnapshotFileEntry,
} from '../types';

export interface ListEnvironmentsParams {
  isActive?: boolean;
  isDefault?: boolean;
  limit?: number;
  offset?: number;
}

export interface EnvironmentAnalyticsResponse {
  environmentId: string;
  available?: boolean;
  summary?: Record<string, unknown>;
  charts?: Record<string, unknown>;
  recentRuns?: Array<Record<string, unknown>>;
}

export interface EnvironmentSecretDescriptor {
  key: string;
  hasValue: boolean;
}

export interface EnvironmentGuiActionParams {
  action: 'click' | 'double_click' | 'right_click' | 'scroll' | 'key' | 'type' | 'bootstrap' | 'launch_app';
  x?: number;
  y?: number;
  deltaY?: number;
  steps?: number;
  key?: string;
  text?: string;
  app?: string;
}

export interface ListEnvironmentChangesParams {
  limit?: number;
  offset?: number;
  projectId?: string;
  agentId?: string;
  operation?: EnvironmentChangeOperation | EnvironmentChangeOperation[];
}

export class EnvironmentsResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Create a new environment
   *
   * User is determined automatically from the API key.
   * Use `computeProfile` for first-class sizing presets such as
   * `lite`, `standard`, `power`, and `desktop`.
   */
  async create(params: CreateEnvironmentParams): Promise<Environment> {
    const response = await this.client.post<{ environment: Environment }>(
      `/environments`,
      params
    );
    return response.environment;
  }

  /**
   * List all environments
   *
   * User is determined automatically from the API key.
   */
  async list(params?: ListEnvironmentsParams): Promise<Environment[]> {
    const queryParams = new URLSearchParams();
    if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));
    if (params?.isDefault !== undefined) queryParams.set('isDefault', String(params.isDefault));
    if (params?.limit !== undefined) queryParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) queryParams.set('offset', String(params.offset));

    const queryString = queryParams.toString();
    const response = await this.client.get<{ data: Environment[]; object: string }>(
      `/environments${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  /**
   * Get an environment by ID
   */
  async get(environmentId: string): Promise<Environment> {
    const response = await this.client.get<{ environment: Environment }>(
      `/environments/${environmentId}`
    );
    return response.environment;
  }

  /**
   * Get the user's default environment
   * Creates one if it doesn't exist.
   */
  async getDefault(): Promise<Environment> {
    const response = await this.client.get<Environment>(
      `/environments/default`
    );
    return response;
  }

  /**
   * Mark an environment as the default computer for the current user.
   */
  async setDefault(environmentId: string): Promise<Environment> {
    const response = await this.client.post<{ environment: Environment }>(
      `/environments/${environmentId}/set-default`,
      {},
    );
    return response.environment;
  }

  /**
   * Update an environment
   *
   * `computeProfile` is the recommended way to change computer sizing.
   */
  async update(
    environmentId: string,
    params: UpdateEnvironmentParams
  ): Promise<Environment> {
    const response = await this.client.patch<{ environment: Environment }>(
      `/environments/${environmentId}`,
      params
    );
    return response.environment;
  }

  /**
   * Delete an environment (soft delete)
   */
  async delete(environmentId: string): Promise<void> {
    await this.client.delete(`/environments/${environmentId}`);
  }

  // =========================================================================
  // Runtime Management
  // =========================================================================

  /**
   * Get all available runtime versions
   * Returns supported versions for Python, Node.js, Go, PHP, Java, Ruby, Rust
   */
  async listAvailableRuntimes(): Promise<AvailableRuntimes> {
    const response = await this.client.get<{ runtimes: AvailableRuntimes }>(
      `/environments/runtimes/available`
    );
    return response.runtimes;
  }

  /**
   * Get current runtime versions for an environment
   */
  async getRuntimes(environmentId: string): Promise<RuntimeConfig> {
    const response = await this.client.get<{ runtimes: RuntimeConfig }>(
      `/environments/${environmentId}/runtimes`
    );
    return response.runtimes;
  }

  /**
   * Set runtime versions for an environment
   * This triggers a rebuild of the environment image.
   *
   * @example
   * await client.environments.setRuntimes('env_xyz', {
   *   python: '3.12',
   *   nodejs: '20',
   *   go: '1.22'
   * });
   */
  async setRuntimes(
    environmentId: string,
    runtimes: RuntimeConfig
  ): Promise<Environment> {
    const response = await this.client.put<{ environment: Environment }>(
      `/environments/${environmentId}/runtimes`,
      { runtimes }
    );
    return response.environment;
  }

  // =========================================================================
  // Package Management
  // =========================================================================

  /**
   * List installed packages for an environment
   */
  async listPackages(environmentId: string): Promise<PackagesConfig> {
    const response = await this.client.get<{ packages: PackagesConfig }>(
      `/environments/${environmentId}/packages`
    );
    return response.packages;
  }

  /**
   * Install packages in an environment
   * This triggers a rebuild of the environment image.
   *
   * @example
   * await client.environments.installPackages('env_xyz', 'python', ['pandas', 'numpy']);
   * await client.environments.installPackages('env_xyz', 'system', ['ffmpeg', 'imagemagick']);
   * await client.environments.installPackages('env_xyz', 'node', ['typescript', 'tsx']);
   */
  async installPackages(
    environmentId: string,
    type: PackageType,
    packages: string[]
  ): Promise<InstallPackagesResult> {
    const response = await this.client.post<InstallPackagesResult>(
      `/environments/${environmentId}/packages`,
      { type, packages }
    );
    return response;
  }

  /**
   * Uninstall a package from an environment
   * This triggers a rebuild of the environment image.
   *
   * @example
   * await client.environments.uninstallPackage('env_xyz', 'python', 'pandas');
   */
  async uninstallPackage(
    environmentId: string,
    type: PackageType,
    packageName: string
  ): Promise<Environment> {
    const response = await this.client.delete<{ environment: Environment }>(
      `/environments/${environmentId}/packages/${type}/${packageName}`
    );
    return response.environment;
  }

  // =========================================================================
  // Dockerfile Management
  // =========================================================================

  /**
   * Get the Dockerfile configuration for an environment
   * Returns the base image, custom extensions, and effective Dockerfile
   */
  async getDockerfile(environmentId: string): Promise<DockerfileResult> {
    const response = await this.client.get<DockerfileResult>(
      `/environments/${environmentId}/dockerfile`
    );
    return response;
  }

  /**
   * Update Dockerfile extensions for an environment
   * Extensions are added after runtime and package installation but before the entrypoint.
   * This triggers a rebuild of the environment image.
   *
   * @example
   * await client.environments.setDockerfileExtensions('env_xyz',
   *   'RUN apt-get update && apt-get install -y custom-tool\nRUN pip install custom-package'
   * );
   */
  async setDockerfileExtensions(
    environmentId: string,
    dockerfileExtensions: string
  ): Promise<Environment> {
    const response = await this.client.put<{ environment: Environment }>(
      `/environments/${environmentId}/dockerfile`,
      { dockerfileExtensions }
    );
    return response.environment;
  }

  /**
   * Validate Dockerfile syntax without building
   */
  async validateDockerfile(
    environmentId: string,
    dockerfileExtensions: string
  ): Promise<ValidateDockerfileResult> {
    const response = await this.client.post<ValidateDockerfileResult>(
      `/environments/${environmentId}/dockerfile/validate`,
      { dockerfileExtensions }
    );
    return response;
  }

  // =========================================================================
  // Build Management
  // =========================================================================

  /**
   * Trigger a build of the environment image
   *
   * @param environmentId - Environment ID
   * @param force - Force rebuild even if up to date (default: false)
   */
  async triggerBuild(
    environmentId: string,
    force: boolean = false
  ): Promise<{ buildId: string; status: string; message: string }> {
    const response = await this.client.post<{ buildId: string; status: string; message: string }>(
      `/environments/${environmentId}/build${force ? '?force=true' : ''}`,
      {}
    );
    return response;
  }

  /**
   * Get build status for an environment
   */
  async getBuildStatus(environmentId: string): Promise<BuildStatusResult> {
    const response = await this.client.get<BuildStatusResult>(
      `/environments/${environmentId}/build/status`
    );
    return response;
  }

  /**
   * Get build logs for an environment
   */
  async getBuildLogs(environmentId: string): Promise<BuildLogsResult> {
    const response = await this.client.get<BuildLogsResult>(
      `/environments/${environmentId}/build/logs`
    );
    return response;
  }

  /**
   * Perform a test build to validate configuration without caching
   */
  async testBuild(environmentId: string): Promise<TestBuildResult> {
    const response = await this.client.post<TestBuildResult>(
      `/environments/${environmentId}/build/test`,
      {}
    );
    return response;
  }

  /**
   * @deprecated Use triggerBuild instead
   */
  async build(
    environmentId: string,
    force: boolean = false
  ): Promise<BuildResult> {
    const response = await this.client.post<BuildResult>(
      `/environments/${environmentId}/build`,
      { force }
    );
    return response;
  }

  // =========================================================================
  // Container Lifecycle
  // =========================================================================

  /**
   * Start the environment's container
   */
  async start(
    environmentId: string,
    params: StartContainerParams = {}
  ): Promise<StartContainerResult> {
    const response = await this.client.post<StartContainerResult>(
      `/environments/${environmentId}/start`,
      params
    );
    return response;
  }

  /**
   * Stop the environment's container(s)
   */
  async stop(
    environmentId: string,
    options?: { containerId?: string; all?: boolean }
  ): Promise<{ success: boolean; stopped: number; containers: string[] }> {
    const response = await this.client.post<{
      success: boolean;
      stopped: number;
      containers: string[];
    }>(
      `/environments/${environmentId}/stop`,
      options
    );
    return response;
  }

  /**
   * Get container status for an environment
   */
  async getStatus(environmentId: string): Promise<ContainerStatus> {
    const response = await this.client.get<ContainerStatus>(
      `/environments/${environmentId}/status`
    );
    return response;
  }

  /**
   * Get runtime analytics for the computer.
   */
  async getAnalytics(environmentId: string): Promise<EnvironmentAnalyticsResponse> {
    return this.client.get(`/environments/${environmentId}/analytics`);
  }

  /**
   * Capture a desktop screenshot from the computer.
   */
  async captureScreenshot(environmentId: string): Promise<Buffer> {
    const response = await this.client.request<Response>(
      'GET',
      `/environments/${environmentId}/gui/screenshot`,
      { stream: true },
    );
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Create a browser/desktop session token for GUI streaming.
   */
  async createGuiSession(environmentId: string): Promise<{
    token: string;
    websocketPath: string;
    expiresAt: string;
  }> {
    return this.client.post(`/environments/${environmentId}/gui/session`, {});
  }

  /**
   * Execute a GUI action in the computer session.
   */
  async performGuiAction(
    environmentId: string,
    params: EnvironmentGuiActionParams,
  ): Promise<{ ok: boolean; action: string }> {
    return this.client.post(`/environments/${environmentId}/gui/action`, params);
  }

  /**
   * List configured secret keys for the computer.
   */
  async listSecrets(environmentId: string): Promise<EnvironmentSecretDescriptor[]> {
    const response = await this.client.get<{ data: EnvironmentSecretDescriptor[] }>(
      `/environments/${environmentId}/secrets`,
    );
    return response.data;
  }

  async createSecret(environmentId: string, key: string, value: string): Promise<{ success?: boolean; key: string; message?: string }> {
    return this.client.post(`/environments/${environmentId}/secrets`, { key, value });
  }

  async updateSecret(environmentId: string, key: string, value: string): Promise<{ success?: boolean; key: string; message?: string }> {
    return this.client.put(`/environments/${environmentId}/secrets/${encodeURIComponent(key)}`, { value });
  }

  async deleteSecret(environmentId: string, key: string): Promise<{ success?: boolean; key: string; message?: string }> {
    return this.client.delete(`/environments/${environmentId}/secrets/${encodeURIComponent(key)}`);
  }

  /**
   * Initialize snapshot history for a computer.
   */
  async initializeSnapshots(environmentId: string): Promise<{
    environmentId: string;
    snapshot: EnvironmentSnapshot;
  }> {
    return this.client.post(`/environments/${environmentId}/snapshots/initialize`, {});
  }

  /**
   * List checkpoint snapshots for a computer.
   */
  async listSnapshots(environmentId: string): Promise<EnvironmentSnapshot[]> {
    const response = await this.client.get<{ data: EnvironmentSnapshot[] }>(`/environments/${environmentId}/snapshots`);
    return response.data;
  }

  /**
   * List file-level computer changes over time.
   *
   * This is the canonical environment history surface for “what changed when”.
   * Results are paginated and can be filtered by project, agent, and operation.
   */
  async listChanges(
    environmentId: string,
    params: ListEnvironmentChangesParams = {},
  ): Promise<EnvironmentChangeListResponse> {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: params.limit,
      offset: params.offset,
      projectId: params.projectId,
      agentId: params.agentId,
      operation: Array.isArray(params.operation) ? params.operation.join(',') : params.operation,
    };
    return this.client.get<EnvironmentChangeListResponse>(
      `/environments/${environmentId}/changes`,
      query,
    );
  }

  async listSnapshotFiles(
    environmentId: string,
    snapshotId: string,
    params: { prefix?: string } = {},
  ): Promise<SnapshotFileEntry[]> {
    const response = await this.client.get<{ data: SnapshotFileEntry[] }>(
      `/environments/${environmentId}/snapshots/${snapshotId}/files`,
      params,
    );
    return response.data;
  }

  async getSnapshotDiff(
    environmentId: string,
    snapshotId: string,
    params: { path?: string } = {},
  ): Promise<EnvironmentSnapshotDiffResponse> {
    return this.client.get<EnvironmentSnapshotDiffResponse>(`/environments/${environmentId}/snapshots/${snapshotId}/diff`, params);
  }

  async getSnapshotFile(
    environmentId: string,
    snapshotId: string,
    path: string,
  ): Promise<EnvironmentSnapshotFileResponse> {
    return this.client.get<EnvironmentSnapshotFileResponse>(`/environments/${environmentId}/snapshots/${snapshotId}/file`, { path });
  }

  /**
   * Read the diff for one historical file-level computer change.
   */
  async getChangeDiff(
    environmentId: string,
    changeId: string,
    params: { path?: string } = {},
  ): Promise<EnvironmentSnapshotDiffResponse> {
    return this.client.get<EnvironmentSnapshotDiffResponse>(
      `/environments/${environmentId}/changes/${encodeURIComponent(changeId)}/diff`,
      params,
    );
  }

  /**
   * Read one file as it existed at a specific change boundary.
   */
  async getChangeFile(
    environmentId: string,
    changeId: string,
    path: string,
  ): Promise<EnvironmentSnapshotFileResponse> {
    return this.client.get<EnvironmentSnapshotFileResponse>(
      `/environments/${environmentId}/changes/${encodeURIComponent(changeId)}/file`,
      { path },
    );
  }

  async forkFromSnapshot(
    environmentId: string,
    snapshotId: string,
    params: { name?: string; description?: string } = {},
  ): Promise<EnvironmentForkFromSnapshotResponse> {
    return this.client.post<EnvironmentForkFromSnapshotResponse>(`/environments/${environmentId}/snapshots/${snapshotId}/fork`, params);
  }

  /**
   * Fork a new computer from a specific historical file change.
   */
  async forkFromChange(
    environmentId: string,
    changeId: string,
    params: { name?: string; description?: string } = {},
  ): Promise<EnvironmentForkFromSnapshotResponse> {
    return this.client.post<EnvironmentForkFromSnapshotResponse>(
      `/environments/${environmentId}/changes/${encodeURIComponent(changeId)}/fork`,
      params,
    );
  }

  // =========================================================================
  // Configuration Management
  // =========================================================================

  /**
   * Get the agent configuration for an environment
   */
  async getConfig(environmentId: string): Promise<string> {
    const response = await this.client.get<{ config: string }>(
      `/environments/${environmentId}/config`
    );
    return response.config;
  }

  /**
   * Update the agent configuration for an environment
   */
  async updateConfig(
    environmentId: string,
    config: string
  ): Promise<void> {
    await this.client.put(
      `/environments/${environmentId}/config`,
      { config }
    );
  }
}
