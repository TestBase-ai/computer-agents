/**
 * Audit Logging Middleware
 *
 * Logs all API requests with detailed information for security and debugging.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

interface AuditLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  ip: string;
  userAgent?: string;
  apiKeyPrefix?: string;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}

/**
 * Audit logging middleware
 *
 * Logs all requests with timing and response information
 */
export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Extract API key prefix for logging (if present)
  let apiKeyPrefix: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const key = authHeader.substring(7);
    apiKeyPrefix = key.substring(0, 8) + '...';
  } else if (req.headers['x-api-key']) {
    const key = req.headers['x-api-key'] as string;
    apiKeyPrefix = key.substring(0, 8) + '...';
  }

  // Get request size
  const requestSize = req.headers['content-length']
    ? parseInt(req.headers['content-length'], 10)
    : undefined;

  // Capture original res.json to log response
  const originalJson = res.json.bind(res);
  let responseBody: any;

  res.json = function (body: any) {
    responseBody = body;
    return originalJson(body);
  };

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseSize = res.getHeader('content-length')
      ? parseInt(res.getHeader('content-length') as string, 10)
      : undefined;

    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      apiKeyPrefix,
      requestSize,
      responseSize,
    };

    // Add error info if response was an error
    if (res.statusCode >= 400 && responseBody?.error) {
      auditEntry.error = responseBody.error;
    }

    // Use appropriate log level based on status code
    if (res.statusCode >= 500) {
      logger.error('API Request (Server Error)', auditEntry);
    } else if (res.statusCode >= 400) {
      logger.warn('API Request (Client Error)', auditEntry);
    } else {
      logger.info('API Request', auditEntry);
    }
  });

  next();
}
