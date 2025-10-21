/**
 * Runtime abstraction for executing agents in different environments.
 *
 * This module provides a unified interface for executing agents across:
 * - Local Codex CLI execution (computer-use)
 * - Cloud container execution (computer-use)
 * - Standard LLM API execution
 *
 * All runtime types implement the same Runtime interface, enabling seamless
 * switching between execution modes without changing agent code.
 */

import type { AgentType } from '../extensions/codex';
import type { McpServerConfig } from '../mcpConfig';

/**
 * Configuration for runtime execution
 */
export interface RuntimeExecutionConfig {
  /**
   * The agent type: 'llm' or 'computer'
   */
  agentType: AgentType;

  /**
   * Task to execute
   */
  task: string;

  /**
   * Workspace path (filesystem directory for codex, container path for cloud)
   */
  workspace: string;

  /**
   * Optional session ID for multi-turn conversations
   */
  sessionId?: string;

  /**
   * Model to use (optional override)
   */
  model?: string;

  /**
   * Reasoning effort for models that support it
   */
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';

  /**
   * MCP servers to inject (for computer-use agents).
   * Uses unified McpServerConfig type that works for both local and cloud runtimes.
   */
  mcpServers?: McpServerConfig[];
}

/**
 * Result from runtime execution
 */
export interface RuntimeExecutionResult {
  /**
   * The final output from the agent
   */
  output: string;

  /**
   * Updated session ID (for session continuity)
   */
  sessionId?: string;

  /**
   * Additional metadata from the execution
   */
  metadata?: Record<string, unknown>;
}

/**
 * Runtime interface - all execution modes must implement this
 */
export interface Runtime {
  /**
   * The type of runtime (for identification)
   */
  readonly type: 'local' | 'cloud' | 'llm';

  /**
   * Execute an agent task
   */
  execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult>;

  /**
   * Cleanup resources (optional)
   */
  cleanup?(): Promise<void>;
}

/**
 * Re-export specific runtime implementations
 */
export { LocalRuntime } from './localRuntime';
export { CloudRuntime } from './cloudRuntime';
