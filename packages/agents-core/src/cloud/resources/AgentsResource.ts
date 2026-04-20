/**
 * Agents Resource Manager
 *
 * Handles agent configuration including CRUD operations
 * and model/skill configuration.
 *
 * Note: projectId is now embedded in the API key, so routes use
 * simplified paths without /projects/:projectId prefix.
 */

import type { ApiClient } from '../ApiClient';
import type {
  AgentAnalyticsResponse,
  AgentModelCatalogEntry,
  CloudAgent,
  CreateAgentParams,
  UpdateAgentParams,
} from '../types';

export class AgentsResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Create a new agent
   *
   * Project is determined automatically from the API key.
   */
  async create(params: CreateAgentParams): Promise<CloudAgent> {
    const response = await this.client.post<{ agent: CloudAgent }>(
      `/agents`,
      params
    );
    return response.agent;
  }

  /**
   * List all agents
   *
   * Project is determined automatically from the API key.
   */
  async list(): Promise<CloudAgent[]> {
    const response = await this.client.get<{ data: CloudAgent[]; object: string }>(
      `/agents`
    );
    return response.data;
  }

  /**
   * List managed and external model entries available in the current workspace.
   */
  async listModels(): Promise<{
    tier?: string;
    models: AgentModelCatalogEntry[];
  }> {
    const response = await this.client.get<{ tier?: string; models: AgentModelCatalogEntry[] }>(`/agents/models`);
    return {
      tier: response.tier,
      models: response.models,
    };
  }

  /**
   * Get an agent by ID
   */
  async get(agentId: string): Promise<CloudAgent> {
    const response = await this.client.get<{ agent: CloudAgent }>(
      `/agents/${agentId}`
    );
    return response.agent;
  }

  /**
   * Update an agent
   */
  async update(
    agentId: string,
    params: UpdateAgentParams
  ): Promise<CloudAgent> {
    const response = await this.client.patch<{ agent: CloudAgent }>(
      `/agents/${agentId}`,
      params
    );
    return response.agent;
  }

  /**
   * Summarize recent activity for an agent or team.
   */
  async getAnalytics(agentId: string): Promise<AgentAnalyticsResponse> {
    return this.client.get(`/agents/${agentId}/analytics`);
  }

  /**
   * Delete an agent
   */
  async delete(agentId: string, hard: boolean = false): Promise<void> {
    await this.client.delete(
      `/agents/${agentId}${hard ? '?hard=true' : ''}`
    );
  }
}
