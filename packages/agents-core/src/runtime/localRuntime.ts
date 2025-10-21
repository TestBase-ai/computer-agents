/**
 * LocalRuntime - Executes agents using Codex SDK
 *
 * This runtime uses the official @openai/codex-sdk for clean, reliable execution.
 * No process spawning, no config file manipulation - just clean async/await.
 */

import { mkdir } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import type { Runtime, RuntimeExecutionConfig, RuntimeExecutionResult } from './index';
import { CodexClient } from '../codex/codexClient';

export interface LocalRuntimeConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Skip git repository check for workspace.
   * Set to true to allow execution in non-git directories.
   * @default true (allows execution in any directory)
   */
  skipGitRepoCheck?: boolean;
}

/**
 * Runtime for executing agents locally using Codex SDK.
 *
 * This runtime:
 * - Uses the official @openai/codex-sdk (no CLI spawning)
 * - Maintains session continuity via thread IDs
 * - Creates workspace directories as needed
 * - Provides clean async/await API
 *
 * @example
 * ```typescript
 * const runtime = new LocalRuntime();
 * const result = await runtime.execute({
 *   agentType: 'computer',
 *   task: 'Create a hello.py file',
 *   workspace: './my-repo',
 * });
 * ```
 */
export class LocalRuntime implements Runtime {
  readonly type = 'local' as const;
  private config: LocalRuntimeConfig;
  private codexClient: CodexClient;

  constructor(config: LocalRuntimeConfig = {}) {
    this.config = config;
    this.codexClient = new CodexClient();
  }

  async execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult> {
    const {
      agentType,
      task,
      workspace,
      sessionId,
      model,
      mcpServers,
    } = config;

    if (agentType === 'llm') {
      throw new Error(
        'LocalRuntime is only for computer-use agents. LLM agents use the standard model provider system.'
      );
    }

    // Ensure workspace exists and resolve to absolute path
    const repoPath = isAbsolute(workspace) ? workspace : resolve(workspace);
    await mkdir(repoPath, { recursive: true });

    if (this.config.debug) {
      console.log('[LocalRuntime] Executing computer-use agent:', {
        workspace: repoPath,
        threadId: sessionId,
        model,
        mcpServers: mcpServers?.length || 0,
      });
    }

    try {
      // Execute via Codex SDK
      const result = await this.codexClient.execute({
        task,
        workspace: repoPath,
        threadId: sessionId,
        model,
        mcpServers, // Pass unified MCP server configs
        skipGitRepoCheck: this.config.skipGitRepoCheck ?? true, // Default: allow non-git directories
        sandboxMode: 'danger-full-access', // Required for file changes
      });

      if (this.config.debug) {
        console.log('[LocalRuntime] Execution completed:', {
          threadId: result.threadId,
          outputLength: result.output.length,
        });
      }

      return {
        output: result.output,
        sessionId: result.threadId,
        metadata: {
          runtime: 'local',
          workspace: repoPath,
          usage: result.turn.usage,
        },
      };
    } catch (error) {
      if (this.config.debug) {
        console.error('[LocalRuntime] Execution failed:', error);
      }
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Clear thread cache to free memory
    this.codexClient.clearCache();

    if (this.config.debug) {
      console.log('[LocalRuntime] Thread cache cleared');
    }
  }
}
