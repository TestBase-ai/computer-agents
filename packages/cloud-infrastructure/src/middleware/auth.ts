/**
 * API Key Authentication Middleware
 *
 * Validates API keys for protected endpoints.
 * Supports both database-backed keys and legacy environment variable keys.
 * Public endpoints (health, metrics) are accessible without authentication.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { getDatabase } from '../db/client.js';

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/health',
  '/metrics',
  '/metrics/history',
];

/**
 * Check if endpoint is public (doesn't require auth)
 */
function isPublicEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINTS.some((endpoint) => path.startsWith(endpoint));
}

/**
 * Extended Request with authenticated API key info
 */
export interface AuthenticatedRequest extends Request {
  apiKeyId?: string;
  apiKeyName?: string;
  apiKeyPermissions?: string[];
}

/**
 * API key authentication middleware
 *
 * Authentication flow:
 * 1. Check database for API key (primary method)
 * 2. Fall back to TESTBASE_API_KEYS environment variable (legacy)
 * 3. If no keys configured anywhere, run in open mode (insecure, warn)
 *
 * Checks for API key in:
 * 1. Authorization header (Bearer token)
 * 2. X-API-Key header
 * 3. api_key query parameter (for testing/debugging)
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Skip auth for public endpoints
  if (isPublicEndpoint(req.path)) {
    return next();
  }

  // Extract API key from request
  let apiKey: string | undefined;

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  }

  // Check X-API-Key header
  if (!apiKey) {
    apiKey = req.headers['x-api-key'] as string;
  }

  // Check query parameter (for testing/debugging)
  if (!apiKey) {
    apiKey = req.query.api_key as string;
  }

  // No API key provided
  if (!apiKey) {
    logger.warn('Authentication failed: No API key provided', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide via Authorization header (Bearer token), X-API-Key header, or api_key query parameter.',
    });
    return;
  }

  // Try database authentication first
  try {
    const db = getDatabase();
    const dbKey = db.findApiKeyByKey(apiKey);

    if (dbKey) {
      // Check if key is expired
      if (dbKey.expiresAt) {
        const expirationDate = new Date(dbKey.expiresAt);
        if (expirationDate < new Date()) {
          logger.warn('Authentication failed: API key expired', {
            path: req.path,
            method: req.method,
            keyId: dbKey.id,
            keyName: dbKey.name,
            expiresAt: dbKey.expiresAt,
          });

          res.status(401).json({
            error: 'Unauthorized',
            message: 'API key has expired',
          });
          return;
        }
      }

      // Check permissions (optional - implement per-endpoint checks if needed)
      // For now, we just store permissions on the request

      // Update last used timestamp (async, don't wait)
      db.updateLastUsed(dbKey.id);

      // Record usage (async, don't wait)
      db.recordUsage({
        keyId: dbKey.id,
        endpoint: req.path,
        method: req.method,
        statusCode: 200, // Will be updated by response middleware if needed
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Attach key info to request for downstream use
      req.apiKeyId = dbKey.id;
      req.apiKeyName = dbKey.name;
      req.apiKeyPermissions = dbKey.permissions;

      logger.debug('Authentication successful (database)', {
        path: req.path,
        method: req.method,
        keyId: dbKey.id,
        keyName: dbKey.name,
        keyPrefix: dbKey.keyPrefix,
      });

      return next();
    }
  } catch (error) {
    // Database error - log but continue to fallback
    logger.error('Database authentication error, falling back to env vars', error);
  }

  // Fall back to environment variable keys (legacy support)
  const configuredKeys = process.env.TESTBASE_API_KEYS?.split(',').map((k) => k.trim()) || [];

  if (configuredKeys.length > 0 && configuredKeys.includes(apiKey)) {
    logger.debug('Authentication successful (env var - legacy)', {
      path: req.path,
      method: req.method,
      keyPrefix: apiKey.substring(0, 8) + '...',
    });

    return next();
  }

  // If no keys configured anywhere, allow all requests (open mode - very insecure)
  if (configuredKeys.length === 0) {
    logger.warn('No API keys configured (database or env) - running in open mode (INSECURE!)', {
      path: req.path,
      method: req.method,
    });
    return next();
  }

  // Authentication failed
  logger.warn('Authentication failed: Invalid API key', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    keyPrefix: apiKey.substring(0, 8) + '...',
  });

  res.status(403).json({
    error: 'Forbidden',
    message: 'Invalid API key',
  });
}
