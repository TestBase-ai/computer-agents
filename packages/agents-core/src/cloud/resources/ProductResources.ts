import type { ApiClient } from '../ApiClient';
import type {
  CreateResourceParams,
  Resource,
  ResourceAnalyticsResponse,
  ResourceBinding,
  ResourceKind,
  ResourceLogEntry,
  UpdateResourceParams,
} from '../types';
import {
  type ListResourcesParams,
  type ResourceAuthSignInParams,
  type ResourceAuthUserCreateParams,
  type ResourceFileEntry,
  type ResourceFileUploadParams,
  type ResourceInvokeParams,
  ResourcesResource,
} from './ResourcesResource';

type KindScopedCreateParams<K extends ResourceKind> = Omit<CreateResourceParams, 'kind'> & {
  kind?: K;
};

type KindScopedUpdateParams<K extends ResourceKind> = Omit<UpdateResourceParams, 'kind'> & {
  kind?: K;
};

class KindScopedResources<K extends ResourceKind> {
  protected readonly resources: ResourcesResource;

  constructor(client: ApiClient, private readonly kind: K) {
    this.resources = new ResourcesResource(client);
  }

  async create(params: KindScopedCreateParams<K>): Promise<Resource> {
    return this.resources.create({
      ...params,
      kind: this.kind,
    });
  }

  async list(params: ListResourcesParams = {}): Promise<Resource[]> {
    const resources = await this.resources.list(params);
    return resources.filter((resource) => resource.kind === this.kind);
  }

  async get(serverId: string): Promise<Resource> {
    return this.resources.get(serverId);
  }

  async update(serverId: string, params: KindScopedUpdateParams<K>): Promise<Resource> {
    return this.resources.update(serverId, {
      ...params,
      kind: this.kind,
    });
  }

  async delete(serverId: string): Promise<boolean> {
    return this.resources.delete(serverId);
  }

  async deploy(serverId: string): Promise<{
    server?: Resource;
    serviceUrl?: string | null;
    invocationUrl?: string | null;
    revision?: string | null;
    deploymentType?: string | null;
  }> {
    return this.resources.deploy(serverId);
  }

  async invoke(serverId: string, params: ResourceInvokeParams = {}): Promise<{
    status?: number;
    ok?: boolean;
    url?: string;
    body?: unknown;
    text?: string;
    headers?: Record<string, string>;
  }> {
    return this.resources.invoke(serverId, params);
  }

  async getAnalytics(serverId: string): Promise<ResourceAnalyticsResponse> {
    return this.resources.getAnalytics(serverId);
  }

  async getLogs(
    serverId: string,
    params: { kind?: 'request' | 'runtime' | 'deployment'; limit?: number } = {},
  ): Promise<ResourceLogEntry[]> {
    return this.resources.getLogs(serverId, params);
  }

  async listBindings(serverId: string): Promise<ResourceBinding[]> {
    return this.resources.listBindings(serverId);
  }

  async upsertBinding(
    serverId: string,
    targetType: 'database' | 'auth' | 'agent_runtime',
    params: { targetId: string; alias?: string; metadata?: Record<string, unknown> | null },
  ): Promise<ResourceBinding[]> {
    return this.resources.upsertBinding(serverId, targetType, params);
  }

  async deleteBinding(
    serverId: string,
    targetType: 'database' | 'auth' | 'agent_runtime',
  ): Promise<ResourceBinding[]> {
    return this.resources.deleteBinding(serverId, targetType);
  }

  async getContext(serverId: string): Promise<Record<string, unknown>> {
    return this.resources.getContext(serverId);
  }

  async getRuntimeConfig(serverId: string): Promise<Record<string, unknown>> {
    return this.resources.getRuntimeConfig(serverId);
  }

  async getRuntime(serverId: string): Promise<Record<string, unknown>> {
    return this.resources.getRuntime(serverId);
  }

  async listFiles(
    serverId: string,
    params: { path?: string; depth?: number } = {},
  ): Promise<ResourceFileEntry[]> {
    return this.resources.listFiles(serverId, params);
  }

  async getFileContent(serverId: string, filePath: string): Promise<string> {
    return this.resources.getFileContent(serverId, filePath);
  }

  async writeFileContent(serverId: string, filePath: string, content: string): Promise<Record<string, unknown>> {
    return this.resources.writeFileContent(serverId, filePath, content);
  }

  async downloadFile(serverId: string, filePath: string): Promise<Buffer> {
    return this.resources.downloadFile(serverId, filePath);
  }

  async uploadFile(params: ResourceFileUploadParams): Promise<Record<string, unknown>> {
    return this.resources.uploadFile(params);
  }

  async deleteFile(serverId: string, filePath: string): Promise<Record<string, unknown>> {
    return this.resources.deleteFile(serverId, filePath);
  }
}

export class WebAppsResource extends KindScopedResources<'web_app'> {
  constructor(client: ApiClient) {
    super(client, 'web_app');
  }

  async createAiChatAppTemplate(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.resources.createAiChatAppTemplate(params);
  }
}

export class FunctionsResource extends KindScopedResources<'function'> {
  constructor(client: ApiClient) {
    super(client, 'function');
  }
}

export class AuthResource extends KindScopedResources<'auth'> {
  constructor(client: ApiClient) {
    super(client, 'auth');
  }

  async listUsers(
    serverId: string,
    params: { limit?: number; nextPageToken?: string } = {},
  ): Promise<Array<Record<string, unknown>>> {
    return this.resources.listAuthUsers(serverId, params);
  }

  async createUser(serverId: string, params: ResourceAuthUserCreateParams): Promise<Record<string, unknown>> {
    return this.resources.createAuthUser(serverId, params);
  }

  async signUp(serverId: string, params: ResourceAuthUserCreateParams): Promise<Record<string, unknown>> {
    return this.resources.signUp(serverId, params);
  }

  async signIn(serverId: string, params: ResourceAuthSignInParams): Promise<Record<string, unknown>> {
    return this.resources.signIn(serverId, params);
  }
}

export class AgentRuntimesResource extends KindScopedResources<'agent_runtime'> {
  constructor(client: ApiClient) {
    super(client, 'agent_runtime');
  }
}

export { AgentRuntimesResource as RuntimesResource };
