/**
 * Files Resource Manager
 *
 * Handles file operations within environment workspaces.
 * Files are scoped to environments - each environment has its own isolated workspace.
 *
 * API Endpoints (matching server.ts):
 * - GET    /environments/:environmentId/files              - List files
 * - POST   /environments/:environmentId/files/upload       - Upload file (multipart)
 * - POST   /environments/:environmentId/files/mkdir        - Create directory
 * - GET    /environments/:environmentId/files/download/*   - Download file
 * - DELETE /environments/:environmentId/files/*            - Delete file
 * - POST   /environments/:environmentId/files/move         - Move/rename file
 */

import type { ApiClient } from '../ApiClient';
import { ApiClientError } from '../ApiClient';

/**
 * File entry returned by the API
 */
export interface EnvironmentFile {
  /** Full path relative to workspace root */
  path: string;
  /** Type of entry */
  type: 'file' | 'directory';
  /** File size in bytes (0 for directories) */
  size: number;
  /** Last modification time (ISO 8601 string) */
  lastModified: string;
}

/**
 * Result from listing files
 */
export interface ListFilesResult {
  environmentId: string;
  files: EnvironmentFile[];
}

/**
 * Parameters for uploading a file
 */
export interface UploadFileParams {
  environmentId: string;
  /** Relative path within the environment (e.g., 'src/app.py') */
  path?: string;
  /** File content as string or Buffer */
  content: string | Buffer;
  /** Original filename */
  filename: string;
  /** Content type (optional) */
  contentType?: string;
}

/**
 * Result from uploading a file
 */
export interface UploadFileResult {
  success: boolean;
  environmentId: string;
  filename: string;
  path: string;
  size: number;
}

/**
 * Parameters for moving a file
 */
export interface MoveFileParams {
  environmentId: string;
  sourcePath: string;
  destPath: string;
}

/**
 * Result from moving a file
 */
export interface MoveFileResult {
  success: boolean;
  environmentId: string;
  sourcePath: string;
  destPath: string;
}

/**
 * Result from deleting a file
 */
export interface DeleteFileResult {
  success: boolean;
  environmentId: string;
  filePath: string;
}

/**
 * Result from creating a directory
 */
export interface CreateDirectoryResult {
  success: boolean;
  path: string;
  environmentId: string;
}

export class FilesResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * List all files in an environment workspace
   *
   * @param environmentId - The environment ID
   * @returns List of files with metadata
   *
   * @example
   * ```typescript
   * const result = await client.files.list('env_xxx');
   * console.log(result.files);
   * ```
   */
  async list(environmentId: string): Promise<ListFilesResult> {
    const response = await this.client.get<{
      object: string;
      data: EnvironmentFile[];
      path: string;
      has_more: boolean;
      total_count: number;
    }>(`/environments/${environmentId}/files`);

    return {
      environmentId,
      files: response.data,
    };
  }

  /**
   * Alias for list() - for backward compatibility
   */
  async listFiles(environmentId: string): Promise<EnvironmentFile[]> {
    const response = await this.client.get<{
      object: string;
      data: EnvironmentFile[];
      path: string;
      has_more: boolean;
      total_count: number;
    }>(`/environments/${environmentId}/files`);

    return response.data;
  }

  /**
   * Download a file from an environment workspace
   *
   * @param environmentId - The environment ID
   * @param filePath - Path to the file (e.g., 'src/app.py')
   * @returns File content as string
   *
   * @example
   * ```typescript
   * const content = await client.files.getFile('env_xxx', 'src/app.py');
   * console.log(content);
   * ```
   */
  async getFile(environmentId: string, filePath: string): Promise<string> {
    // Remove leading slash if present
    const normalizedPath = filePath.replace(/^\/+/, '');
    const encodedPath = normalizedPath
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    const response = await this.client.request<Response>(
      'GET',
      `/environments/${environmentId}/files/${encodedPath}`,
      { stream: true }
    );

    return response.text();
  }

  /**
   * Download a file as a Buffer
   *
   * @param environmentId - The environment ID
   * @param filePath - Path to the file
   * @returns File content as Buffer
   */
  async downloadFile(environmentId: string, filePath: string): Promise<Buffer> {
    const normalizedPath = filePath.replace(/^\/+/, '');
    const encodedPath = normalizedPath
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    const response = await this.client.request<Response>(
      'GET',
      `/environments/${environmentId}/files/${encodedPath}`,
      { stream: true }
    );

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Upload a file to an environment workspace
   *
   * Uses multipart form data to match the server.ts upload handler.
   *
   * @param params - Upload parameters
   * @returns Upload result with file path
   *
   * @example
   * ```typescript
   * const result = await client.files.uploadFile({
   *   environmentId: 'env_xxx',
   *   filename: 'app.py',
   *   path: 'src',  // Optional: subdirectory
   *   content: 'print("Hello, world!")'
   * });
   * ```
   */
  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const { environmentId, path: relativePath, content, filename, contentType } = params;

    if (!environmentId) {
      throw new Error('environmentId is required for file upload');
    }

    // Create FormData for multipart upload
    const formData = new FormData();

    // Convert content to Blob
    const contentBuffer = typeof content === 'string'
      ? new TextEncoder().encode(content)
      : content;

    const blob = new Blob([contentBuffer], {
      type: contentType || 'application/octet-stream'
    });

    formData.append('file', blob, filename);

    if (relativePath) {
      formData.append('path', relativePath);
    }

    // Make request with FormData (not JSON)
    const url = `${this.client.getBaseUrl()}/environments/${environmentId}/files/upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.getApiKey()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText })) as {
        error?: string;
        message?: string;
        code?: string;
      };
      throw new ApiClientError(
        errorData.message || errorData.error || 'Upload failed',
        response.status,
        errorData.code
      );
    }

    return response.json() as Promise<UploadFileResult>;
  }

  /**
   * Delete a file from an environment workspace
   *
   * @param environmentId - The environment ID
   * @param filePath - Path to the file to delete
   *
   * @example
   * ```typescript
   * await client.files.deleteFile('env_xxx', 'src/old-file.py');
   * ```
   */
  async deleteFile(environmentId: string, filePath: string): Promise<DeleteFileResult> {
    const normalizedPath = filePath.replace(/^\/+/, '');
    const encodedPath = normalizedPath
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    return this.client.delete<DeleteFileResult>(
      `/environments/${environmentId}/files/${encodedPath}`
    );
  }

  /**
   * Move or rename a file within an environment workspace
   *
   * @param params - Move parameters (environmentId, sourcePath, destPath)
   * @returns Move result
   *
   * @example
   * ```typescript
   * await client.files.moveFile({
   *   environmentId: 'env_xxx',
   *   sourcePath: 'old-name.py',
   *   destPath: 'new-name.py'
   * });
   * ```
   */
  async moveFile(params: MoveFileParams): Promise<MoveFileResult> {
    const { environmentId, sourcePath, destPath } = params;

    return this.client.post<MoveFileResult>(
      `/environments/${environmentId}/files/move`,
      { sourcePath, destPath }
    );
  }

  /**
   * Create a directory in an environment workspace
   *
   * Parent directories are created automatically if they don't exist.
   *
   * @param environmentId - The environment ID
   * @param path - Directory path to create (relative to workspace root)
   * @returns Create directory result
   *
   * @example
   * ```typescript
   * // Create a simple directory
   * await client.files.createDirectory('env_xxx', 'src/components');
   *
   * // Create nested directories (parents created automatically)
   * await client.files.createDirectory('env_xxx', 'src/components/ui/buttons');
   * ```
   */
  async createDirectory(environmentId: string, path: string): Promise<CreateDirectoryResult> {
    // Normalize path - remove leading slash if present
    const normalizedPath = path.replace(/^\/+/, '');

    return this.client.post<CreateDirectoryResult>(
      `/environments/${environmentId}/files/mkdir`,
      { path: normalizedPath }
    );
  }
}
