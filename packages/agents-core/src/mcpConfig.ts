/**
 * Unified MCP Server Configuration Types
 *
 * These types provide a single, consistent way to configure MCP servers
 * for both LLM agents (OpenAI Responses API) and computer agents (Codex CLI).
 *
 * The SDK automatically converts these configurations to the appropriate
 * format based on the agent type.
 */

/**
 * Base configuration for all MCP servers.
 */
export interface BaseMcpServerConfig {
  /**
   * Unique name for this MCP server.
   */
  name: string;

  /**
   * Cache the list of tools provided by this server.
   * @default false
   */
  cacheToolsList?: boolean;

  /**
   * Filter which tools from this server should be exposed to the agent.
   * Can be an array of tool names or a function for dynamic filtering.
   */
  allowedTools?: string[];

  /**
   * Timeout for server startup in seconds.
   */
  startupTimeoutSec?: number;

  /**
   * Timeout for individual tool calls in seconds.
   */
  toolTimeoutSec?: number;
}

/**
 * Configuration for stdio-based MCP servers (local process).
 *
 * These servers are spawned as local processes and communicate via stdin/stdout.
 * Common for file system, git, and other local tool servers.
 *
 * @example
 * ```typescript
 * {
 *   type: 'stdio',
 *   name: 'filesystem',
 *   command: 'npx',
 *   args: ['@modelcontextprotocol/server-filesystem', '/workspace']
 * }
 * ```
 */
export interface StdioMcpServerConfig extends BaseMcpServerConfig {
  type: 'stdio';

  /**
   * Command to execute (e.g., 'npx', 'node', 'python').
   */
  command: string;

  /**
   * Arguments to pass to the command.
   */
  args?: string[];

  /**
   * Environment variables for the server process.
   */
  env?: Record<string, string>;

  /**
   * Working directory for the server process.
   */
  cwd?: string;
}

/**
 * Configuration for HTTP-based MCP servers (remote).
 *
 * These servers are accessed via HTTP and use Server-Sent Events (SSE)
 * for streaming responses.
 *
 * @example
 * ```typescript
 * {
 *   type: 'http',
 *   name: 'notion',
 *   url: 'https://notion-mcp.example.com/mcp',
 *   bearerToken: process.env.NOTION_TOKEN
 * }
 * ```
 */
export interface HttpMcpServerConfig extends BaseMcpServerConfig {
  type: 'http';

  /**
   * URL of the MCP server endpoint.
   */
  url: string;

  /**
   * Bearer token for authentication (if required).
   */
  bearerToken?: string;

  /**
   * Additional HTTP headers to send with requests.
   */
  headers?: Record<string, string>;

  /**
   * Client session timeout in seconds.
   * @default 5
   */
  clientSessionTimeoutSeconds?: number;
}

/**
 * Unified MCP server configuration.
 * Works for both LLM agents and computer agents.
 */
export type McpServerConfig = StdioMcpServerConfig | HttpMcpServerConfig;

/**
 * Type guard to check if config is for stdio server.
 */
export function isStdioMcpServer(
  config: McpServerConfig,
): config is StdioMcpServerConfig {
  return config.type === 'stdio';
}

/**
 * Type guard to check if config is for HTTP server.
 */
export function isHttpMcpServer(
  config: McpServerConfig,
): config is HttpMcpServerConfig {
  return config.type === 'http';
}
