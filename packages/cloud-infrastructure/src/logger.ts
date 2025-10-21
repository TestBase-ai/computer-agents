/**
 * Simple structured logger for GCE VM
 */

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    }));
  },

  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : error,
      timestamp: new Date().toISOString(),
    }));
  },

  debug: (message: string, meta?: any) => {
    if (process.env.DEBUG === 'true') {
      console.log(JSON.stringify({
        level: 'debug',
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      }));
    }
  },

  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    }));
  },
};
