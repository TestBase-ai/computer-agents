/**
 * Triggers Resource Manager
 *
 * Handles event-driven trigger management including CRUD operations,
 * enable/disable control, testing, and execution history.
 *
 * Note: projectId is now embedded in the API key, so routes use
 * simplified paths without /projects/:projectId prefix.
 */

import type { ApiClient } from '../ApiClient';
import type {
  Trigger,
  CreateTriggerParams,
  UpdateTriggerParams,
  TriggerExecution,
} from '../types';

export class TriggersResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Create a new trigger
   */
  async create(params: CreateTriggerParams): Promise<Trigger> {
    const response = await this.client.post<{ trigger: Trigger }>(
      `/triggers`,
      params
    );
    return response.trigger;
  }

  /**
   * List all triggers
   */
  async list(
    params?: { environmentId?: string; enabled?: boolean; limit?: number; offset?: number }
  ): Promise<Trigger[]> {
    const response = await this.client.get<{
      data: Trigger[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(`/triggers`, params);
    return response.data;
  }

  /**
   * Get a trigger by ID
   */
  async get(triggerId: string): Promise<Trigger> {
    const response = await this.client.get<{ trigger: Trigger }>(
      `/triggers/${triggerId}`
    );
    return response.trigger;
  }

  /**
   * Update a trigger
   */
  async update(
    triggerId: string,
    params: UpdateTriggerParams
  ): Promise<Trigger> {
    const response = await this.client.patch<{ trigger: Trigger }>(
      `/triggers/${triggerId}`,
      params
    );
    return response.trigger;
  }

  /**
   * Delete a trigger
   */
  async delete(triggerId: string): Promise<void> {
    await this.client.delete(`/triggers/${triggerId}`);
  }

  // =========================================================================
  // Trigger Control
  // =========================================================================

  /**
   * Enable a trigger
   */
  async enable(triggerId: string): Promise<Trigger> {
    const response = await this.client.patch<{ trigger: Trigger }>(
      `/triggers/${triggerId}/enable`
    );
    return response.trigger;
  }

  /**
   * Disable a trigger
   */
  async disable(triggerId: string): Promise<Trigger> {
    const response = await this.client.patch<{ trigger: Trigger }>(
      `/triggers/${triggerId}/disable`
    );
    return response.trigger;
  }

  /**
   * Test-fire a trigger with an optional payload
   */
  async test(triggerId: string, payload?: Record<string, unknown>): Promise<TriggerExecution> {
    const response = await this.client.post<{ execution: TriggerExecution }>(
      `/triggers/${triggerId}/test`,
      payload ? { payload } : undefined
    );
    return response.execution;
  }

  // =========================================================================
  // Execution History
  // =========================================================================

  /**
   * List past executions for a trigger
   */
  async listExecutions(
    triggerId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<TriggerExecution[]> {
    const response = await this.client.get<{
      data: TriggerExecution[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(`/triggers/${triggerId}/executions`, params);
    return response.data;
  }
}
