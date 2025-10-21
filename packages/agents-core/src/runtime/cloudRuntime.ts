/**
 * CloudRuntime - Simplified GCE-based execution
 *
 * Architecture (default mode with workspace sync):
 * 1. Upload workspace to GCS
 * 2. POST to GCE VM (executes via Codex SDK)
 * 3. Download workspace from GCS (get updates)
 *
 * Cloud-only mode (skipWorkspaceSync: true):
 * 1. Skip upload (fresh cloud workspace)
 * 2. POST to GCE VM (executes via Codex SDK)
 * 3. Skip download (results stay in cloud)
 *
 * No container management, no complex lifecycle - just simple HTTP calls.
 */

import type { Runtime, RuntimeExecutionConfig, RuntimeExecutionResult } from './index';
import { uploadWorkspaceToGCS, downloadWorkspaceFromGCS, generateWorkspaceId } from './gcsWorkspace';
import logger from '../logger';

// Hardcoded constants (as requested - no user configuration)
const GCP_PROJECT = 'firechatbot-a9654';
const API_URL = 'http://34.170.205.13:8080'; // Hardcoded - no user override

export interface CloudRuntimeConfig {
  /**
   * API key for authentication (required)
   * Can also be set via TESTBASE_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Request timeout in milliseconds
   * @default 600000 (10 minutes)
   */
  timeout?: number;

  /**
   * Skip local workspace sync (upload/download)
   * When true, agent runs in a fresh cloud workspace without syncing local files
   * Useful for CI/CD, isolated tasks, or faster execution
   * @default false
   */
  skipWorkspaceSync?: boolean;
}

/**
 * Simplified CloudRuntime for GCE-based execution.
 *
 * @example
 * With workspace sync (default):
 * ```typescript
 * const runtime = new CloudRuntime({
 *   apiKey: process.env.TESTBASE_API_KEY,
 *   debug: true
 * });
 *
 * const agent = new Agent({
 *   agentType: 'computer',
 *   runtime,
 *   workspace: './my-project'  // Syncs to/from cloud
 * });
 *
 * const result = await run(agent, 'Create app.py');
 * ```
 *
 * @example
 * Cloud-only mode (no local sync):
 * ```typescript
 * const runtime = new CloudRuntime({
 *   apiKey: process.env.TESTBASE_API_KEY,
 *   skipWorkspaceSync: true,  // No upload/download
 *   debug: true
 * });
 *
 * const agent = new Agent({
 *   agentType: 'computer',
 *   runtime,
 *   workspace: './cloud-workspace'  // Not synced, just a placeholder
 * });
 *
 * const result = await run(agent, 'Create app.py');
 * // Files created in fresh cloud workspace, not downloaded locally
 * ```
 */
export class CloudRuntime implements Runtime {
  readonly type = 'cloud' as const;
  private config: Required<CloudRuntimeConfig>;

  constructor(config: CloudRuntimeConfig = {}) {
    // Get API key from config or environment variable
    const apiKey = config.apiKey || process.env.TESTBASE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'CloudRuntime requires an API key. Provide it via:\n' +
        '1. CloudRuntimeConfig: new CloudRuntime({ apiKey: "..." })\n' +
        '2. Environment variable: TESTBASE_API_KEY=...'
      );
    }

    this.config = {
      apiKey,
      debug: config.debug ?? false,
      timeout: config.timeout ?? 600000, // 10 min default
      skipWorkspaceSync: config.skipWorkspaceSync ?? false,
    };
  }

  async execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult> {
    const { agentType, task, workspace, sessionId, mcpServers } = config;

    if (agentType === 'llm') {
      throw new Error(
        'CloudRuntime is only for computer-use agents. LLM agents use the standard model provider system.'
      );
    }

    // Generate workspace ID
    // - If skipWorkspaceSync: random ID for fresh cloud workspace
    // - Otherwise: stable ID from local path
    const workspaceId = this.config.skipWorkspaceSync
      ? `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      : generateWorkspaceId(workspace);

    if (this.config.debug) {
      logger.debug('[CloudRuntime] Starting execution', {
        workspaceId,
        sessionId,
        workspace,
        skipWorkspaceSync: this.config.skipWorkspaceSync,
        apiUrl: API_URL,
      });
    }

    try {
      // Step 1: Upload workspace to GCS (skip if cloud-only mode)
      if (!this.config.skipWorkspaceSync) {
        if (this.config.debug) {
          logger.debug('[CloudRuntime] Uploading workspace to GCS', { workspaceId });
        }
        await uploadWorkspaceToGCS(workspace, workspaceId);
      } else if (this.config.debug) {
        logger.debug('[CloudRuntime] Skipping workspace upload (cloud-only mode)');
      }

      // Step 2: Execute on GCE VM
      if (this.config.debug) {
        logger.debug('[CloudRuntime] Executing on GCE VM', { task: task.substring(0, 100) });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          task,
          workspaceId,
          sessionId,
          mcpServers,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Special handling for authentication errors
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Authentication failed. Check your TESTBASE_API_KEY:\n' +
            `${errorData.message || response.statusText}\n\n` +
            'Set your API key via:\n' +
            '1. CloudRuntimeConfig: new CloudRuntime({ apiKey: "..." })\n' +
            '2. Environment variable: export TESTBASE_API_KEY=...'
          );
        }

        throw new Error(
          `GCE execution failed: ${response.status} ${errorData.message || response.statusText}`
        );
      }

      const result = await response.json();

      // Step 3: Download workspace from GCS (skip if cloud-only mode)
      if (!this.config.skipWorkspaceSync) {
        if (this.config.debug) {
          logger.debug('[CloudRuntime] Downloading workspace from GCS', { workspaceId });
        }
        await downloadWorkspaceFromGCS(workspaceId, workspace);
      } else if (this.config.debug) {
        logger.debug('[CloudRuntime] Skipping workspace download (cloud-only mode)');
      }

      if (this.config.debug) {
        logger.debug('[CloudRuntime] Execution completed', {
          sessionId: result.sessionId,
          outputLength: result.output?.length || 0,
          cloudOnly: this.config.skipWorkspaceSync,
        });
      }

      return {
        output: result.output,
        sessionId: result.sessionId,
        metadata: {
          runtime: 'cloud',
          workspaceId: result.workspaceId,
          project: GCP_PROJECT,
          apiUrl: API_URL,
        },
      };
    } catch (error) {
      if (this.config.debug) {
        logger.error('[CloudRuntime] Execution failed', error);
      }

      // Categorize and provide helpful error messages
      const errorMessage = (error as Error).message || String(error);

      if ((error as Error).name === 'AbortError') {
        throw new Error(
          `CloudRuntime execution timed out after ${this.config.timeout}ms. ` +
          `The task may be taking too long, or the VM may be unresponsive. ` +
          `Try increasing timeout or check VM status.`
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        throw new Error(
          `Failed to connect to CloudRuntime API at ${API_URL}. ` +
          `Possible causes:\n` +
          `  - VM is not running (check: gcloud compute instances list)\n` +
          `  - Service is not started (check: sudo systemctl status testbase-cloud)\n` +
          `  - Firewall blocking port 8080\n` +
          `  - Wrong API_URL configured`
        );
      }

      if (errorMessage.includes('404')) {
        throw new Error(
          `CloudRuntime API endpoint not found (404). ` +
          `Ensure the server is running the latest version with /execute endpoint.`
        );
      }

      if (errorMessage.includes('500') || errorMessage.includes('GCE execution failed')) {
        throw new Error(
          `CloudRuntime server error (500). Check server logs:\n` +
          `  gcloud compute ssh testbase-ubuntu-vm --command='sudo journalctl -u testbase-cloud -n 50'\n` +
          `Error details: ${errorMessage}`
        );
      }

      if (errorMessage.includes('workspace') || errorMessage.includes('GCS')) {
        throw new Error(
          `Workspace sync failed. Possible causes:\n` +
          `  - GCS bucket permissions issue\n` +
          `  - gcsfuse not mounted on VM\n` +
          `  - Network connectivity to GCS\n` +
          `Error details: ${errorMessage}`
        );
      }

      // Generic error with context
      throw new Error(
        `CloudRuntime execution failed: ${errorMessage}\n\n` +
        `Debug steps:\n` +
        `  1. Check VM health: curl ${API_URL}/health\n` +
        `  2. Check VM logs: gcloud compute ssh testbase-ubuntu-vm --command='sudo journalctl -u testbase-cloud -n 50'\n` +
        `  3. Verify gcsfuse mount: gcloud compute ssh testbase-ubuntu-vm --command='mount | grep gcsfuse'`
      );
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed - VMs are long-running, GCS persists
    if (this.config.debug) {
      logger.debug('[CloudRuntime] No cleanup needed (stateless architecture)');
    }
  }
}
