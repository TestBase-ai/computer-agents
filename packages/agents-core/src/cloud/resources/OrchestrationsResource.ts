/**
 * Orchestrations Resource Manager
 *
 * Handles agent-to-agent orchestration including CRUD operations,
 * running orchestrations, and tracking run status.
 *
 * Note: projectId is now embedded in the API key, so routes use
 * simplified paths without /projects/:projectId prefix.
 */

import type { ApiClient } from '../ApiClient';
import type {
  Orchestration,
  CreateOrchestrationParams,
  UpdateOrchestrationParams,
  OrchestrationRun,
} from '../types';

export class OrchestrationsResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Create a new orchestration
   */
  async create(params: CreateOrchestrationParams): Promise<Orchestration> {
    const response = await this.client.post<{ orchestration: Orchestration }>(
      `/orchestrations`,
      params
    );
    return response.orchestration;
  }

  /**
   * List all orchestrations
   */
  async list(
    params?: { environmentId?: string; limit?: number; offset?: number }
  ): Promise<Orchestration[]> {
    const response = await this.client.get<{
      data: Orchestration[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(`/orchestrations`, params);
    return response.data;
  }

  /**
   * Get an orchestration by ID
   */
  async get(orchestrationId: string): Promise<Orchestration> {
    const response = await this.client.get<{ orchestration: Orchestration }>(
      `/orchestrations/${orchestrationId}`
    );
    return response.orchestration;
  }

  /**
   * Update an orchestration
   */
  async update(
    orchestrationId: string,
    params: UpdateOrchestrationParams
  ): Promise<Orchestration> {
    const response = await this.client.patch<{ orchestration: Orchestration }>(
      `/orchestrations/${orchestrationId}`,
      params
    );
    return response.orchestration;
  }

  /**
   * Delete an orchestration
   */
  async delete(orchestrationId: string): Promise<void> {
    await this.client.delete(`/orchestrations/${orchestrationId}`);
  }

  // =========================================================================
  // Orchestration Runs
  // =========================================================================

  /**
   * Execute an orchestration
   */
  async run(
    orchestrationId: string,
    options?: { inputs?: Record<string, unknown> }
  ): Promise<OrchestrationRun> {
    const response = await this.client.post<{ run: OrchestrationRun }>(
      `/orchestrations/${orchestrationId}/runs`,
      options
    );
    return response.run;
  }

  /**
   * Get a specific run
   */
  async getRun(
    orchestrationId: string,
    runId: string
  ): Promise<OrchestrationRun> {
    const response = await this.client.get<{ run: OrchestrationRun }>(
      `/orchestrations/${orchestrationId}/runs/${runId}`
    );
    return response.run;
  }

  /**
   * List all runs for an orchestration
   */
  async listRuns(
    orchestrationId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<OrchestrationRun[]> {
    const response = await this.client.get<{
      data: OrchestrationRun[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(`/orchestrations/${orchestrationId}/runs`, params);
    return response.data;
  }
}
