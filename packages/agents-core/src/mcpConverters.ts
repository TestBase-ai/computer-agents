/**
 * MCP Configuration Converters
 *
 * Converts unified McpServerConfig to the formats needed by:
 * - LLM agents: MCPServer instances (OpenAI SDK)
 * - Computer agents: Codex SDK format
 */

import type { McpServerConfig } from './mcpConfig';
import { isStdioMcpServer } from './mcpConfig';
import type { MCPServer } from './mcp';
import { MCPServerStdio, MCPServerSSE } from '@testbase/agents-core/_shims';

/**
 * Convert unified MCP config to MCPServer instance for LLM agents.
 *
 * LLM agents use MCPServer instances that connect and provide tools
 * to the OpenAI Responses API.
 *
 * @param config - Unified MCP server configuration
 * @returns MCPServer instance ready for use with LLM agents
 */
export function mcpConfigToServer(config: McpServerConfig): MCPServer {
  if (isStdioMcpServer(config)) {
    return new MCPServerStdio({
      command: config.command,
      args: config.args,
      env: config.env,
      cwd: config.cwd,
      cacheToolsList: config.cacheToolsList,
      timeout: config.toolTimeoutSec ? config.toolTimeoutSec * 1000 : undefined,
      clientSessionTimeoutSeconds: config.startupTimeoutSec,
    });
  } else {
    // HTTP server uses SSE transport
    // Build headers including bearerToken if provided
    const headers: Record<string, string> = { ...config.headers };
    if (config.bearerToken) {
      headers['Authorization'] = `Bearer ${config.bearerToken}`;
    }

    return new MCPServerSSE({
      url: config.url,
      cacheToolsList: config.cacheToolsList,
      clientSessionTimeoutSeconds:
        config.clientSessionTimeoutSeconds ?? config.startupTimeoutSec,
      timeout: config.toolTimeoutSec ? config.toolTimeoutSec * 1000 : undefined,
      // Pass headers via requestInit
      requestInit: Object.keys(headers).length > 0 ? { headers } : undefined,
    } as any); // Type assertion needed due to incomplete MCP SDK types
  }
}

/**
 * Convert array of unified MCP configs to MCPServer instances.
 *
 * @param configs - Array of unified MCP server configurations
 * @returns Array of MCPServer instances
 */
export function mcpConfigsToServers(
  configs: McpServerConfig[],
): MCPServer[] {
  return configs.map(mcpConfigToServer);
}

/**
 * Codex SDK MCP server format (for computer agents).
 * This matches what the Codex SDK expects.
 */
export interface CodexMcpServerFormat {
  name: string;
  // For stdio servers
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // For HTTP servers
  url?: string;
  bearerToken?: string;
  headers?: Record<string, string>;
  // Common options
  startupTimeoutSec?: number;
  toolTimeoutSec?: number;
  allowedTools?: string[];
}

/**
 * Convert unified MCP config to Codex SDK format for computer agents.
 *
 * Computer agents pass MCP server configs to the Codex SDK,
 * which handles the actual server connections.
 *
 * @param config - Unified MCP server configuration
 * @returns Configuration in Codex SDK format
 */
export function mcpConfigToCodexFormat(
  config: McpServerConfig,
): CodexMcpServerFormat {
  const base: CodexMcpServerFormat = {
    name: config.name,
    startupTimeoutSec: config.startupTimeoutSec,
    toolTimeoutSec: config.toolTimeoutSec,
    allowedTools: config.allowedTools,
  };

  if (isStdioMcpServer(config)) {
    return {
      ...base,
      command: config.command,
      args: config.args,
      env: config.env,
    };
  } else {
    return {
      ...base,
      url: config.url,
      bearerToken: config.bearerToken,
      headers: config.headers,
    };
  }
}

/**
 * Convert array of unified MCP configs to Codex SDK format.
 *
 * @param configs - Array of unified MCP server configurations
 * @returns Array of configurations in Codex SDK format
 */
export function mcpConfigsToCodexFormat(
  configs: McpServerConfig[],
): CodexMcpServerFormat[] {
  return configs.map(mcpConfigToCodexFormat);
}
