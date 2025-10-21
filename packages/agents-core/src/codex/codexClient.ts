/**
 * CodexClient - Clean wrapper around @openai/codex-sdk
 *
 * Provides thread management and session continuity for computer-use agents.
 * Replaces the previous CLI spawning approach with the official Codex SDK.
 *
 * NOTE: Uses dynamic imports for Codex SDK to handle ESM/CJS compatibility.
 */

import type { ThreadOptions, RunResult as CodexRunResult } from '@openai/codex-sdk';
import type { McpServerConfig } from '../mcpConfig';
import { mcpConfigsToCodexFormat } from '../mcpConverters';

/**
 * Configuration for executing a task via Codex.
 */
export interface CodexExecutionConfig {
  /**
   * The task/prompt to send to Codex.
   */
  task: string;

  /**
   * Working directory for Codex (must be a git repository by default).
   */
  workspace: string;

  /**
   * Thread ID to resume (for session continuity).
   * If provided, the task will continue the existing conversation.
   * If omitted, a new thread will be started.
   */
  threadId?: string;

  /**
   * Model to use (e.g., 'gpt-4o', 'gpt-5-mini').
   */
  model?: string;

  /**
   * MCP servers to make available to Codex.
   * Uses unified McpServerConfig that works across all agent types.
   */
  mcpServers?: McpServerConfig[];

  /**
   * Skip git repository check (useful for non-git workspaces).
   * @default false
   */
  skipGitRepoCheck?: boolean;

  /**
   * Sandbox mode for Codex execution.
   * @default 'danger-full-access' (required for file changes)
   */
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
}

/**
 * Result from Codex execution.
 */
export interface CodexExecutionResult {
  /**
   * The final response text from Codex.
   */
  output: string;

  /**
   * Thread ID (for session continuity on next execution).
   */
  threadId: string;

  /**
   * Full turn result with items and usage stats.
   */
  turn: CodexRunResult;
}

/**
 * CodexClient manages Codex SDK threads and provides a clean execution API.
 *
 * Key features:
 * - Automatic thread management (create or resume)
 * - Session continuity via thread IDs
 * - No process spawning (uses official Codex SDK)
 * - Clean async/await API
 *
 * @example
 * ```typescript
 * const client = new CodexClient();
 *
 * // First execution - new thread
 * const result1 = await client.execute({
 *   task: 'Create hello.py',
 *   workspace: './repo',
 * });
 *
 * // Second execution - continues thread
 * const result2 = await client.execute({
 *   task: 'Add a main function',
 *   workspace: './repo',
 *   threadId: result1.threadId,
 * });
 * ```
 */
export class CodexClient {
  private codex: any; // Codex instance (loaded dynamically)
  private threadCache: Map<string, any>; // threadId → Thread instance
  private codexSdkPromise: Promise<any> | null = null;

  constructor() {
    this.threadCache = new Map();
  }

  /**
   * Lazy-load the Codex SDK (ESM-only package).
   * Uses dynamic import for CJS compatibility.
   *
   * Note: We use eval to preserve the dynamic import() in the compiled output
   * when targeting CommonJS. This allows Node.js to load ESM-only packages
   * from CommonJS modules.
   */
  private async getCodexSdk(): Promise<any> {
    if (this.codexSdkPromise) {
      return this.codexSdkPromise;
    }

    // Use eval to preserve dynamic import in CommonJS output
    // This prevents TypeScript from converting import() to require()
    // The indirect eval call ensures it runs in the global scope
    const importFn = (0, eval)("(specifier) => import(specifier)");

    this.codexSdkPromise = importFn('@openai/codex-sdk').then((mod: any) => {
      this.codex = new mod.Codex();
      return this.codex;
    });

    return this.codexSdkPromise;
  }

  /**
   * Execute a task via Codex, creating or resuming a thread as needed.
   *
   * @param config - Execution configuration
   * @returns Execution result with output and thread ID
   */
  async execute(config: CodexExecutionConfig): Promise<CodexExecutionResult> {
    const {
      task,
      workspace,
      threadId,
      model,
      mcpServers,
      skipGitRepoCheck = false,
      sandboxMode = 'danger-full-access',
    } = config;

    // Ensure Codex SDK is loaded
    const codex = await this.getCodexSdk();

    // Convert unified MCP configs to Codex SDK format if provided
    const codexMcpServers = mcpServers
      ? mcpConfigsToCodexFormat(mcpServers)
      : undefined;

    // Thread options for Codex SDK
    const threadOptions: ThreadOptions = {
      workingDirectory: workspace,
      model,
      skipGitRepoCheck,
      sandboxMode,
      // Pass MCP servers if the Codex SDK supports it
      // (This will be type-safe once Codex SDK adds proper type definitions)
      ...(codexMcpServers ? { mcpServers: codexMcpServers } : {}),
    } as ThreadOptions;

    // Get or create thread
    let thread;
    let finalThreadId: string;

    if (threadId) {
      // Resume existing thread
      if (this.threadCache.has(threadId)) {
        thread = this.threadCache.get(threadId);
      } else {
        thread = codex.resumeThread(threadId, threadOptions);
        this.threadCache.set(threadId, thread);
      }
      finalThreadId = threadId;
    } else {
      // Start new thread
      thread = codex.startThread(threadOptions);
      // Thread ID is available after first run
      finalThreadId = ''; // Will be set after run completes
    }

    // Execute the task
    const turn = await thread.run(task);

    // Get thread ID (now available after first run)
    if (!finalThreadId && thread.id) {
      finalThreadId = thread.id;
      this.threadCache.set(finalThreadId, thread);
    }

    if (!finalThreadId) {
      throw new Error('Failed to get thread ID from Codex SDK');
    }

    return {
      output: turn.finalResponse,
      threadId: finalThreadId,
      turn,
    };
  }

  /**
   * Clear the thread cache to free memory.
   * Call this when you're done with long-running sessions.
   */
  clearCache(): void {
    this.threadCache.clear();
  }

  /**
   * Remove a specific thread from the cache.
   *
   * @param threadId - Thread ID to remove
   */
  removeThread(threadId: string): void {
    this.threadCache.delete(threadId);
  }
}
