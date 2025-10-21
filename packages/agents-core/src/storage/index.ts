/**
 * Storage module - Abstract storage backends
 *
 * Provides pluggable storage implementations for sessions and workspaces.
 * Supports local filesystem, GCS, S3, and custom backends.
 */

export type {
  Storage,
  SessionStorage,
  WorkspaceStorage,
  StorageMetadata,
  StorageFileInfo,
  ReadFileOptions,
  WriteFileOptions,
  ListFilesOptions,
  SyncResult,
  SyncConflict,
  LocalStorageConfig,
  GCSStorageConfig,
  S3StorageConfig,
} from './StorageInterface';

export { LocalSessionStorage } from './LocalSessionStorage';
export type { LocalSessionStorageConfig } from './LocalSessionStorage';

export { GCSSessionStorage } from './GCSSessionStorage';

export { WorkspaceSync } from './WorkspaceSync';
export type { WorkspaceSyncConfig } from './WorkspaceSync';
