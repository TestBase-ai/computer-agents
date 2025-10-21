/**
 * Retry Utilities - Automatic retry logic with exponential backoff
 *
 * Handles transient failures gracefully with:
 * - Configurable retry attempts
 * - Exponential backoff
 * - Jitter to prevent thundering herd
 * - Selective retry based on error type
 */

import { isRetryableError } from './errors';

export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Backoff multiplier
   * @default 2
   */
  backoffFactor?: number;

  /**
   * Add jitter to prevent thundering herd
   * @default true
   */
  jitter?: boolean;

  /**
   * Custom function to determine if error is retryable
   * If not provided, uses default isRetryableError
   */
  isRetryable?: (error: Error) => boolean;

  /**
   * Callback called before each retry
   */
  onRetry?: (attempt: number, error: Error, delay: number) => void;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
  isRetryable: isRetryableError,
  debug: false,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  config: Required<Omit<RetryConfig, 'onRetry'>>
): number {
  // Exponential backoff: initialDelay * (backoffFactor ^ attempt)
  let delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);

  // Cap at maxDelay
  delay = Math.min(delay, config.maxDelay);

  // Add jitter (±25% of delay)
  if (config.jitter) {
    const jitterAmount = delay * 0.25;
    const jitter = (Math.random() * 2 - 1) * jitterAmount;
    delay += jitter;
  }

  return Math.floor(delay);
}

/**
 * Retry an async operation with exponential backoff
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     return await fetch('https://api.example.com/data');
 *   },
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 1000,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Attempt ${attempt} failed: ${error.message}`);
 *       console.log(`Retrying in ${delay}ms...`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  userConfig: RetryConfig = {}
): Promise<T> {
  const config: Required<Omit<RetryConfig, 'onRetry'>> = {
    ...DEFAULT_RETRY_CONFIG,
    ...userConfig,
    isRetryable: userConfig.isRetryable || DEFAULT_RETRY_CONFIG.isRetryable,
  };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      if (config.debug && attempt > 1) {
        console.log(`[Retry] Attempt ${attempt}/${config.maxAttempts}`);
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (!config.isRetryable(lastError)) {
        if (config.debug) {
          console.log(`[Retry] Error not retryable: ${lastError.message}`);
        }
        throw lastError;
      }

      // If this was the last attempt, throw
      if (attempt >= config.maxAttempts) {
        if (config.debug) {
          console.log(`[Retry] Max attempts (${config.maxAttempts}) reached`);
        }
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config);

      if (config.debug) {
        console.log(
          `[Retry] Attempt ${attempt} failed: ${lastError.message}`
        );
        console.log(`[Retry] Retrying in ${delay}ms...`);
      }

      // Call onRetry callback if provided
      if (userConfig.onRetry) {
        userConfig.onRetry(attempt, lastError, delay);
      }

      await sleep(delay);
    }
  }

  // All attempts failed
  throw lastError;
}

/**
 * Retry with custom backoff strategy
 */
export async function withCustomBackoff<T>(
  operation: () => Promise<T>,
  delays: number[],
  isRetryable: (error: Error) => boolean = isRetryableError
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryable(lastError) || attempt >= delays.length) {
        throw lastError;
      }

      await sleep(delays[attempt]);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return withRetry(() => fn(...args), config);
  };
}

/**
 * Retry configuration presets for common scenarios
 */
export const RetryPresets = {
  /**
   * Quick retry for fast operations (3 attempts, 500ms initial delay)
   */
  quick: {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffFactor: 2,
  } as RetryConfig,

  /**
   * Standard retry for most operations (3 attempts, 1s initial delay)
   */
  standard: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  } as RetryConfig,

  /**
   * Aggressive retry for critical operations (5 attempts, 1s initial delay)
   */
  aggressive: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
  } as RetryConfig,

  /**
   * Patient retry for slow operations (5 attempts, 2s initial delay)
   */
  patient: {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffFactor: 2,
  } as RetryConfig,

  /**
   * Rate limit retry (handles 429 responses)
   */
  rateLimit: {
    maxAttempts: 10,
    initialDelay: 5000,
    maxDelay: 120000,
    backoffFactor: 1.5,
    isRetryable: (error: Error) => {
      return /429|rate.?limit/i.test(error.message);
    },
  } as RetryConfig,
};
