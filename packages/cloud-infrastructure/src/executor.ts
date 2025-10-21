/**
 * Task Executor using Codex SDK
 *
 * Handles execution of tasks via Codex SDK with GCS workspace persistence.
 * Workspaces are stored on gcsfuse-mounted GCS bucket for automatic sync.
 */

import { Codex } from '@openai/codex-sdk';
import { ensureWorkspace } from './workspace.js';
import { nanoid } from 'nanoid';
import { logger } from './logger.js';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { metrics } from './metrics.js';
import { threadCache } from './threadCache.js';
import { getDatabase } from './db/client.js';

interface ExecuteTaskConfig {
  task: string;
  workspaceId: string;
  sessionId?: string;
  mcpServers?: any[];
  apiKeyId?: string;
}

interface ExecuteTaskResult {
  output: string;
  sessionId: string;
  workspaceId: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  };
  billing?: {
    balanceAfter: number;
    totalSpent: number;
  };
}

interface SessionMetadata {
  sessionId: string;
  threadId: string;
  workspaceId: string;
  lastActivity: string;
  taskCount: number;
  created: string;
}

// Session metadata tracker
const sessionTaskCounts = new Map<string, number>();

const SESSIONS_DIR = '/mnt/workspaces/.sessions';

/**
 * Save session metadata to GCS via gcsfuse
 * This provides audit trail and session recovery metadata
 */
async function saveSessionMetadata(metadata: SessionMetadata): Promise<void> {
  try {
    await mkdir(SESSIONS_DIR, { recursive: true });
    const filePath = join(SESSIONS_DIR, `${metadata.sessionId}.json`);
    await writeFile(filePath, JSON.stringify(metadata, null, 2));
    logger.debug('Session metadata saved', { sessionId: metadata.sessionId });
  } catch (error) {
    // Non-critical - log but don't fail
    logger.warn('Failed to save session metadata', { error, sessionId: metadata.sessionId });
  }
}

/**
 * Load session metadata from GCS via gcsfuse
 */
async function loadSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
  try {
    const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Execute a task using Codex SDK
 *
 * Flow:
 * 1. Ensure workspace directory exists on gcsfuse mount
 * 2. Execute task via Codex SDK (writes directly to GCS via gcsfuse)
 * 3. Return result (no upload needed - gcsfuse handles sync)
 */
export async function executeTask(
  config: ExecuteTaskConfig
): Promise<ExecuteTaskResult> {
  const { task, workspaceId, sessionId, mcpServers, apiKeyId } = config;

  // Generate session ID if not provided
  const finalSessionId = sessionId || nanoid();

  const startTime = Date.now();

  try {
    // Track execution start
    metrics.startExecution(finalSessionId);
    // 1. Ensure workspace exists on gcsfuse mount
    logger.info('Ensuring workspace directory', { workspaceId });
    const workspacePath = await ensureWorkspace(workspaceId);

    // 2. Initialize Codex SDK with explicit API key
    const codex = new Codex({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 3. Get or create thread
    let thread;
    let isNewSession = false;
    if (sessionId) {
      // Try to get thread from cache (checks memory + GCS)
      const cachedThread = await threadCache.get(sessionId);
      if (cachedThread) {
        thread = cachedThread;
        logger.info('Resuming existing thread from cache', { sessionId });
      } else {
        // Thread not in cache, start new thread
        thread = codex.startThread({
          workingDirectory: workspacePath,
          sandboxMode: 'danger-full-access',
          skipGitRepoCheck: false,
          ...(mcpServers ? { mcpServers } : {}),
        });
        isNewSession = true;
        logger.info('Started new thread for session ID', { sessionId: finalSessionId });
      }
    } else {
      // No session ID provided, create new session
      thread = codex.startThread({
        workingDirectory: workspacePath,
        sandboxMode: 'danger-full-access',
        skipGitRepoCheck: false,
        ...(mcpServers ? { mcpServers } : {}),
      });
      isNewSession = true;
      logger.info('Started new thread (no session ID provided)', { sessionId: finalSessionId });
    }

    // 4. Execute task
    logger.info('Executing task via Codex SDK', {
      task: task.substring(0, 100) + (task.length > 100 ? '...' : ''),
      workspaceId,
      workspacePath,
    });

    const turn = await thread.run(task);

    // 5. Cache thread for session continuity (memory + GCS persistence)
    if (thread.id) {
      await threadCache.set(thread.id, thread, workspaceId);
      logger.info('Thread cached for continuity', { threadId: thread.id });
    }

    // 6. Update task count
    const currentCount = sessionTaskCounts.get(thread.id || finalSessionId) || 0;
    sessionTaskCounts.set(thread.id || finalSessionId, currentCount + 1);

    // 7. Save session metadata to GCS (audit trail + recovery info)
    const metadata: SessionMetadata = {
      sessionId: thread.id || finalSessionId,
      threadId: thread.id || finalSessionId,
      workspaceId,
      lastActivity: new Date().toISOString(),
      taskCount: currentCount + 1,
      created: isNewSession ? new Date().toISOString() : (await loadSessionMetadata(thread.id || finalSessionId))?.created || new Date().toISOString(),
    };
    await saveSessionMetadata(metadata);

    // 8. No upload needed - gcsfuse automatically syncs to GCS
    logger.info('Task completed (workspace auto-synced via gcsfuse)', {
      workspaceId,
    });

    // Track successful execution
    metrics.recordExecution({
      workspaceId,
      sessionId: thread.id || finalSessionId,
      startTime,
      endTime: Date.now(),
      success: true,
    });

    // 9. Track billing and usage (if apiKeyId provided)
    let usageInfo;
    let billingInfo;

    if (apiKeyId) {
      try {
        const db = getDatabase();
        const apiKey = db.getApiKey(apiKeyId);

        if (apiKey) {
          // Extract usage from Codex SDK response
          // Note: Codex SDK returns usage in turn object
          const inputTokens = (turn as any).usage?.input_tokens || 0;
          const outputTokens = (turn as any).usage?.output_tokens || 0;
          const totalTokens = inputTokens + outputTokens;

          if (totalTokens > 0) {
            // Calculate costs
            const costs = db.billing.calculateCost(inputTokens, outputTokens);

            usageInfo = {
              inputTokens,
              outputTokens,
              totalTokens,
              totalCost: costs.totalCost,
            };

            // Only bill standard keys (internal keys have unlimited usage)
            if (apiKey.keyType === 'standard') {
              // Record usage
              db.billing.recordUsage({
                apiKeyId,
                sessionId: thread.id || finalSessionId,
                workspaceId,
                timestamp: new Date().toISOString(),
                inputTokens,
                outputTokens,
                totalTokens,
                inputCost: costs.inputCost,
                outputCost: costs.outputCost,
                totalCost: costs.totalCost,
                model: 'codex-computer',
                duration: Date.now() - startTime,
                status: 'success',
                endpoint: '/execute',
              });

              // Deduct from balance
              const updatedAccount = db.billing.deductUsage(
                apiKeyId,
                costs.totalCost,
                `Task execution: ${workspaceId}`
              );

              billingInfo = {
                balanceAfter: updatedAccount.creditsBalance,
                totalSpent: updatedAccount.totalSpent,
              };

              logger.info('Usage tracked and billed', {
                apiKeyId,
                totalCost: costs.totalCost,
                balanceAfter: updatedAccount.creditsBalance,
              });
            } else {
              logger.info('Usage tracked (internal key - no billing)', {
                apiKeyId,
                totalTokens,
                keyType: apiKey.keyType,
              });
            }
          }
        }
      } catch (error) {
        // Non-critical - log but don't fail execution
        logger.error('Failed to track billing', { error, apiKeyId });
      }
    }

    return {
      output: turn.finalResponse,
      sessionId: thread.id || finalSessionId,
      workspaceId,
      usage: usageInfo,
      billing: billingInfo,
    };
  } catch (error) {
    logger.error('Task execution failed', error);

    // Track failed execution
    metrics.recordExecution({
      workspaceId,
      sessionId: finalSessionId,
      startTime,
      endTime: Date.now(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Clear thread cache (for memory management)
 * Note: Only clears memory cache, GCS metadata is preserved
 */
export function clearThreadCache(): void {
  threadCache.clear();
  logger.info('Thread cache cleared (memory only)');
}

/**
 * Cleanup stale thread metadata from GCS
 * Should be called on server startup
 */
export async function cleanupStaleThreads(): Promise<void> {
  logger.info('Starting thread cache cleanup...');
  const result = await threadCache.cleanupStaleMetadata();
  logger.info('Thread cache cleanup completed', result);
}

/**
 * Get thread cache statistics
 */
export function getThreadCacheStats() {
  return threadCache.getStats();
}
