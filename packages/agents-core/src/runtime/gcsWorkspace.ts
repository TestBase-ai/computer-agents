/**
 * GCS Workspace Helpers
 *
 * Utilities for syncing workspaces to/from Google Cloud Storage.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { basename, resolve } from 'path';

const execAsync = promisify(exec);

// Constants (hardcoded as requested)
const WORKSPACE_BUCKET = 'testbase-workspaces';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Execute a command with exponential backoff retry logic
 */
async function execWithRetry(
  command: string,
  options: any,
  attempt: number = 1
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, options);
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString()
    };
  } catch (error: any) {
    // Don't retry if it's a "not found" error
    if (
      error.message?.includes('not found') ||
      error.message?.includes('No URLs matched') ||
      error.message?.includes('One or more URLs matched no objects')
    ) {
      throw error;
    }

    // Retry on network/transient errors
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      console.warn(
        `GCS operation failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`,
        error.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return execWithRetry(command, options, attempt + 1);
    }

    throw error;
  }
}

/**
 * Generate stable workspace ID from local path
 *
 * Creates a unique identifier for the workspace based on its absolute path.
 * Format: {folder-name}-{hash}
 *
 * @param workspacePath - Local workspace path
 * @returns Stable workspace ID
 */
export function generateWorkspaceId(workspacePath: string): string {
  // Resolve to absolute path for stability
  const absolutePath = resolve(workspacePath);

  // Create hash of path for uniqueness
  const hash = createHash('sha256')
    .update(absolutePath)
    .digest('hex')
    .substring(0, 16);

  // Extract folder name and sanitize
  const name = basename(absolutePath)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${name}-${hash}`;
}

/**
 * Upload workspace to GCS
 *
 * @param localPath - Local workspace path
 * @param workspaceId - Workspace ID in GCS
 */
export async function uploadWorkspaceToGCS(
  localPath: string,
  workspaceId: string
): Promise<void> {
  const gcsPath = `gs://${WORKSPACE_BUCKET}/${workspaceId}/`;

  try {
    // Use -c flag to compare by checksum, not just timestamps
    // This is important when syncing with gcsfuse-mounted workspaces
    await execWithRetry(
      `gsutil -m rsync -r -d -c "${localPath}/" "${gcsPath}"`,
      { timeout: 300000 } // 5 min timeout
    );
  } catch (error) {
    throw new Error(
      `Failed to upload workspace to GCS after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Download workspace from GCS
 *
 * @param workspaceId - Workspace ID in GCS
 * @param localPath - Local workspace path
 */
export async function downloadWorkspaceFromGCS(
  workspaceId: string,
  localPath: string
): Promise<void> {
  const gcsPath = `gs://${WORKSPACE_BUCKET}/${workspaceId}/`;

  try {
    // Use -c flag to compare by checksum, not just timestamps
    // This is important when syncing with gcsfuse-mounted workspaces
    await execWithRetry(
      `gsutil -m rsync -r -d -c "${gcsPath}" "${localPath}/"`,
      { timeout: 300000 } // 5 min timeout
    );
  } catch (error: any) {
    // Ignore error if workspace doesn't exist yet (first upload)
    if (!error.message?.includes('not found') && !error.message?.includes('One or more URLs matched no objects')) {
      throw new Error(
        `Failed to download workspace from GCS after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
