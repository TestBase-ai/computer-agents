/**
 * GCS Workspace Management
 *
 * Manages workspace directories on gcsfuse-mounted GCS bucket.
 * The bucket is mounted at /mnt/workspaces via gcsfuse, so all operations
 * are direct filesystem operations with automatic GCS sync.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { logger } from './logger.js';

const execAsync = promisify(exec);

// Constants
const WORKSPACES_MOUNT = '/mnt/workspaces';

/**
 * Ensure workspace directory exists and initialize git repo if needed
 */
export async function ensureWorkspace(workspaceId: string): Promise<string> {
  const workspacePath = `${WORKSPACES_MOUNT}/${workspaceId}`;

  // Ensure workspace directory exists
  await mkdir(workspacePath, { recursive: true });

  // Always ensure git repo exists
  try {
    await execAsync(`cd "${workspacePath}" && git status`, { timeout: 5000 });
    logger.debug('Git repo already exists', { workspaceId, workspacePath });
  } catch {
    // Initialize git repo if not present
    await execAsync(`cd "${workspacePath}" && git init`, { timeout: 10000 });
    await execAsync(
      `cd "${workspacePath}" && git config user.email "agent@testbase.ai"`,
      { timeout: 10000 }
    );
    await execAsync(
      `cd "${workspacePath}" && git config user.name "Testbase Agent"`,
      { timeout: 10000 }
    );
    logger.info('Git repository initialized', { workspaceId, workspacePath });
  }

  return workspacePath;
}
