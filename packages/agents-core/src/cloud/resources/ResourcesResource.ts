import type { ApiClient } from '../ApiClient';
import type {
  CreateResourceParams,
  Resource,
  ResourceAnalyticsResponse,
  ResourceBinding,
  ResourceLogEntry,
  UpdateResourceParams,
} from '../types';

export interface ListResourcesParams {
  projectId?: string;
  limit?: number;
  offset?: number;
}

export interface ResourceInvokeParams {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  body?: unknown;
}

export interface ResourceAuthUserCreateParams {
  email: string;
  password: string;
  displayName?: string;
}

export interface ResourceAuthSignInParams {
  email: string;
  password: string;
}

export interface ResourceFileEntry {
  name?: string;
  path: string;
  type?: 'file' | 'directory' | string;
  size?: number;
  mimeType?: string;
  modifiedAt?: string;
}

export interface ResourceFileUploadParams {
  serverId: string;
  filename: string;
  content: string | Buffer;
  path?: string;
  contentType?: string;
}

export class ResourcesResource {
  constructor(private readonly client: ApiClient) {}

  async create(params: CreateResourceParams): Promise<Resource> {
    const response = await this.client.post<{ server: Resource }>(`/servers`, params);
    return response.server;
  }

  async list(params: ListResourcesParams = {}): Promise<Resource[]> {
    const response = await this.client.get<{
      data?: Resource[];
      servers?: Resource[];
      object?: string;
      has_more?: boolean;
      total_count?: number;
    }>(`/servers`, {
      projectId: params.projectId,
      limit: params.limit,
      offset: params.offset,
    });
    return response.data ?? response.servers ?? [];
  }

  async get(serverId: string): Promise<Resource> {
    const response = await this.client.get<{ server: Resource }>(`/servers/${serverId}`);
    return response.server;
  }

  async update(serverId: string, params: UpdateResourceParams): Promise<Resource> {
    const response = await this.client.patch<{ server: Resource }>(`/servers/${serverId}`, params);
    return response.server;
  }

  async delete(serverId: string): Promise<boolean> {
    const response = await this.client.delete<{ deleted?: boolean }>(`/servers/${serverId}`);
    return !!response?.deleted;
  }

  async deploy(serverId: string): Promise<{
    server?: Resource;
    serviceUrl?: string | null;
    invocationUrl?: string | null;
    revision?: string | null;
    deploymentType?: string | null;
  }> {
    return this.client.post(`/servers/${serverId}/deploy`, {});
  }

  async invoke(serverId: string, params: ResourceInvokeParams = {}): Promise<{
    status?: number;
    ok?: boolean;
    url?: string;
    body?: unknown;
    text?: string;
    headers?: Record<string, string>;
  }> {
    return this.client.post(`/servers/${serverId}/invoke`, params);
  }

  async createAiChatAppTemplate(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.client.post(`/servers/templates/ai-chat-app`, params);
  }

  async getAnalytics(serverId: string): Promise<ResourceAnalyticsResponse> {
    return this.client.get(`/servers/${serverId}/analytics`);
  }

  async getLogs(
    serverId: string,
    params: { kind?: 'request' | 'runtime' | 'deployment'; limit?: number } = {},
  ): Promise<ResourceLogEntry[]> {
    const response = await this.client.get<{ logs: ResourceLogEntry[] }>(`/servers/${serverId}/logs`, params);
    return response.logs;
  }

  async listBindings(serverId: string): Promise<ResourceBinding[]> {
    const response = await this.client.get<{ bindings: ResourceBinding[] }>(`/servers/${serverId}/bindings`);
    return response.bindings;
  }

  async upsertBinding(
    serverId: string,
    targetType: 'database' | 'auth' | 'agent_runtime',
    params: { targetId: string; alias?: string; metadata?: Record<string, unknown> | null },
  ): Promise<ResourceBinding[]> {
    const response = await this.client.put<{ bindings: ResourceBinding[] }>(
      `/servers/${serverId}/bindings/${targetType}`,
      params,
    );
    return response.bindings;
  }

  async deleteBinding(
    serverId: string,
    targetType: 'database' | 'auth' | 'agent_runtime',
  ): Promise<ResourceBinding[]> {
    const response = await this.client.delete<{ bindings: ResourceBinding[] }>(
      `/servers/${serverId}/bindings/${targetType}`,
    );
    return response.bindings;
  }

  async listAuthUsers(
    serverId: string,
    params: { limit?: number; nextPageToken?: string } = {},
  ): Promise<Array<Record<string, unknown>>> {
    const response = await this.client.get<{ users: Array<Record<string, unknown>> }>(
      `/servers/${serverId}/auth-users`,
      params,
    );
    return response.users;
  }

  async createAuthUser(serverId: string, params: ResourceAuthUserCreateParams): Promise<Record<string, unknown>> {
    return this.client.post(`/servers/${serverId}/auth-users`, params);
  }

  async signUp(serverId: string, params: ResourceAuthUserCreateParams): Promise<Record<string, unknown>> {
    return this.client.post(`/servers/${serverId}/auth/sign-up`, params);
  }

  async signIn(serverId: string, params: ResourceAuthSignInParams): Promise<Record<string, unknown>> {
    return this.client.post(`/servers/${serverId}/auth/sign-in`, params);
  }

  async getContext(serverId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/servers/${serverId}/context`);
  }

  async getRuntimeConfig(serverId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/servers/${serverId}/runtime-config`);
  }

  async getRuntime(serverId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/servers/${serverId}/runtime`);
  }

  async listFiles(
    serverId: string,
    params: { path?: string; depth?: number } = {},
  ): Promise<ResourceFileEntry[]> {
    const response = await this.client.get<{ files?: ResourceFileEntry[]; data?: ResourceFileEntry[] }>(
      `/servers/${serverId}/files`,
      params,
    );
    return response.files ?? response.data ?? [];
  }

  async getFileContent(serverId: string, filePath: string): Promise<string> {
    const encodedPath = filePath
      .replace(/^\/+/, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    const response = await this.client.request<Response>('GET', `/servers/${serverId}/files/content/${encodedPath}`, {
      stream: true,
    });
    return response.text();
  }

  async writeFileContent(serverId: string, filePath: string, content: string): Promise<Record<string, unknown>> {
    const encodedPath = filePath
      .replace(/^\/+/, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    return this.client.put(`/servers/${serverId}/files/content/${encodedPath}`, { content });
  }

  async downloadFile(serverId: string, filePath: string): Promise<Buffer> {
    const encodedPath = filePath
      .replace(/^\/+/, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    const response = await this.client.request<Response>('GET', `/servers/${serverId}/files/download/${encodedPath}`, {
      stream: true,
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async uploadFile(params: ResourceFileUploadParams): Promise<Record<string, unknown>> {
    const { serverId, filename, content, path, contentType } = params;
    const formData = new FormData();
    const contentBuffer = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const blob = new Blob([contentBuffer], { type: contentType || 'application/octet-stream' });
    formData.append('file', blob, filename);
    if (path) {
      formData.append('path', path);
    }

    const url = `${this.client.getBaseUrl()}/servers/${serverId}/files/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client.getApiKey()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as {
        error?: string;
        message?: string;
        code?: string;
        details?: Record<string, unknown>;
      };
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async deleteFile(serverId: string, filePath: string): Promise<Record<string, unknown>> {
    const encodedPath = filePath
      .replace(/^\/+/, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    return this.client.delete(`/servers/${serverId}/files/${encodedPath}`);
  }
}
