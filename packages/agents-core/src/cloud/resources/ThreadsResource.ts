/**
 * Threads Resource Manager
 *
 * Handles conversation threads including CRUD operations,
 * message execution with SSE streaming, and conversation history.
 *
 * Note: projectId is now embedded in the API key, so routes use
 * simplified paths without /projects/:projectId prefix.
 */

import type { ApiClient } from '../ApiClient';
import type {
  Thread,
  CreateThreadParams,
  UpdateThreadParams,
  ListThreadsParams,
  SendMessageParams,
  ThreadMessage,
  MessageStreamEvent,
  CopyThreadParams,
  SearchThreadsParams,
  SearchThreadsResponse,
  ThreadLogEntry,
  ResearchSession,
} from '../types';

/**
 * Callback for handling streaming events
 */
export type StreamEventCallback = (event: MessageStreamEvent) => void;

/**
 * Options for sendMessage
 */
export interface SendMessageOptions extends SendMessageParams {
  /**
   * Callback for handling streaming events
   */
  onEvent?: StreamEventCallback;

  /**
   * Timeout for the entire streaming operation
   * @default 600000 (10 minutes)
   */
  timeout?: number;
}

/**
 * Result from sendMessage
 */
export interface SendMessageResult {
  /**
   * The final response content
   */
  content: string;

  /**
   * Run details if available
   */
  run?: {
    id: string;
    status: string;
    tokens?: {
      input: number;
      output: number;
    };
  };

  /**
   * All events received during streaming
   */
  events: MessageStreamEvent[];
}

export interface ThreadStatusResult {
  id?: string;
  threadId: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  duration?: string | null;
  updatedAt?: string;
}

export interface ThreadStep {
  id: string;
  threadId?: string;
  sequence?: number;
  title?: string | null;
  eventType?: string | null;
  snapshotBeforeId?: string | null;
  snapshotAfterId?: string | null;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
}

export class ThreadsResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Create a new thread
   *
   * Project is determined automatically from the API key.
   */
  async create(params: CreateThreadParams): Promise<Thread> {
    const response = await this.client.post<{ thread: Thread }>(
      `/threads`,
      params
    );
    return response.thread;
  }

  /**
   * List threads
   *
   * Project is determined automatically from the API key.
   */
  async list(params: ListThreadsParams = {}): Promise<{
    data: Thread[];
    hasMore: boolean;
    total: number;
  }> {
    const response = await this.client.get<{
      data: Thread[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(`/threads`, {
      limit: params.limit,
      offset: params.offset,
      environmentId: params.environmentId,
      status: params.status,
    });
    return {
      data: response.data,
      hasMore: response.has_more,
      total: response.total_count,
    };
  }

  /**
   * Get a thread by ID with full message history
   */
  async get(threadId: string): Promise<Thread> {
    const response = await this.client.get<{ thread: Thread }>(
      `/threads/${threadId}`
    );
    return response.thread;
  }

  /**
   * Update a thread
   */
  async update(
    threadId: string,
    params: UpdateThreadParams
  ): Promise<Thread> {
    const response = await this.client.patch<{ thread: Thread }>(
      `/threads/${threadId}`,
      params
    );
    return response.thread;
  }

  /**
   * Delete a thread (soft delete)
   */
  async delete(threadId: string): Promise<void> {
    await this.client.delete(`/threads/${threadId}`);
  }

  /**
   * Get message history for a thread
   */
  async getMessages(threadId: string): Promise<{
    data: ThreadMessage[];
    hasMore: boolean;
    total: number;
  }> {
    const response = await this.client.get<{
      data: ThreadMessage[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(
      `/threads/${threadId}/messages`
    );
    return {
      data: response.data,
      hasMore: response.has_more,
      total: response.total_count,
    };
  }

  /**
   * Send a message to a thread and stream the response
   *
   * This method handles SSE streaming from the API and returns
   * the complete result when finished.
   *
   * @example
   * ```typescript
   * const result = await client.threads.sendMessage(
   *   'thread_456',
   *   {
   *     content: 'Create a REST API with Flask',
   *     onEvent: (event) => {
   *       if (event.type === 'response.item.completed') {
   *         console.log('Item:', event.item);
   *       }
   *     }
   *   }
   * );
   * console.log('Final response:', result.content);
   * ```
   */
  async sendMessage(
    threadId: string,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    const { onEvent, timeout = 600000, ...params } = options;

    // Make streaming request
    const response = await this.client.request<Response>(
      'POST',
      `/threads/${threadId}/messages`,
      {
        body: params,
        stream: true,
        timeout,
      }
    );

    const events: MessageStreamEvent[] = [];
    let finalContent = '';
    let runDetails: SendMessageResult['run'];

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as MessageStreamEvent;
              events.push(data);

              // Call event callback if provided
              if (onEvent) {
                onEvent(data);
              }

              // Extract final content and run details
              if (data.type === 'response.completed') {
                finalContent = (data as any).response?.content || '';
              } else if (data.type === 'stream.completed') {
                runDetails = (data as any).run;
              } else if (data.type === 'stream.error') {
                throw new Error((data as any).message || (data as any).error);
              }
            } catch (parseError) {
              // Ignore parse errors for non-JSON lines
              if (line.slice(6).trim()) {
                console.warn('Failed to parse SSE data:', line);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: finalContent,
      run: runDetails,
      events,
    };
  }

  /**
   * Copy a thread with all its conversation messages into a new thread
   *
   * Creates a new thread with the same environment and agent configuration,
   * copies all conversation messages, and marks the new thread as completed.
   *
   * @param threadId - The source thread to copy
   * @param params - Optional parameters (custom title)
   * @returns The newly created thread
   *
   * @example
   * ```typescript
   * // Copy with auto-generated title ("[Original Title] Copy")
   * const copy = await client.threads.copy('thread_abc');
   *
   * // Copy with custom title
   * const copy = await client.threads.copy('thread_abc', {
   *   title: 'My experiment v2'
   * });
   *
   * // Continue conversation on the copy
   * await client.threads.sendMessage(copy.id, {
   *   content: 'Try a different approach...',
   *   onEvent: (event) => console.log(event)
   * });
   * ```
   */
  async copy(
    threadId: string,
    params?: CopyThreadParams
  ): Promise<Thread> {
    const response = await this.client.post<{ thread: Thread }>(
      `/threads/${threadId}/copy`,
      params
    );
    return response.thread;
  }

  /**
   * Search threads by text query
   *
   * Full-text search across thread titles and messages.
   * Requires PostgreSQL backend.
   *
   * @example
   * ```typescript
   * const results = await client.threads.search({
   *   query: 'REST API',
   *   limit: 10
   * });
   *
   * for (const result of results.results) {
   *   console.log(result.thread.title, result.score);
   * }
   * ```
   */
  async search(params: SearchThreadsParams): Promise<SearchThreadsResponse> {
    const response = await this.client.post<SearchThreadsResponse>(
      `/threads/search`,
      params
    );
    return response;
  }

  /**
   * Get execution logs for a thread
   *
   * Returns logs with role separation (user, assistant, execution_log)
   * and relative timestamps from thread start time.
   */
  async getLogs(threadId: string): Promise<ThreadLogEntry[]> {
    const response = await this.client.get<{ logs: ThreadLogEntry[] }>(
      `/threads/${threadId}/logs`
    );
    return response.logs;
  }

  /**
   * Get execution status for a thread.
   */
  async getStatus(threadId: string): Promise<ThreadStatusResult> {
    return this.client.get(`/threads/${threadId}/status`);
  }

  /**
   * List timeline steps for a thread.
   */
  async listSteps(
    threadId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<ThreadStep[]> {
    const response = await this.client.get<{ data: ThreadStep[] }>(`/threads/${threadId}/steps`, params);
    return response.data;
  }

  async listStepFiles(
    threadId: string,
    stepId: string,
    params: { prefix?: string } = {},
  ): Promise<Array<Record<string, unknown>>> {
    const response = await this.client.get<{ data: Array<Record<string, unknown>> }>(
      `/threads/${threadId}/steps/${stepId}/files`,
      params,
    );
    return response.data;
  }

  async getStepDiff(
    threadId: string,
    stepId: string,
    params: { path?: string } = {},
  ): Promise<Record<string, unknown>> {
    return this.client.get(`/threads/${threadId}/steps/${stepId}/diff`, params);
  }

  async getStepFile(threadId: string, stepId: string, path: string): Promise<{
    path: string;
    snapshotId?: string | null;
    stepId: string;
    content: string;
  }> {
    return this.client.get(`/threads/${threadId}/steps/${stepId}/file`, { path });
  }

  async downloadStepFile(threadId: string, stepId: string, path: string): Promise<Buffer> {
    const response = await this.client.request<Response>(
      'GET',
      `/threads/${threadId}/steps/${stepId}/file/download`,
      {
        query: { path },
        stream: true,
      },
    );
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async forkFromStep(
    threadId: string,
    stepId: string,
    params: { mode?: 'historical' | 'latest'; title?: string | null; environmentName?: string | null } = {},
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/threads/${threadId}/steps/${stepId}/fork`, params);
  }

  async revertToStep(
    threadId: string,
    stepId: string,
    params: {
      historyActionType?: 'revert' | 'reapply';
      revertedChangeStepId?: string | null;
      revertedFilePath?: string | null;
      revertedFileName?: string | null;
    } = {},
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/threads/${threadId}/steps/${stepId}/revert`, params);
  }

  async getFileHistory(
    threadId: string,
    path: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<{
    data: Array<Record<string, unknown>>;
    total: number;
    hasMore: boolean;
  }> {
    const response = await this.client.get<{
      data: Array<Record<string, unknown>>;
      total_count: number;
      has_more: boolean;
    }>(`/threads/${threadId}/files/history`, { path, ...params });
    return {
      data: response.data,
      total: response.total_count,
      hasMore: response.has_more,
    };
  }

  async forkFromMessage(threadId: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.client.post(`/threads/${threadId}/fork-from-message`, params);
  }

  async getContextEstimate(threadId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/threads/${threadId}/context`);
  }

  async getContextDetails(threadId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/threads/${threadId}/context/details`);
  }

  async runContextAction(
    threadId: string,
    params: { action: 'compact' | 'clear' | 'fork' | 'btw'; prompt?: string | null; title?: string | null },
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/threads/${threadId}/context/actions`, params);
  }

  async generateTitle(
    threadId: string,
    params: { message: string; content?: string; task?: string; force?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/threads/${threadId}/generate-title`, params);
  }

  async getDiffs(threadId: string): Promise<Array<Record<string, unknown>>> {
    const response = await this.client.get<{ diffs?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> }>(
      `/threads/${threadId}/diffs`,
    );
    return response.diffs ?? response.data ?? [];
  }

  /**
   * List deep research sessions for a thread
   */
  async listResearch(threadId: string): Promise<ResearchSession[]> {
    const response = await this.client.get<{ sessions: ResearchSession[] }>(
      `/threads/${threadId}/research`
    );
    return response.sessions;
  }

  /**
   * Get a specific deep research session
   */
  async getResearch(
    threadId: string,
    sessionId: string
  ): Promise<ResearchSession> {
    const response = await this.client.get<{ session: ResearchSession }>(
      `/threads/${threadId}/research/${sessionId}`
    );
    return response.session;
  }

  /**
   * Delete a deep research session
   */
  async deleteResearch(
    threadId: string,
    sessionId: string
  ): Promise<void> {
    await this.client.delete(
      `/threads/${threadId}/research/${sessionId}`
    );
  }

  /**
   * Cancel an in-progress message execution
   */
  async cancel(threadId: string): Promise<void> {
    await this.client.post(`/threads/${threadId}/cancel`);
  }

  /**
   * Resume a thread (useful after server restart)
   */
  async resume(threadId: string): Promise<Thread> {
    const response = await this.client.post<{ thread: Thread }>(
      `/threads/${threadId}/resume`
    );
    return response.thread;
  }
}
