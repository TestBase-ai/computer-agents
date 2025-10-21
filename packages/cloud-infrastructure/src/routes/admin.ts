/**
 * Admin Routes for API Key Management
 *
 * These endpoints allow dashboard/admin users to manage API keys.
 * Protected by admin authentication (master key).
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/client.js';
import { generateApiKey, extractKeyPrefix } from '../utils/crypto.js';
import { logger } from '../logger.js';

const router = Router();
const db = getDatabase();

/**
 * Admin authentication middleware
 * Requires ADMIN_API_KEY to access these endpoints
 */
function adminAuth(req: Request, res: Response, next: Function): void {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    logger.error('ADMIN_API_KEY not configured - admin endpoints disabled');
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Admin endpoints not configured',
    });
    return;
  }

  // Check Authorization header
  const authHeader = req.headers.authorization;
  let providedKey: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  }

  // Also check X-Admin-Key header
  if (!providedKey) {
    providedKey = req.headers['x-admin-key'] as string;
  }

  if (!providedKey || providedKey !== adminKey) {
    logger.warn('Admin authentication failed', {
      path: req.path,
      ip: req.ip,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin authentication required',
    });
    return;
  }

  next();
}

// Apply admin auth to all routes in this router
router.use(adminAuth);

// ============================================================================
// API Key Management Endpoints
// ============================================================================

/**
 * POST /admin/keys
 * Create a new API key
 *
 * Body:
 * {
 *   name: string;           // Required: Human-readable name
 *   description?: string;   // Optional: Description
 *   prefix?: string;        // Optional: Key prefix (default: "tb_")
 *   keyType?: string;       // Optional: 'standard' (billable) or 'internal' (unlimited)
 *   expiresIn?: number;     // Optional: Expiration in days
 *   permissions?: string[]; // Optional: Permissions (default: all)
 *   metadata?: object;      // Optional: Custom metadata
 * }
 *
 * Response:
 * {
 *   id: string;
 *   key: string;            // ⚠️ Only returned once - store it!
 *   keyPrefix: string;
 *   keyType: string;
 *   name: string;
 *   createdAt: string;
 *   expiresAt?: string;
 *   permissions: string[];
 * }
 */
router.post('/keys', (req: Request, res: Response) => {
  try {
    const { name, description, prefix, keyType, expiresIn, permissions, metadata } = req.body;

    // Validation
    if (!name || typeof name !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'name is required and must be a string',
      });
      return;
    }

    // Validate keyType
    if (keyType && keyType !== 'standard' && keyType !== 'internal') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'keyType must be either "standard" or "internal"',
      });
      return;
    }

    // Generate API key
    const keyPrefix = prefix || 'tb_';
    const apiKey = generateApiKey(keyPrefix);
    const keyPrefixForDb = extractKeyPrefix(apiKey);

    // Calculate expiration
    let expiresAt: string | undefined;
    if (expiresIn && typeof expiresIn === 'number' && expiresIn > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiresIn);
      expiresAt = expirationDate.toISOString();
    }

    // Create in database
    const created = db.createApiKey({
      key: apiKey,
      keyPrefix: keyPrefixForDb,
      keyType: keyType || 'standard',
      name,
      description,
      expiresAt,
      permissions: permissions || ['execute', 'read', 'write', 'admin'],
      metadata,
    });

    logger.info('API key created via admin endpoint', {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      keyType: created.keyType,
    });

    // ⚠️ IMPORTANT: Return the actual key only once
    // Client must store this - it cannot be retrieved again
    res.status(201).json({
      id: created.id,
      key: apiKey, // ⚠️ Only time the plain key is returned
      keyPrefix: created.keyPrefix,
      keyType: created.keyType,
      name: created.name,
      description: created.description,
      createdAt: created.createdAt,
      expiresAt: created.expiresAt,
      permissions: created.permissions,
      metadata: created.metadata,
      warning: '⚠️ Store this key securely - it cannot be retrieved again!',
    });
  } catch (error) {
    logger.error('Failed to create API key', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create API key',
    });
  }
});

/**
 * GET /admin/keys
 * List all API keys
 *
 * Query params:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - includeInactive: boolean (default: false)
 *
 * Response:
 * {
 *   keys: ApiKey[];
 *   total: number;
 * }
 */
router.get('/keys', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const includeInactive = req.query.includeInactive === 'true';

    const keys = db.listApiKeys({ limit, offset, includeInactive });

    // Remove the actual key hash from response (security)
    const sanitizedKeys = keys.map((k) => ({
      id: k.id,
      keyPrefix: k.keyPrefix,
      keyType: k.keyType,
      name: k.name,
      description: k.description,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      isActive: k.isActive,
      permissions: k.permissions,
      metadata: k.metadata,
    }));

    res.json({
      keys: sanitizedKeys,
      total: sanitizedKeys.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to list API keys', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list API keys',
    });
  }
});

/**
 * GET /admin/keys/:id
 * Get API key details
 *
 * Response: ApiKey (without the actual key hash)
 */
router.get('/keys/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = db.getApiKey(id);

    if (!apiKey) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
      return;
    }

    // Get usage stats
    const stats = db.getUsageStats(id);

    res.json({
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      keyType: apiKey.keyType,
      name: apiKey.name,
      description: apiKey.description,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive,
      permissions: apiKey.permissions,
      metadata: apiKey.metadata,
      usage: stats,
    });
  } catch (error) {
    logger.error('Failed to get API key', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get API key',
    });
  }
});

/**
 * PATCH /admin/keys/:id
 * Update API key metadata
 *
 * Body:
 * {
 *   name?: string;
 *   description?: string;
 *   permissions?: string[];
 *   metadata?: object;
 * }
 */
router.patch('/keys/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const success = db.updateApiKey(id, updates);

    if (!success) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found or no changes made',
      });
      return;
    }

    const updated = db.getApiKey(id);

    res.json({
      id: updated!.id,
      keyPrefix: updated!.keyPrefix,
      name: updated!.name,
      description: updated!.description,
      permissions: updated!.permissions,
      metadata: updated!.metadata,
    });
  } catch (error) {
    logger.error('Failed to update API key', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update API key',
    });
  }
});

/**
 * POST /admin/keys/:id/revoke
 * Revoke an API key (soft delete)
 */
router.post('/keys/:id/revoke', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = db.revokeApiKey(id);

    if (!success) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
      return;
    }

    logger.info('API key revoked via admin endpoint', { id });

    res.json({
      success: true,
      message: 'API key revoked successfully',
      id,
    });
  } catch (error) {
    logger.error('Failed to revoke API key', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke API key',
    });
  }
});

/**
 * DELETE /admin/keys/:id
 * Permanently delete an API key (hard delete)
 */
router.delete('/keys/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = db.deleteApiKey(id);

    if (!success) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
      return;
    }

    logger.info('API key deleted via admin endpoint', { id });

    res.json({
      success: true,
      message: 'API key deleted permanently',
      id,
    });
  } catch (error) {
    logger.error('Failed to delete API key', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete API key',
    });
  }
});

/**
 * GET /admin/keys/:id/usage
 * Get usage statistics for an API key
 *
 * Query params:
 * - since: ISO timestamp (optional)
 */
router.get('/keys/:id/usage', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const since = req.query.since as string | undefined;

    const apiKey = db.getApiKey(id);
    if (!apiKey) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
      return;
    }

    const stats = db.getUsageStats(id, since);

    res.json({
      keyId: id,
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get usage stats', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get usage stats',
    });
  }
});

export default router;
