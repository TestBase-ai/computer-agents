/**
 * Storage Abstraction Interfaces
 *
 * Provides pluggable storage backends for sessions and workspaces.
 * Supports local filesystem, GCS, S3, and custom implementations.
 */

/**
 * Generic metadata that can be stored
 */
export type StorageMetadata = Record<string, unknown>;

/**
 * File information returned from list operations
 */
export interface StorageFileInfo {
  path: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
}

/**
 * Options for file operations
 */
export interface ReadFileOptions {
  encoding?: BufferEncoding;
}

export interface WriteFileOptions {
  encoding?: BufferEncoding;
  contentType?: string;
}

export interface ListFilesOptions {
  recursive?: boolean;
  maxResults?: number;
}

/**
 * Base storage interface - all storage backends implement this
 */
export interface Storage {
  /**
   * Storage type identifier
   */
  readonly type: 'local' | 'gcs' | 's3' | 'custom';

  /**
   * Read a file as string
   */
  readFile(path: string, options?: ReadFileOptions): Promise<string>;

  /**
   * Write a file
   */
  writeFile(path: string, content: string, options?: WriteFileOptions): Promise<void>;

  /**
   * Read a file as buffer
   */
  readBuffer(path: string): Promise<Buffer>;

  /**
   * Write a buffer
   */
  writeBuffer(path: string, content: Buffer, options?: WriteFileOptions): Promise<void>;

  /**
   * Check if file/directory exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Delete a file
   */
  deleteFile(path: string): Promise<void>;

  /**
   * List files in directory
   */
  listFiles(path: string, options?: ListFilesOptions): Promise<StorageFileInfo[]>;

  /**
   * Create directory (no-op if exists)
   */
  ensureDirectory(path: string): Promise<void>;

  /**
   * Delete directory recursively
   */
  deleteDirectory(path: string): Promise<void>;

  /**
   * Copy file from source to destination
   */
  copyFile(sourcePath: string, destPath: string): Promise<void>;

  /**
   * Get file metadata
   */
  getMetadata(path: string): Promise<StorageMetadata>;

  /**
   * Cleanup resources (optional)
   */
  cleanup?(): Promise<void>;
}

/**
 * Session storage - specialized for session artifacts
 */
export interface SessionStorage extends Storage {
  /**
   * Save session metadata
   */
  saveSessionMetadata(sessionId: string, metadata: StorageMetadata): Promise<void>;

  /**
   * Load session metadata
   */
  loadSessionMetadata(sessionId: string): Promise<StorageMetadata | null>;

  /**
   * Save agent turn data
   */
  saveAgentTurn(
    sessionId: string,
    agentName: string,
    turnNumber: number,
    turnData: StorageMetadata
  ): Promise<void>;

  /**
   * Load agent turn data
   */
  loadAgentTurn(
    sessionId: string,
    agentName: string,
    turnNumber: number
  ): Promise<StorageMetadata | null>;

  /**
   * Save arbitrary artifact
   */
  saveArtifact(
    sessionId: string,
    agentName: string,
    filename: string,
    content: string
  ): Promise<void>;

  /**
   * Load artifact
   */
  loadArtifact(
    sessionId: string,
    agentName: string,
    filename: string
  ): Promise<string | null>;

  /**
   * List all sessions
   */
  listSessions(): Promise<string[]>;

  /**
   * Delete entire session
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Get session root path/URL
   */
  getSessionRoot(sessionId: string): string;
}

/**
 * Workspace storage - specialized for code repositories
 */
export interface WorkspaceStorage extends Storage {
  /**
   * Upload workspace directory
   */
  uploadWorkspace(localPath: string, remotePath: string): Promise<void>;

  /**
   * Download workspace directory
   */
  downloadWorkspace(remotePath: string, localPath: string): Promise<void>;

  /**
   * Sync workspace bidirectionally
   */
  syncWorkspace(
    localPath: string,
    remotePath: string,
    direction: 'upload' | 'download' | 'bidirectional'
  ): Promise<SyncResult>;

  /**
   * Get workspace size in bytes
   */
  getWorkspaceSize(remotePath: string): Promise<number>;

  /**
   * Check workspace exists
   */
  workspaceExists(remotePath: string): Promise<boolean>;

  /**
   * Delete workspace
   */
  deleteWorkspace(remotePath: string): Promise<void>;
}

/**
 * Result from sync operations
 */
export interface SyncResult {
  filesUploaded: number;
  filesDownloaded: number;
  filesDeleted: number;
  bytesTransferred: number;
  duration: number;
  conflicts?: SyncConflict[];
}

/**
 * Conflict during sync
 */
export interface SyncConflict {
  path: string;
  localModified: Date;
  remoteModified: Date;
  resolution: 'local' | 'remote' | 'manual';
}

/**
 * Configuration for storage backends
 */
export interface LocalStorageConfig {
  basePath: string;
}

export interface GCSStorageConfig {
  bucket: string;
  prefix?: string;
  projectId?: string;
  keyFilename?: string;
}

export interface S3StorageConfig {
  bucket: string;
  prefix?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}
