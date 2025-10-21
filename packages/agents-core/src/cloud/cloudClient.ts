import { CloudApiError, TimeoutError } from './cloudErrors';
import { ContainerInfo, McpServerConfig, FileInfo, UpdateContainerOptions, ContainerHealth } from './cloudTypes';

/**
 * Configuration for the Cloud API client.
 */
export interface CloudApiClientConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
  debug: boolean;
}

/**
 * Options for creating a container.
 */
export interface CreateContainerOptions {
  agentType: 'computer';
  workspace: string;
  region: string;
  model?: string;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  persistContainer: boolean;
  timeout: number;
}

/**
 * Options for installing an MCP package.
 */
export interface InstallMcpPackageOptions {
  package: string;
  env?: Record<string, string>;
}

/**
 * Cloud API client for interacting with Testbase Cloud services.
 *
 * This client handles all HTTP communication with the cloud API,
 * including container management, MCP server configuration, and
 * workspace operations.
 *
 * When created with a specific container, it implements CloudClientInterface
 * for use with testbase-agents SDK.
 */
export class CloudApiClient {
  private config: CloudApiClientConfig;
  private _containerId?: string;
  private _containerUrl?: string;

  constructor(config: CloudApiClientConfig) {
    this.config = config;
  }

  /**
   * The container ID this client is connected to (when created for a specific container).
   * Required by CloudClientInterface for testbase-agents integration.
   */
  get containerId(): string {
    if (!this._containerId) {
      throw new Error('This client is not connected to a specific container. Use forContainer() to create a container-specific client.');
    }
    return this._containerId;
  }

  /**
   * The container URL this client is connected to (when created for a specific container).
   * Required by CloudClientInterface for testbase-agents integration.
   */
  get containerUrl(): string {
    if (!this._containerUrl) {
      throw new Error('This client is not connected to a specific container. Use forContainer() to create a container-specific client.');
    }
    return this._containerUrl;
  }

  /**
   * Creates a new client instance connected to a specific container.
   * This is useful for testbase-agents integration where each agent needs
   * a client bound to a specific container.
   *
   * @param containerId - The container ID to connect to
   * @param containerUrl - The container's URL
   * @returns A new CloudApiClient instance connected to the specified container
   *
   * @example
   * ```typescript
   * const generalClient = new CloudApiClient({ apiKey: '...', apiUrl: '...' });
   * const container = await generalClient.createContainer({...});
   *
   * // Create a container-specific client for use with agents
   * const containerClient = generalClient.forContainer(container.id, container.url);
   * ```
   */
  forContainer(containerId: string, containerUrl: string): CloudApiClient {
    const client = new CloudApiClient(this.config);
    client._containerId = containerId;
    client._containerUrl = containerUrl;
    return client;
  }

  /**
   * Creates a new container in the cloud.
   *
   * @param options - Container creation options
   * @returns Container information
   */
  async createContainer(options: CreateContainerOptions): Promise<ContainerInfo> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Creating container:', options);
    }

    const response = await this.apiCall<ContainerInfo>('POST', '/api/v1/containers', {
      agentType: options.agentType,
      workspace: options.workspace,
      region: options.region,
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      persistContainer: options.persistContainer,
      timeout: options.timeout,
    });

    return response;
  }

  /**
   * Gets container information.
   *
   * @param containerId - Container ID
   * @returns Container information
   */
  async getContainer(containerId: string): Promise<ContainerInfo> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Getting container:', containerId);
    }

    const response = await this.apiCall<ContainerInfo>(
      'GET',
      `/api/v1/containers/${containerId}`
    );

    return response;
  }

  /**
   * Lists all containers for the current user.
   *
   * @returns Array of container information
   */
  async listContainers(): Promise<ContainerInfo[]> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Listing containers');
    }

    const response = await this.apiCall<ContainerInfo[]>('GET', '/api/v1/containers');

    return response;
  }

  /**
   * Deletes a container.
   *
   * @param containerId - Container ID
   */
  async deleteContainer(containerId: string): Promise<void> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Deleting container:', containerId);
    }

    await this.apiCall('DELETE', `/api/v1/containers/${containerId}`);
  }

  /**
   * Installs an npm package in a container (for local MCP servers).
   *
   * @param containerId - Container ID
   * @param options - Package installation options
   */
  async installMcpPackage(
    containerId: string,
    options: InstallMcpPackageOptions
  ): Promise<void> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Installing MCP package:', {
        containerId,
        package: options.package,
      });
    }

    await this.apiCall('POST', `/api/v1/containers/${containerId}/packages`, {
      package: options.package,
      env: options.env,
    });
  }

  /**
   * Adds an MCP server to a container.
   *
   * @param containerId - Container ID
   * @param serverConfig - MCP server configuration
   */
  async addMcpServer(containerId: string, serverConfig: McpServerConfig): Promise<void> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Adding MCP server:', {
        containerId,
        name: serverConfig.name,
        type: serverConfig.type,
      });
    }

    await this.apiCall('POST', `/api/v1/containers/${containerId}/mcp-servers`, {
      server: serverConfig,
    });
  }

  /**
   * Removes an MCP server from a container.
   *
   * @param containerId - Container ID
   * @param serverName - Name of the MCP server to remove
   */
  async removeMcpServer(containerId: string, serverName: string): Promise<void> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Removing MCP server:', {
        containerId,
        serverName,
      });
    }

    await this.apiCall(
      'DELETE',
      `/api/v1/containers/${containerId}/mcp-servers/${serverName}`
    );
  }

  /**
   * Lists all MCP servers configured in a container.
   *
   * @param containerId - Container ID
   * @returns Array of MCP server configurations
   */
  async listMcpServers(containerId: string): Promise<McpServerConfig[]> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Listing MCP servers:', containerId);
    }

    const container = await this.apiCall<ContainerInfo>(
      'GET',
      `/api/v1/containers/${containerId}`
    );

    return container.mcpServers;
  }

  /**
   * Updates a container's configuration.
   *
   * @param containerId - Container ID
   * @param updates - Container configuration updates
   * @returns Updated container information
   */
  async updateContainer(
    containerId: string,
    updates: UpdateContainerOptions
  ): Promise<ContainerInfo> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Updating container:', { containerId, updates });
    }

    const response = await this.apiCall<ContainerInfo>(
      'PATCH',
      `/api/v1/containers/${containerId}`,
      updates
    );

    return response;
  }

  /**
   * Lists files in a container at the specified path.
   *
   * @param containerId - Container ID
   * @param path - Path to list files from
   * @returns Array of file information
   */
  async listFiles(containerId: string, path: string): Promise<{ path: string; files: FileInfo[] }> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Listing files:', { containerId, path });
    }

    const response = await this.apiCall<{ path: string; files: FileInfo[] }>(
      'GET',
      `/api/v1/containers/${containerId}/files?path=${encodeURIComponent(path)}`
    );

    return response;
  }

  /**
   * Downloads a file from a container.
   *
   * @param containerId - Container ID
   * @param filePath - Path to the file to download
   * @returns File content and filename
   */
  async downloadFile(
    containerId: string,
    filePath: string
  ): Promise<{ content: Buffer; filename: string }> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Downloading file:', { containerId, filePath });
    }

    // For file download, we need to handle binary data differently
    const url = `${this.config.apiUrl}/api/v1/containers/${containerId}/files/download?path=${encodeURIComponent(filePath)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new CloudApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const content = Buffer.from(arrayBuffer);
      const filename = filePath.split('/').pop() || 'download';

      return { content, filename };
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${this.config.timeout}ms`);
      }

      if (error instanceof CloudApiError) {
        throw error;
      }

      throw new CloudApiError(
        `Network error: ${(error as Error).message}`,
        0,
        error
      );
    }
  }

  /**
   * Uploads a file to a container.
   *
   * @param containerId - Container ID
   * @param filePath - Path where the file should be created
   * @param content - File content (as string)
   */
  async uploadFile(
    containerId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Uploading file:', { containerId, filePath });
    }

    await this.apiCall(
      'PUT',
      `/api/v1/containers/${containerId}/files`,
      { path: filePath, content }
    );
  }

  /**
   * Deletes a file from a container.
   *
   * @param containerId - Container ID
   * @param filePath - Path to the file to delete
   */
  async deleteFile(containerId: string, filePath: string): Promise<void> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Deleting file:', { containerId, filePath });
    }

    await this.apiCall(
      'DELETE',
      `/api/v1/containers/${containerId}/files?path=${encodeURIComponent(filePath)}`
    );
  }

  /**
   * Gets the health status of a container.
   *
   * @param containerId - Container ID
   * @returns Container health status
   */
  async getContainerHealth(containerId: string): Promise<ContainerHealth> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Getting container health:', containerId);
    }

    const response = await this.apiCall<ContainerHealth>(
      'GET',
      `/api/v1/containers/${containerId}/health`
    );

    return response;
  }

  /**
   * Gets logs from a container.
   *
   * @param containerId - Container ID
   * @param lines - Number of log lines to retrieve (default: 100)
   * @returns Container logs as a string
   */
  async getContainerLogs(containerId: string, lines: number = 100): Promise<string> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Getting container logs:', { containerId, lines });
    }

    const response = await this.apiCall<string>(
      'GET',
      `/api/v1/containers/${containerId}/logs?lines=${lines}`
    );

    return response;
  }

  /**
   * Executes a task in a cloud container.
   * When used with a container-specific client (created via forContainer()),
   * this method implements the CloudClientInterface.
   *
   * @param task - The task to execute
   * @param workspace - Optional workspace path
   * @returns Execution ID for tracking
   */
  async executeTask(
    task: string,
    workspace?: string
  ): Promise<{ executionId: string; status: string; message: string }> {
    const targetUrl = this.containerUrl; // Will throw if not container-specific

    if (this.config.debug) {
      console.log('[CloudApiClient] Executing task:', {
        containerId: this.containerId,
        containerUrl: targetUrl,
        task: task.substring(0, 100) + '...',
      });
    }

    const url = `${targetUrl}/execute`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Get Google Cloud identity token for invoking Cloud Run services
      const idToken = await this.getCloudRunIdToken(targetUrl);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          task,
          workspace,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to execute task: ${response.status} ${response.statusText} - ${errorData.error || ''}`
        );
      }

      const data = await response.json();
      return data as { executionId: string; status: string; message: string };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Polls the status of a task execution in a cloud container.
   * @private
   */
  private async getExecutionStatus(): Promise<{ executing: boolean; execution: any }> {
    const targetUrl = this.containerUrl; // Will throw if not container-specific
    const url = `${targetUrl}/status`;

    // Get Google Cloud identity token for invoking Cloud Run services
    const idToken = await this.getCloudRunIdToken(targetUrl);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.status}`);
    }

    const data = await response.json();
    return data as { executing: boolean; execution: any };
  }

  /**
   * Gets a Google Cloud identity token for invoking Cloud Run services.
   * Uses application default credentials.
   * @private
   */
  private async getCloudRunIdToken(targetUrl: string): Promise<string> {
    // Use gcloud to get identity token
    const { execSync } = await import('child_process');
    try {
      const token = execSync(`gcloud auth print-identity-token`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      return token;
    } catch (error) {
      throw new Error(`Failed to get Cloud Run identity token: ${(error as Error).message}`);
    }
  }

  /**
   * Waits for a task execution to complete by polling the status endpoint.
   * When used with a container-specific client (created via forContainer()),
   * this method implements the CloudClientInterface.
   *
   * @param pollIntervalMs - Interval between status checks in milliseconds (default: 5000)
   * @returns Final output when execution completes
   */
  async waitForExecution(
    pollIntervalMs: number = 5000
  ): Promise<{ completed: boolean; output?: string }> {
    if (this.config.debug) {
      console.log('[CloudApiClient] Waiting for execution to complete:', {
        containerId: this.containerId,
        containerUrl: this.containerUrl,
      });
    }

    while (true) {
      const status = await this.getExecutionStatus();

      if (!status.executing) {
        if (this.config.debug) {
          console.log('[CloudApiClient] Execution completed');
        }
        return { completed: true, output: status.execution?.output };
      }

      if (this.config.debug) {
        console.log('[CloudApiClient] Still executing, waiting...');
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  /**
   * Make HTTP API call to the cloud server.
   * @private
   */
  private async apiCall<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.config.apiUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      if (this.config.debug) {
        console.log('[CloudApiClient] API call:', { method, url, body });
      }

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      clearTimeout(timeoutId);

      // Handle non-2xx responses
      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new CloudApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse JSON response
      const data = await response.json();

      if (this.config.debug) {
        console.log('[CloudApiClient] API response:', data);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(
          `Request timed out after ${this.config.timeout}ms`
        );
      }

      if (error instanceof CloudApiError) {
        throw error;
      }

      throw new CloudApiError(
        `Network error: ${(error as Error).message}`,
        0,
        error
      );
    }
  }
}
