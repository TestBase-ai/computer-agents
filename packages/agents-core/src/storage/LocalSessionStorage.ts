/**
 * LocalSessionStorage - Filesystem-based session storage
 *
 * Stores session artifacts on the local filesystem.
 * Default implementation for local execution.
 */

import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  stat,
  rm,
  copyFile,
} from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
  SessionStorage,
  StorageMetadata,
  StorageFileInfo,
  ReadFileOptions,
  WriteFileOptions,
  ListFilesOptions,
} from './StorageInterface';

export interface LocalSessionStorageConfig {
  basePath: string;
}

/**
 * Filesystem-based session storage implementation.
 *
 * Directory structure:
 * ```
 * basePath/
 * └── {sessionId}/
 *     ├── session.json
 *     ├── {agentName}/
 *     │   ├── thread.json
 *     │   ├── turn-001.json
 *     │   └── artifacts/
 *     └── ...
 * ```
 */
export class LocalSessionStorage implements SessionStorage {
  readonly type = 'local' as const;
  private basePath: string;

  constructor(config: LocalSessionStorageConfig) {
    this.basePath = config.basePath;
  }

  /**
   * Get the root directory for a session
   */
  getSessionRoot(sessionId: string): string {
    return join(this.basePath, sessionId);
  }

  /**
   * Get the directory for a specific agent in a session
   */
  private getAgentDir(sessionId: string, agentName: string): string {
    return join(this.getSessionRoot(sessionId), agentName);
  }

  // Session-specific methods

  async saveSessionMetadata(sessionId: string, metadata: StorageMetadata): Promise<void> {
    const sessionRoot = this.getSessionRoot(sessionId);
    await mkdir(sessionRoot, { recursive: true });
    const sessionFile = join(sessionRoot, 'session.json');

    // Merge with existing metadata
    let existing: StorageMetadata = {};
    try {
      const content = await readFile(sessionFile, 'utf8');
      existing = JSON.parse(content);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    const merged: StorageMetadata = {
      ...existing,
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    if (!merged.createdAt) {
      merged.createdAt = new Date().toISOString();
    }

    await writeFile(sessionFile, JSON.stringify(merged, null, 2), 'utf8');
  }

  async loadSessionMetadata(sessionId: string): Promise<StorageMetadata | null> {
    try {
      const sessionFile = join(this.getSessionRoot(sessionId), 'session.json');
      const content = await readFile(sessionFile, 'utf8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async saveAgentTurn(
    sessionId: string,
    agentName: string,
    turnNumber: number,
    turnData: StorageMetadata
  ): Promise<void> {
    const agentDir = this.getAgentDir(sessionId, agentName);
    await mkdir(agentDir, { recursive: true });
    const filename = join(agentDir, `turn-${String(turnNumber).padStart(3, '0')}.json`);
    await writeFile(filename, JSON.stringify(turnData, null, 2), 'utf8');
  }

  async loadAgentTurn(
    sessionId: string,
    agentName: string,
    turnNumber: number
  ): Promise<StorageMetadata | null> {
    try {
      const filename = join(
        this.getAgentDir(sessionId, agentName),
        `turn-${String(turnNumber).padStart(3, '0')}.json`
      );
      const content = await readFile(filename, 'utf8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async saveArtifact(
    sessionId: string,
    agentName: string,
    filename: string,
    content: string
  ): Promise<void> {
    const agentDir = this.getAgentDir(sessionId, agentName);
    await mkdir(agentDir, { recursive: true });
    const filepath = join(agentDir, filename);
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, content, 'utf8');
  }

  async loadArtifact(
    sessionId: string,
    agentName: string,
    filename: string
  ): Promise<string | null> {
    try {
      const filepath = join(this.getAgentDir(sessionId, agentName), filename);
      return await readFile(filepath, 'utf8');
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async listSessions(): Promise<string[]> {
    try {
      await mkdir(this.basePath, { recursive: true });
      const entries = await readdir(this.basePath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionRoot = this.getSessionRoot(sessionId);
    await rm(sessionRoot, { recursive: true, force: true });
  }

  // Generic storage methods

  async readFile(path: string, options?: ReadFileOptions): Promise<string> {
    const encoding = options?.encoding ?? 'utf8';
    return await readFile(join(this.basePath, path), encoding);
  }

  async writeFile(
    path: string,
    content: string,
    options?: WriteFileOptions
  ): Promise<void> {
    const encoding = options?.encoding ?? 'utf8';
    const filepath = join(this.basePath, path);
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, content, encoding);
  }

  async readBuffer(path: string): Promise<Buffer> {
    return await readFile(join(this.basePath, path));
  }

  async writeBuffer(
    path: string,
    content: Buffer,
    options?: WriteFileOptions
  ): Promise<void> {
    const filepath = join(this.basePath, path);
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(join(this.basePath, path));
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(path: string): Promise<void> {
    await rm(join(this.basePath, path), { force: true });
  }

  async listFiles(
    path: string,
    options?: ListFilesOptions
  ): Promise<StorageFileInfo[]> {
    const fullPath = join(this.basePath, path);
    const entries = await readdir(fullPath, { withFileTypes: true });
    const files: StorageFileInfo[] = [];

    for (const entry of entries) {
      const entryPath = join(path, entry.name);
      const fullEntryPath = join(fullPath, entry.name);
      const stats = await stat(fullEntryPath);

      files.push({
        path: entryPath,
        size: stats.size,
        lastModified: stats.mtime,
        isDirectory: entry.isDirectory(),
      });

      // Recurse into directories if requested
      if (options?.recursive && entry.isDirectory()) {
        const subFiles = await this.listFiles(entryPath, options);
        files.push(...subFiles);
      }

      // Stop if we've hit max results
      if (options?.maxResults && files.length >= options.maxResults) {
        break;
      }
    }

    return files;
  }

  async ensureDirectory(path: string): Promise<void> {
    await mkdir(join(this.basePath, path), { recursive: true });
  }

  async deleteDirectory(path: string): Promise<void> {
    await rm(join(this.basePath, path), { recursive: true, force: true });
  }

  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const source = join(this.basePath, sourcePath);
    const dest = join(this.basePath, destPath);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(source, dest);
  }

  async getMetadata(path: string): Promise<StorageMetadata> {
    const stats = await stat(join(this.basePath, path));
    return {
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  }
}
