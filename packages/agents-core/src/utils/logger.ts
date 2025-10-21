/**
 * Structured Logger - Production-ready logging with levels and context
 *
 * Provides:
 * - Log levels (debug, info, warn, error)
 * - Structured output (JSON)
 * - Context propagation
 * - Trace IDs
 * - Performance timing
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LogContext {
  traceId?: string;
  sessionId?: string;
  agentName?: string;
  agentType?: string;
  runtime?: string;
  operation?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: string;
  logger: string;
  message: string;
  timestamp: string;
  context?: LogContext;
  meta?: any;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export type LogFormatter = (entry: LogEntry) => string;

/**
 * Default formatter - outputs JSON
 */
export const jsonFormatter: LogFormatter = (entry: LogEntry): string => {
  return JSON.stringify(entry);
};

/**
 * Pretty formatter - human-readable output
 */
export const prettyFormatter: LogFormatter = (entry: LogEntry): string => {
  const parts: string[] = [];

  // Timestamp and level
  const timestamp = new Date(entry.timestamp).toISOString();
  const levelColors: Record<string, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
  };
  const color = levelColors[entry.level] || '';
  const reset = '\x1b[0m';

  parts.push(`${timestamp} ${color}${entry.level.toUpperCase()}${reset} [${entry.logger}]`);

  // Message
  parts.push(entry.message);

  // Context
  if (entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = Object.entries(entry.context)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    parts.push(`{${contextStr}}`);
  }

  // Duration
  if (entry.duration !== undefined) {
    parts.push(`(${entry.duration}ms)`);
  }

  // Meta
  if (entry.meta) {
    parts.push(JSON.stringify(entry.meta));
  }

  // Error
  if (entry.error) {
    parts.push(`\n  Error: ${entry.error.message}`);
    if (entry.error.stack) {
      parts.push(`\n  Stack: ${entry.error.stack}`);
    }
  }

  return parts.join(' ');
};

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Logger name (e.g., 'CloudRuntime', 'WorkspaceSync')
   */
  name: string;

  /**
   * Minimum log level to output
   * @default LogLevel.INFO
   */
  level?: LogLevel;

  /**
   * Output formatter
   * @default jsonFormatter in production, prettyFormatter in development
   */
  formatter?: LogFormatter;

  /**
   * Context to include in all log entries
   */
  context?: LogContext;

  /**
   * Output function (defaults to console.log)
   */
  output?: (message: string) => void;
}

/**
 * Structured logger with levels and context
 */
export class Logger {
  private level: LogLevel;
  private formatter: LogFormatter;
  private context: LogContext;
  private output: (message: string) => void;

  constructor(private config: LoggerConfig) {
    this.level = config.level ?? LogLevel.INFO;
    this.context = config.context ?? {};
    this.output = config.output ?? console.log;

    // Default formatter based on environment
    const isDevelopment = process.env.NODE_ENV !== 'production';
    this.formatter = config.formatter ?? (isDevelopment ? prettyFormatter : jsonFormatter);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger({
      ...this.config,
      context: { ...this.context, ...context },
    });
  }

  /**
   * Log at debug level
   */
  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log at info level
   */
  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log at warn level
   */
  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error, meta?: any): void {
    const entry: LogEntry = {
      level: 'error',
      logger: this.config.name,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      meta,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (this.level <= LogLevel.ERROR) {
      this.output(this.formatter(entry));
    }
  }

  /**
   * Time an operation
   */
  async time<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.debug(`Starting: ${operation}`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      const entry: LogEntry = {
        level: 'info',
        logger: this.config.name,
        message: `Completed: ${operation}`,
        timestamp: new Date().toISOString(),
        context: this.context,
        duration,
      };

      if (this.level <= LogLevel.INFO) {
        this.output(this.formatter(entry));
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      const entry: LogEntry = {
        level: 'error',
        logger: this.config.name,
        message: `Failed: ${operation}`,
        timestamp: new Date().toISOString(),
        context: this.context,
        duration,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack,
        },
      };

      if (this.level <= LogLevel.ERROR) {
        this.output(this.formatter(entry));
      }

      throw error;
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    if (this.level > level) {
      return;
    }

    const levelNames = ['debug', 'info', 'warn', 'error'];
    const entry: LogEntry = {
      level: levelNames[level],
      logger: this.config.name,
      message,
      timestamp: new Date().toISOString(),
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      meta,
    };

    this.output(this.formatter(entry));
  }
}

/**
 * Generate a trace ID
 */
export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Global logger registry
 */
const loggers = new Map<string, Logger>();

/**
 * Get or create a logger
 */
export function getLogger(name: string, config?: Partial<LoggerConfig>): Logger {
  const key = name;

  if (!loggers.has(key)) {
    loggers.set(
      key,
      new Logger({
        name,
        ...config,
      })
    );
  }

  return loggers.get(key)!;
}

/**
 * Set global log level for all loggers
 */
export function setGlobalLogLevel(level: LogLevel): void {
  for (const logger of loggers.values()) {
    logger.setLevel(level);
  }
}
