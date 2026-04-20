/**
 * Schedules Resource Manager
 *
 * Handles scheduled task management including CRUD operations
 * and schedule control (trigger/enable/disable).
 *
 * Note: projectId is now embedded in the API key, so routes use
 * simplified paths without /projects/:projectId prefix.
 */

import type { ApiClient } from '../ApiClient';
import type {
  Schedule,
  CreateScheduleParams,
  UpdateScheduleParams,
} from '../types';

export class SchedulesResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Create a new schedule
   *
   * Project is determined automatically from the API key.
   */
  async create(params: CreateScheduleParams): Promise<Schedule> {
    const response = await this.client.post<{ schedule: Schedule }>(
      `/schedules`,
      params
    );
    return response.schedule;
  }

  /**
   * List all schedules
   *
   * Project is determined automatically from the API key.
   */
  async list(
    params?: { enabled?: boolean; limit?: number; offset?: number }
  ): Promise<Schedule[]> {
    const response = await this.client.get<{
      data: Schedule[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(`/schedules`, params);
    return response.data;
  }

  /**
   * Get a schedule by ID
   */
  async get(scheduleId: string): Promise<Schedule> {
    const response = await this.client.get<{ schedule: Schedule }>(
      `/schedules/${scheduleId}`
    );
    return response.schedule;
  }

  /**
   * Update a schedule
   */
  async update(
    scheduleId: string,
    params: UpdateScheduleParams
  ): Promise<Schedule> {
    const response = await this.client.patch<{ schedule: Schedule }>(
      `/schedules/${scheduleId}`,
      params
    );
    return response.schedule;
  }

  /**
   * Delete a schedule
   */
  async delete(scheduleId: string): Promise<void> {
    await this.client.delete(`/schedules/${scheduleId}`);
  }

  // =========================================================================
  // Schedule Control
  // =========================================================================

  /**
   * Manually trigger a schedule
   */
  async trigger(scheduleId: string): Promise<{
    runId: string;
    triggered: boolean;
  }> {
    const response = await this.client.post<{
      runId: string;
      triggered: boolean;
    }>(`/schedules/${scheduleId}/trigger`);
    return response;
  }

  /**
   * Enable a schedule
   */
  async enable(scheduleId: string): Promise<Schedule> {
    const response = await this.client.patch<{ schedule: Schedule }>(
      `/schedules/${scheduleId}/enable`
    );
    return response.schedule;
  }

  /**
   * Disable a schedule
   */
  async disable(scheduleId: string): Promise<Schedule> {
    const response = await this.client.patch<{ schedule: Schedule }>(
      `/schedules/${scheduleId}/disable`
    );
    return response.schedule;
  }
}
