/**
 * Error Utilities - Enhanced error handling with context and suggestions
 *
 * Provides better error messages with:
 * - Contextual information
 * - Actionable suggestions
 * - Links to documentation
 * - Structured error data
 */

export interface ErrorContext {
  sessionId?: string;
  agentName?: string;
  agentType?: string;
  turnNumber?: number;
  operation?: string;
  phase?: 'planning' | 'execution' | 'review' | 'sync';
  runtime?: 'local' | 'cloud' | 'llm';
  [key: string]: any;
}

export interface ErrorSuggestion {
  title: string;
  description: string;
  action?: string;
  link?: string;
}

/**
 * Base error class with enhanced context and suggestions
 */
export class TestbaseError extends Error {
  constructor(
    message: string,
    public readonly context: ErrorContext = {},
    public readonly suggestions: ErrorSuggestion[] = [],
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TestbaseError';
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Format error with context and suggestions
   */
  toString(): string {
    const parts: string[] = [`${this.name}: ${this.message}`];

    // Add context if available
    if (Object.keys(this.context).length > 0) {
      parts.push('\nContext:');
      for (const [key, value] of Object.entries(this.context)) {
        if (value !== undefined && value !== null) {
          parts.push(`  ${key}: ${value}`);
        }
      }
    }

    // Add suggestions if available
    if (this.suggestions.length > 0) {
      parts.push('\nSuggestions:');
      for (const suggestion of this.suggestions) {
        parts.push(`  • ${suggestion.title}`);
        if (suggestion.description) {
          parts.push(`    ${suggestion.description}`);
        }
        if (suggestion.action) {
          parts.push(`    → ${suggestion.action}`);
        }
        if (suggestion.link) {
          parts.push(`    📖 ${suggestion.link}`);
        }
      }
    }

    // Add cause if available
    if (this.cause) {
      parts.push(`\nCaused by: ${this.cause.message}`);
      if (this.cause.stack) {
        parts.push(this.cause.stack);
      }
    }

    return parts.join('\n');
  }
}

/**
 * Configuration error - invalid or missing configuration
 */
export class ConfigurationError extends TestbaseError {
  constructor(
    message: string,
    public readonly configKey: string,
    suggestions: ErrorSuggestion[] = [],
    context: ErrorContext = {}
  ) {
    super(
      message,
      { ...context, configKey },
      suggestions.length > 0
        ? suggestions
        : [
            {
              title: 'Check your configuration',
              description: `The configuration key '${configKey}' is invalid or missing`,
              action: 'Review your runtime or agent configuration',
            },
          ]
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Runtime error - error during agent execution
 */
export class RuntimeError extends TestbaseError {
  constructor(
    message: string,
    context: ErrorContext = {},
    suggestions: ErrorSuggestion[] = [],
    cause?: Error
  ) {
    super(message, context, suggestions, cause);
    this.name = 'RuntimeError';
  }
}

/**
 * Storage error - error during storage operations
 */
export class StorageError extends TestbaseError {
  constructor(
    message: string,
    public readonly storageType: 'local' | 'gcs' | 's3' | 'unknown',
    public readonly operation: string,
    suggestions: ErrorSuggestion[] = [],
    context: ErrorContext = {},
    cause?: Error
  ) {
    super(
      message,
      { ...context, storageType, operation },
      suggestions.length > 0
        ? suggestions
        : [
            {
              title: 'Check storage configuration',
              description: `Storage operation '${operation}' failed`,
              action: `Verify ${storageType} storage is properly configured`,
            },
          ],
      cause
    );
    this.name = 'StorageError';
  }
}

/**
 * Cloud error - error during cloud operations
 */
export class CloudError extends TestbaseError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    suggestions: ErrorSuggestion[] = [],
    context: ErrorContext = {},
    cause?: Error
  ) {
    super(
      message,
      { ...context, statusCode },
      suggestions.length > 0 ? suggestions : CloudError.getSuggestionsForStatus(statusCode),
      cause
    );
    this.name = 'CloudError';
  }

  private static getSuggestionsForStatus(statusCode?: number): ErrorSuggestion[] {
    if (!statusCode) return [];

    switch (statusCode) {
      case 401:
      case 403:
        return [
          {
            title: 'Check API credentials',
            description: 'Authentication failed',
            action: 'Verify TESTBASE_API_KEY is set correctly',
          },
          {
            title: 'Check permissions',
            description: 'Your API key may lack necessary permissions',
            action: 'Contact support or check IAM permissions',
          },
        ];

      case 404:
        return [
          {
            title: 'Resource not found',
            description: 'The requested resource does not exist',
            action: 'Verify container ID, session ID, or workspace path',
          },
        ];

      case 429:
        return [
          {
            title: 'Rate limit exceeded',
            description: 'Too many requests',
            action: 'Wait a moment and retry, or contact support for higher limits',
          },
        ];

      case 500:
      case 502:
      case 503:
      case 504:
        return [
          {
            title: 'Service temporarily unavailable',
            description: 'The cloud service is experiencing issues',
            action: 'Retry in a few moments - this is usually transient',
          },
        ];

      default:
        return [];
    }
  }
}

/**
 * Container error - error related to cloud containers
 */
export class ContainerError extends TestbaseError {
  constructor(
    message: string,
    public readonly containerId?: string,
    suggestions: ErrorSuggestion[] = [],
    context: ErrorContext = {},
    cause?: Error
  ) {
    super(
      message,
      { ...context, containerId },
      suggestions.length > 0
        ? suggestions
        : [
            {
              title: 'Container issue detected',
              description: 'The cloud container encountered a problem',
              action: 'Try recreating the container or check container logs',
            },
          ],
      cause
    );
    this.name = 'ContainerError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const retryablePatterns = [
    /econnreset/,
    /etimedout/,
    /enotfound/,
    /network/,
    /timeout/,
    /503/,
    /502/,
    /504/,
    /429/, // Rate limit
    /container not ready/,
    /temporary/,
    /transient/,
  ];

  return retryablePatterns.some((pattern) => pattern.test(message));
}

/**
 * Wrap an error with additional context
 */
export function wrapError(
  error: Error,
  message: string,
  context: ErrorContext = {},
  suggestions: ErrorSuggestion[] = []
): TestbaseError {
  if (error instanceof TestbaseError) {
    // Merge contexts and suggestions
    return new TestbaseError(
      message,
      { ...error.context, ...context },
      [...error.suggestions, ...suggestions],
      error.cause || error
    );
  }

  return new TestbaseError(message, context, suggestions, error);
}

/**
 * Format an error for logging
 */
export function formatErrorForLogging(error: Error): Record<string, any> {
  if (error instanceof TestbaseError) {
    return {
      name: error.name,
      message: error.message,
      context: error.context,
      suggestions: error.suggestions.map((s) => s.title),
      cause: error.cause ? error.cause.message : undefined,
      stack: error.stack,
    };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}
