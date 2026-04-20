/**
 * Low-level API client for the Computer Agents Cloud API
 *
 * This handles HTTP requests, authentication, and error handling.
 * Higher-level resource managers use this client.
 */

import type { ApiError } from './types';

export interface ApiClientConfig {
  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Base URL for the API
   * @default 'https://api.computer-agents.com'
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly debug: boolean;

  constructor(config: ApiClientConfig) {
    if (!config.apiKey) {
      throw new Error(
        'API key is required. Provide it via:\n' +
        '1. Constructor: new ApiClient({ apiKey: "..." })\n' +
        '2. Environment variable: COMPUTER_AGENTS_API_KEY'
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.computer-agents.com').replace(/\/$/, '');
    this.timeout = config.timeout ?? 60000;
    this.debug = config.debug ?? false;
  }

  /**
   * Make an HTTP request to the API
   */
  async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      timeout?: number;
      stream?: boolean;
    } = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    // Add query parameters
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    if (options.body && !options.headers?.['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.stream) {
      headers['Accept'] = 'text/event-stream';
    }

    if (this.debug) {
      console.log(`[ApiClient] ${method} ${url.toString()}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout ?? this.timeout
    );

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // For streaming responses, return the response directly
      if (options.stream) {
        if (!response.ok) {
          const error = await this.parseError(response);
          throw error;
        }
        return response as unknown as T;
      }

      // Parse JSON response
      if (!response.ok) {
        const error = await this.parseError(response);
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError(
          `Request timeout after ${options.timeout ?? this.timeout}ms`,
          408,
          'TIMEOUT'
        );
      }

      throw new ApiClientError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        'NETWORK_ERROR'
      );
    }
  }

  private async parseError(response: Response): Promise<ApiClientError> {
    let errorData: ApiError;

    try {
      errorData = await response.json() as ApiError;
    } catch {
      errorData = {
        error: response.statusText,
        message: `HTTP ${response.status}`,
      };
    }

    return new ApiClientError(
      errorData.message || errorData.error,
      response.status,
      errorData.code,
      errorData.details
    );
  }

  // Convenience methods
  async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  async post<T>(path: string, body?: unknown, options?: { stream?: boolean }): Promise<T> {
    return this.request<T>('POST', path, { body, ...options });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the API key (for special requests like FormData)
   * @internal
   */
  getApiKey(): string {
    return this.apiKey;
  }
}
