/**
 * WorkspaceSync - Synchronize workspaces between local and cloud storage
 *
 * Provides bidirectional sync, conflict resolution, and incremental updates.
 */

import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import type {
  WorkspaceStorage,
  SyncResult,
  SyncConflict,
} from './StorageInterface';

export interface WorkspaceSyncConfig {
  /**
   * Conflict resolution strategy
   */
  conflictResolution?: 'local' | 'remote' | 'newest' | 'manual';

  /**
   * Patterns to exclude from sync (glob patterns)
   */
  excludePatterns?: string[];

  /**
   * Maximum file size to sync (bytes)
   */
  maxFileSize?: number;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

interface FileManifest {
  [path: string]: {
    size: number;
    modified: Date;
    hash?: string;
  };
}

/**
 * Workspace synchronization implementation.
 *
 * Supports:
 * - Bidirectional sync (local ↔ cloud)
 * - Incremental updates (only changed files)
 * - Conflict detection and resolution
 * - Exclude patterns (.gitignore style)
 */
export class WorkspaceSync {
  private config: Required<WorkspaceSyncConfig>;

  constructor(config: WorkspaceSyncConfig = {}) {
    this.config = {
      conflictResolution: config.conflictResolution ?? 'newest',
      excludePatterns: config.excludePatterns ?? [
        'node_modules/**',
        '.git/**',
        '*.log',
        '.DS_Store',
        'dist/**',
        'build/**',
      ],
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024, // 100MB
      verbose: config.verbose ?? false,
    };
  }

  /**
   * Sync workspace between local and remote storage
   */
  async sync(
    localStorage: string,
    remoteStorage: WorkspaceStorage,
    remotePath: string,
    direction: 'upload' | 'download' | 'bidirectional'
  ): Promise<SyncResult> {
    const startTime = Date.now();
    let filesUploaded = 0;
    let filesDownloaded = 0;
    let filesDeleted = 0;
    let bytesTransferred = 0;
    const conflicts: SyncConflict[] = [];

    try {
      // Build manifests
      const localManifest = await this.buildLocalManifest(localStorage);
      const remoteManifest = await this.buildRemoteManifest(remoteStorage, remotePath);

      if (direction === 'upload' || direction === 'bidirectional') {
        // Upload: local → remote
        const uploadResult = await this.syncLocalToRemote(
          localStorage,
          remoteStorage,
          remotePath,
          localManifest,
          remoteManifest,
          direction === 'bidirectional' ? conflicts : undefined
        );
        filesUploaded = uploadResult.filesTransferred;
        bytesTransferred += uploadResult.bytesTransferred;
      }

      if (direction === 'download' || direction === 'bidirectional') {
        // Download: remote → local
        const downloadResult = await this.syncRemoteToLocal(
          localStorage,
          remoteStorage,
          remotePath,
          localManifest,
          remoteManifest,
          direction === 'bidirectional' ? conflicts : undefined
        );
        filesDownloaded = downloadResult.filesTransferred;
        bytesTransferred += downloadResult.bytesTransferred;
      }

      return {
        filesUploaded,
        filesDownloaded,
        filesDeleted,
        bytesTransferred,
        duration: Date.now() - startTime,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      this.log(`Sync error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Sync local files to remote
   */
  private async syncLocalToRemote(
    localStorage: string,
    remoteStorage: WorkspaceStorage,
    remotePath: string,
    localManifest: FileManifest,
    remoteManifest: FileManifest,
    conflicts?: SyncConflict[]
  ): Promise<{ filesTransferred: number; bytesTransferred: number }> {
    let filesTransferred = 0;
    let bytesTransferred = 0;

    for (const [localPath, localInfo] of Object.entries(localManifest)) {
      const remoteInfo = remoteManifest[localPath];

      // Check for conflicts (both modified)
      if (remoteInfo && conflicts) {
        if (Math.abs(remoteInfo.modified.getTime() - localInfo.modified.getTime()) > 1000) {
          const conflict: SyncConflict = {
            path: localPath,
            localModified: localInfo.modified,
            remoteModified: remoteInfo.modified,
            resolution:
              this.config.conflictResolution === 'newest'
                ? localInfo.modified > remoteInfo.modified
                  ? 'local'
                  : 'remote'
                : (this.config.conflictResolution as any),
          };
          conflicts.push(conflict);

          // Skip if remote should win
          if (conflict.resolution === 'remote') {
            continue;
          }
        }
      }

      // Upload if new or modified
      if (!remoteInfo || localInfo.modified > remoteInfo.modified) {
        this.log(`Uploading: ${localPath}`);
        const content = await readFile(join(localStorage, localPath));
        const fullRemotePath = join(remotePath, localPath);
        await remoteStorage.writeBuffer(fullRemotePath, content);

        filesTransferred++;
        bytesTransferred += localInfo.size;
      }
    }

    return { filesTransferred, bytesTransferred };
  }

  /**
   * Sync remote files to local
   */
  private async syncRemoteToLocal(
    localStorage: string,
    remoteStorage: WorkspaceStorage,
    _remotePath: string,
    localManifest: FileManifest,
    remoteManifest: FileManifest,
    conflicts?: SyncConflict[]
  ): Promise<{ filesTransferred: number; bytesTransferred: number }> {
    let filesTransferred = 0;
    let bytesTransferred = 0;

    for (const [remoteFilePath, remoteInfo] of Object.entries(remoteManifest)) {
      const localInfo = localManifest[remoteFilePath];

      // Skip files that were already handled as conflicts
      if (conflicts && localInfo) {
        const existingConflict = conflicts.find((c) => c.path === remoteFilePath);
        if (existingConflict && existingConflict.resolution === 'local') {
          continue;
        }
      }

      // Download if new or modified
      if (!localInfo || remoteInfo.modified > localInfo.modified) {
        this.log(`Downloading: ${remoteFilePath}`);
        const fullRemotePath = join(_remotePath, remoteFilePath);
        const content = await remoteStorage.readBuffer(fullRemotePath);
        const localPath = join(localStorage, remoteFilePath);

        await mkdir(dirname(localPath), { recursive: true });
        await writeFile(localPath, content);

        filesTransferred++;
        bytesTransferred += remoteInfo.size;
      }
    }

    return { filesTransferred, bytesTransferred };
  }

  /**
   * Build manifest of local files
   */
  private async buildLocalManifest(localPath: string): Promise<FileManifest> {
    const manifest: FileManifest = {};

    const traverse = async (dir: string, basePath: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = relative(basePath, fullPath);

        // Skip excluded patterns
        if (this.shouldExclude(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await traverse(fullPath, basePath);
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);

          // Skip files that are too large
          if (stats.size > this.config.maxFileSize) {
            this.log(`Skipping large file: ${relativePath} (${stats.size} bytes)`);
            continue;
          }

          manifest[relativePath] = {
            size: stats.size,
            modified: stats.mtime,
          };
        }
      }
    };

    await traverse(localPath, localPath);
    return manifest;
  }

  /**
   * Build manifest of remote files
   */
  private async buildRemoteManifest(
    storage: WorkspaceStorage,
    remotePath: string
  ): Promise<FileManifest> {
    const manifest: FileManifest = {};

    try {
      const files = await storage.listFiles(remotePath, { recursive: true });

      for (const file of files) {
        if (file.isDirectory) continue;

        const relativePath = relative(remotePath, file.path);

        // Skip excluded patterns
        if (this.shouldExclude(relativePath)) {
          continue;
        }

        // Skip files that are too large
        if (file.size > this.config.maxFileSize) {
          this.log(`Skipping large file: ${relativePath} (${file.size} bytes)`);
          continue;
        }

        manifest[relativePath] = {
          size: file.size,
          modified: file.lastModified,
        };
      }
    } catch (error: any) {
      // If remote path doesn't exist, return empty manifest
      if (error.code === 404 || error.code === 'ENOENT') {
        return manifest;
      }
      throw error;
    }

    return manifest;
  }

  /**
   * Check if file should be excluded based on patterns
   */
  private shouldExclude(path: string): boolean {
    // Simple glob matching (simplified version)
    return this.config.excludePatterns.some((pattern) => {
      const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');
      return new RegExp(`^${regex}$`).test(path);
    });
  }

  /**
   * Log message if verbose mode enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[WorkspaceSync] ${message}`);
    }
  }
}
