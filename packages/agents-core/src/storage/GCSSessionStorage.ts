/**
 * GCSSessionStorage - Google Cloud Storage-based session storage
 *
 * Stores session artifacts in Google Cloud Storage.
 * Used for cloud execution and persistent storage.
 */

import type {
  SessionStorage,
  StorageMetadata,
  StorageFileInfo,
  ReadFileOptions,
  WriteFileOptions,
  ListFilesOptions,
  GCSStorageConfig,
} from './StorageInterface';

/**
 * GCS-based session storage implementation.
 *
 * Bucket structure:
 * ```
 * gs://{bucket}/{prefix}/sessions/
 * └── {sessionId}/
 *     ├── session.json
 *     ├── {agentName}/
 *     │   ├── thread.json
 *     │   ├── turn-001.json
 *     │   └── artifacts/
 *     └── ...
 * ```
 */
export class GCSSessionStorage implements SessionStorage {
  readonly type = 'gcs' as const;
  private bucket: string;
  private prefix: string;
  private storage: any; // Google Cloud Storage client (lazy loaded)

  constructor(config: GCSStorageConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'sessions';
  }

  /**
   * Lazy-load Google Cloud Storage client
   */
  private async getStorage() {
    if (this.storage) {
      return this.storage;
    }

    try {
      const { Storage } = await import('@google-cloud/storage');
      this.storage = new Storage();
      return this.storage;
    } catch (error) {
      throw new Error(
        `Failed to load @google-cloud/storage. Install it with: npm install @google-cloud/storage`
      );
    }
  }

  /**
   * Get GCS path for a session
   */
  getSessionRoot(sessionId: string): string {
    return `gs://${this.bucket}/${this.prefix}/${sessionId}`;
  }


  /**
   * Get full GCS path
   */
  private getPath(...parts: string[]): string {
    return [this.prefix, ...parts].filter(Boolean).join('/');
  }

  // Session-specific methods

  async saveSessionMetadata(sessionId: string, metadata: StorageMetadata): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const path = this.getPath(sessionId, 'session.json');
    const file = bucket.file(path);

    // Merge with existing metadata
    let existing: StorageMetadata = {};
    try {
      const [content] = await file.download();
      existing = JSON.parse(content.toString('utf8'));
    } catch (error: any) {
      if (error.code !== 404) throw error;
    }

    const merged: StorageMetadata = {
      ...existing,
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    if (!merged.createdAt) {
      merged.createdAt = new Date().toISOString();
    }

    await file.save(JSON.stringify(merged, null, 2), {
      contentType: 'application/json',
    });
  }

  async loadSessionMetadata(sessionId: string): Promise<StorageMetadata | null> {
    try {
      const storage = await this.getStorage();
      const bucket = storage.bucket(this.bucket);
      const file = bucket.file(this.getPath(sessionId, 'session.json'));
      const [content] = await file.download();
      return JSON.parse(content.toString('utf8'));
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async saveAgentTurn(
    sessionId: string,
    agentName: string,
    turnNumber: number,
    turnData: StorageMetadata
  ): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const filename = `turn-${String(turnNumber).padStart(3, '0')}.json`;
    const path = this.getPath(sessionId, agentName, filename);
    const file = bucket.file(path);

    await file.save(JSON.stringify(turnData, null, 2), {
      contentType: 'application/json',
    });
  }

  async loadAgentTurn(
    sessionId: string,
    agentName: string,
    turnNumber: number
  ): Promise<StorageMetadata | null> {
    try {
      const storage = await this.getStorage();
      const bucket = storage.bucket(this.bucket);
      const filename = `turn-${String(turnNumber).padStart(3, '0')}.json`;
      const file = bucket.file(this.getPath(sessionId, agentName, filename));
      const [content] = await file.download();
      return JSON.parse(content.toString('utf8'));
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async saveArtifact(
    sessionId: string,
    agentName: string,
    filename: string,
    content: string
  ): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const path = this.getPath(sessionId, agentName, filename);
    const file = bucket.file(path);

    await file.save(content, {
      contentType: 'text/plain',
    });
  }

  async loadArtifact(
    sessionId: string,
    agentName: string,
    filename: string
  ): Promise<string | null> {
    try {
      const storage = await this.getStorage();
      const bucket = storage.bucket(this.bucket);
      const file = bucket.file(this.getPath(sessionId, agentName, filename));
      const [content] = await file.download();
      return content.toString('utf8');
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async listSessions(): Promise<string[]> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const [files] = await bucket.getFiles({
      prefix: `${this.prefix}/`,
      delimiter: '/',
    });

    const sessionIds = new Set<string>();
    for (const file of files) {
      const relativePath = file.name.substring(this.prefix.length + 1);
      const sessionId = relativePath.split('/')[0];
      if (sessionId) {
        sessionIds.add(sessionId);
      }
    }

    return Array.from(sessionIds);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const prefix = this.getPath(sessionId);

    await bucket.deleteFiles({ prefix });
  }

  // Generic storage methods

  async readFile(path: string, options?: ReadFileOptions): Promise<string> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const file = bucket.file(this.getPath(path));
    const [content] = await file.download();
    return content.toString(options?.encoding ?? 'utf8');
  }

  async writeFile(
    path: string,
    content: string,
    options?: WriteFileOptions
  ): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const file = bucket.file(this.getPath(path));

    await file.save(content, {
      contentType: options?.contentType ?? 'text/plain',
    });
  }

  async readBuffer(path: string): Promise<Buffer> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const file = bucket.file(this.getPath(path));
    const [content] = await file.download();
    return content;
  }

  async writeBuffer(
    path: string,
    content: Buffer,
    options?: WriteFileOptions
  ): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const file = bucket.file(this.getPath(path));

    await file.save(content, {
      contentType: options?.contentType ?? 'application/octet-stream',
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      const storage = await this.getStorage();
      const bucket = storage.bucket(this.bucket);
      const file = bucket.file(this.getPath(path));
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  async deleteFile(path: string): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const file = bucket.file(this.getPath(path));
    await file.delete({ ignoreNotFound: true });
  }

  async listFiles(
    path: string,
    options?: ListFilesOptions
  ): Promise<StorageFileInfo[]> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const prefix = this.getPath(path);

    const [files] = await bucket.getFiles({
      prefix,
      maxResults: options?.maxResults,
      delimiter: options?.recursive ? undefined : '/',
    });

    return files.map((file: any) => ({
      path: file.name.substring(this.prefix.length + 1),
      size: parseInt(file.metadata.size, 10),
      lastModified: new Date(file.metadata.updated),
      isDirectory: file.name.endsWith('/'),
    }));
  }

  async ensureDirectory(path: string): Promise<void> {
    // GCS doesn't require directory creation
    // Directories are implicit
  }

  async deleteDirectory(path: string): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const prefix = this.getPath(path);

    await bucket.deleteFiles({ prefix });
  }

  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const sourceFile = bucket.file(this.getPath(sourcePath));
    const destFile = bucket.file(this.getPath(destPath));

    await sourceFile.copy(destFile);
  }

  async getMetadata(path: string): Promise<StorageMetadata> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucket);
    const file = bucket.file(this.getPath(path));
    const [metadata] = await file.getMetadata();

    return {
      size: parseInt(metadata.size, 10),
      created: metadata.timeCreated,
      modified: metadata.updated,
      contentType: metadata.contentType,
      isDirectory: file.name.endsWith('/'),
      isFile: !file.name.endsWith('/'),
    };
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for GCS client
  }
}
