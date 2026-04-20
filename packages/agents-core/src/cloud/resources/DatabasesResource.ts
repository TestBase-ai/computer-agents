import type { ApiClient } from '../ApiClient';
import type {
  CreateDatabaseParams,
  Database,
  DatabaseCollection,
  DatabaseDocument,
  UpdateDatabaseParams,
} from '../types';

export interface ListDatabasesParams {
  projectId?: string;
}

export interface CreateDatabaseCollectionParams {
  name: string;
  description?: string;
}

export interface CreateDatabaseDocumentParams {
  id?: string;
  data: Record<string, unknown>;
}

export interface UpdateDatabaseDocumentParams {
  data: Record<string, unknown>;
}

export class DatabasesResource {
  constructor(private readonly client: ApiClient) {}

  async create(params: CreateDatabaseParams): Promise<Database> {
    const response = await this.client.post<{ database: Database }>(`/databases`, params);
    return response.database;
  }

  async list(params: ListDatabasesParams = {}): Promise<Database[]> {
    const response = await this.client.get<{ databases: Database[] }>(`/databases`, {
      projectId: params.projectId,
    });
    return response.databases;
  }

  async get(databaseId: string): Promise<Database> {
    const response = await this.client.get<{ database: Database }>(`/databases/${databaseId}`);
    return response.database;
  }

  async update(databaseId: string, params: UpdateDatabaseParams): Promise<Database> {
    const response = await this.client.patch<{ database: Database }>(`/databases/${databaseId}`, params);
    return response.database;
  }

  async delete(databaseId: string): Promise<boolean> {
    const response = await this.client.delete<{ success?: boolean; deleted?: boolean }>(`/databases/${databaseId}`);
    return !!(response.success ?? response.deleted);
  }

  async getAnalytics(databaseId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/databases/${databaseId}/analytics`);
  }

  async listCollections(databaseId: string): Promise<DatabaseCollection[]> {
    const response = await this.client.get<{ collections: DatabaseCollection[] }>(`/databases/${databaseId}/collections`);
    return response.collections;
  }

  async createCollection(
    databaseId: string,
    params: CreateDatabaseCollectionParams,
  ): Promise<DatabaseCollection> {
    const response = await this.client.post<{ collection: DatabaseCollection }>(
      `/databases/${databaseId}/collections`,
      params,
    );
    return response.collection;
  }

  async deleteCollection(databaseId: string, collectionId: string): Promise<boolean> {
    const response = await this.client.delete<{ success?: boolean; deleted?: boolean }>(
      `/databases/${databaseId}/collections/${collectionId}`,
    );
    return !!(response.success ?? response.deleted);
  }

  async listDocuments(
    databaseId: string,
    collectionId: string,
    params: { limit?: number } = {},
  ): Promise<DatabaseDocument[]> {
    const response = await this.client.get<{ documents: DatabaseDocument[] }>(
      `/databases/${databaseId}/collections/${collectionId}/documents`,
      params,
    );
    return response.documents;
  }

  async createDocument(
    databaseId: string,
    collectionId: string,
    params: CreateDatabaseDocumentParams,
  ): Promise<DatabaseDocument> {
    const response = await this.client.post<{ document: DatabaseDocument }>(
      `/databases/${databaseId}/collections/${collectionId}/documents`,
      params,
    );
    return response.document;
  }

  async getDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
  ): Promise<DatabaseDocument> {
    const response = await this.client.get<{ document: DatabaseDocument }>(
      `/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`,
    );
    return response.document;
  }

  async updateDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    params: UpdateDatabaseDocumentParams,
  ): Promise<DatabaseDocument> {
    const response = await this.client.put<{ document: DatabaseDocument }>(
      `/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`,
      params,
    );
    return response.document;
  }

  async deleteDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
  ): Promise<boolean> {
    const response = await this.client.delete<{ success?: boolean; deleted?: boolean }>(
      `/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`,
    );
    return !!(response.success ?? response.deleted);
  }
}
