/**
 * Types for Testbase Cloud SDK
 */

/**
 * MCP server configuration types.
 * Supports both hosted (HTTP) and local (stdio) MCP servers.
 */

/**
 * Hosted MCP server configuration (HTTP/SSE).
 * These servers are accessed via HTTP and don't require package installation.
 */
export interface HostedMcpServer {
  type: 'hosted';
  name: string;
  url: string;
  bearerToken?: string;
  headers?: Record<string, string>;
  allowedTools?: string[];
  startupTimeoutSec?: number;
  toolTimeoutSec?: number;
}

/**
 * Local MCP server configuration (stdio).
 * These servers require npm package installation in the container.
 */
export interface LocalMcpServer {
  type: 'local';
  name: string;
  package: string;  // npm package name
  command: string;  // Command to run (e.g., "npx")
  args?: string[];  // Arguments for the command
  env?: Record<string, string>;
  startupTimeoutSec?: number;
  toolTimeoutSec?: number;
}

/**
 * Union type for all MCP server configurations.
 */
export type McpServerConfig = HostedMcpServer | LocalMcpServer;

/**
 * Workspace information.
 * Workspaces are stored in Google Cloud Storage and can be shared across multiple containers.
 */
export interface WorkspaceInfo {
  id: string;
  userId: string;
  name: string;
  gcsBucket: string;
  gcsPrefix: string;
  createdAt: Date;
  updatedAt: Date;
  sizeBytes: number;
  fileCount: number;
}

/**
 * Options for creating a workspace.
 */
export interface CreateWorkspaceOptions {
  name: string;
  files?: Record<string, string>;  // filename -> content mapping
}

/**
 * Container information returned after creation.
 */
export interface ContainerInfo {
  id: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  region: string;
  createdAt: Date;
  workspace?: string;
  workspaceId?: string;  // NEW: References GCS-backed workspace
  mcpServers: McpServerConfig[];
  cloudRunServiceName?: string;
  cloudRunServiceUrl?: string;
}

/**
 * Cloud agent configuration options.
 */
export interface CloudAgentOptions {
  /**
   * Agent name.
   */
  name: string;

  /**
   * Agent type: Only 'computer' agents run in cloud containers.
   * Note: 'llm' type agents run via OpenAI API, not in cloud containers.
   */
  agentType: 'computer';

  /**
   * Workspace path for the agent.
   * This will be uploaded to the cloud container.
   */
  workspace: string;

  /**
   * Agent instructions.
   */
  instructions?: string;

  /**
   * Codex model (e.g., 'gpt-5-mini', 'gpt-4').
   */
  model?: string;

  /**
   * Codex reasoning effort level.
   */
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';

  /**
   * MCP servers to connect to.
   * Can include both hosted and local servers.
   */
  mcpServers?: McpServerConfig[];

  /**
   * Cloud region to deploy the container.
   * @default 'us-central1'
   */
  region?: string;

  /**
   * Whether to keep the container alive after execution.
   * Useful for running multiple tasks in the same environment.
   * @default false
   */
  persistContainer?: boolean;

  /**
   * Execution timeout in milliseconds.
   * @default 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Reuse an existing container by ID.
   * If provided, a new container won't be created.
   */
  existingContainerId?: string;
}

/**
 * Cloud agent instance with container information.
 */
export interface CloudAgent {
  name: string;
  agentType: 'computer';
  workspace: string;
  containerId: string;
  containerInfo: ContainerInfo;

  // Agent runtime reference (for running tasks)
  _agentInstance: any;
}

/**
 * Options for adding an MCP server to an existing container.
 */
export type AddMcpServerOptions = McpServerConfig & {
  /**
   * Wait for the server to be fully installed and ready.
   * @default true
   */
  waitForReady?: boolean;
};

/**
 * File information returned from list operations.
 */
export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size: number;
}

/**
 * Options for updating a container's configuration.
 */
export interface UpdateContainerOptions {
  /**
   * Codex model to use.
   */
  model?: string;

  /**
   * Codex reasoning effort level.
   */
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Container health status.
 */
export interface ContainerHealth {
  status: string;
  healthy: boolean;
}

/**
 * Testbase Cloud client configuration.
 */
export interface TestbaseCloudConfig {
  /**
   * API key for cloud authentication.
   * Get your API key from testbase.dev
   */
  apiKey: string;

  /**
   * Base URL for the Testbase Cloud API.
   * @default 'https://api.testbase.dev'
   */
  apiUrl?: string;

  /**
   * Default region for container deployment.
   * @default 'us-central1'
   */
  defaultRegion?: string;

  /**
   * Default timeout for operations in milliseconds.
   * @default 300000 (5 minutes)
   */
  defaultTimeout?: number;

  /**
   * Enable debug logging.
   * @default false
   */
  debug?: boolean;
}
