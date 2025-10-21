/**
 * Database Client for Testbase Cloud
 *
 * Handles all database operations for API keys and usage tracking.
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { CREATE_API_KEYS_TABLE, CREATE_API_KEY_USAGE_TABLE, ApiKey, ApiKeyUsage, ApiKeyType } from './schema.js';
import {
  CREATE_USAGE_RECORDS_TABLE,
  CREATE_BILLING_ACCOUNTS_TABLE,
  CREATE_TRANSACTIONS_TABLE,
} from './billing-schema.js';
import { BillingClient } from './billing-client.js';
import { logger } from '../logger.js';
import { hashApiKey } from '../utils/crypto.js';

const DB_PATH = process.env.DB_PATH || '/opt/testbase-cloud/data/testbase.db';

export class DatabaseClient {
  private db: Database.Database;
  public billing: BillingClient;

  constructor(dbPath: string = DB_PATH) {
    logger.info('Initializing database', { path: dbPath });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    this.initializeTables();
    this.billing = new BillingClient(this.db);
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    try {
      // Core tables
      this.db.exec(CREATE_API_KEYS_TABLE);
      this.db.exec(CREATE_API_KEY_USAGE_TABLE);

      // Billing tables
      this.db.exec(CREATE_USAGE_RECORDS_TABLE);
      this.db.exec(CREATE_BILLING_ACCOUNTS_TABLE);
      this.db.exec(CREATE_TRANSACTIONS_TABLE);

      logger.info('Database tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database tables', error);
      throw error;
    }
  }

  // ============================================================================
  // API Key Operations
  // ============================================================================

  /**
   * Create a new API key
   */
  createApiKey(params: {
    key: string;
    keyPrefix: string;
    keyType?: ApiKeyType;
    name: string;
    description?: string;
    expiresAt?: string;
    permissions?: string[];
    metadata?: Record<string, any>;
  }): ApiKey {
    const id = randomUUID();
    const now = new Date().toISOString();
    const hashedKey = hashApiKey(params.key);

    const apiKey: ApiKey = {
      id,
      key: hashedKey,
      keyPrefix: params.keyPrefix,
      keyType: params.keyType || 'standard',
      name: params.name,
      description: params.description,
      createdAt: now,
      lastUsedAt: undefined,
      expiresAt: params.expiresAt,
      isActive: true,
      permissions: params.permissions || ['execute', 'read', 'write'],
      metadata: params.metadata,
    };

    const stmt = this.db.prepare(`
      INSERT INTO api_keys (
        id, key, key_prefix, key_type, name, description, created_at,
        expires_at, is_active, permissions, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      apiKey.id,
      apiKey.key,
      apiKey.keyPrefix,
      apiKey.keyType,
      apiKey.name,
      apiKey.description || null,
      apiKey.createdAt,
      apiKey.expiresAt || null,
      apiKey.isActive ? 1 : 0,
      JSON.stringify(apiKey.permissions),
      apiKey.metadata ? JSON.stringify(apiKey.metadata) : null
    );

    logger.info('API key created', {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      keyType: apiKey.keyType,
    });

    return apiKey;
  }

  /**
   * Find API key by the actual key value (hashed comparison)
   */
  findApiKeyByKey(key: string): ApiKey | null {
    const hashedKey = hashApiKey(key);

    const stmt = this.db.prepare(`
      SELECT * FROM api_keys
      WHERE key = ? AND is_active = 1
    `);

    const row = stmt.get(hashedKey) as any;

    if (!row) {
      return null;
    }

    return this.rowToApiKey(row);
  }

  /**
   * Get API key by ID
   */
  getApiKey(id: string): ApiKey | null {
    const stmt = this.db.prepare('SELECT * FROM api_keys WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.rowToApiKey(row);
  }

  /**
   * List all API keys (paginated)
   */
  listApiKeys(params?: {
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  }): ApiKey[] {
    const limit = params?.limit || 100;
    const offset = params?.offset || 0;
    const includeInactive = params?.includeInactive || false;

    const whereClause = includeInactive ? '' : 'WHERE is_active = 1';

    const stmt = this.db.prepare(`
      SELECT * FROM api_keys
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    return rows.map((row) => this.rowToApiKey(row));
  }

  /**
   * Update API key metadata
   */
  updateApiKey(
    id: string,
    updates: {
      name?: string;
      description?: string;
      permissions?: string[];
      metadata?: Record<string, any>;
    }
  ): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.permissions !== undefined) {
      fields.push('permissions = ?');
      values.push(JSON.stringify(updates.permissions));
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE api_keys
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    logger.info('API key updated', { id, changes: result.changes });

    return result.changes > 0;
  }

  /**
   * Update last used timestamp
   */
  updateLastUsed(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE api_keys
      SET last_used_at = ?
      WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), id);
  }

  /**
   * Revoke an API key (soft delete)
   */
  revokeApiKey(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE api_keys
      SET is_active = 0
      WHERE id = ?
    `);

    const result = stmt.run(id);

    logger.info('API key revoked', { id, changes: result.changes });

    return result.changes > 0;
  }

  /**
   * Delete an API key permanently (hard delete)
   */
  deleteApiKey(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM api_keys WHERE id = ?');
    const result = stmt.run(id);

    logger.info('API key deleted', { id, changes: result.changes });

    return result.changes > 0;
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  /**
   * Record API key usage
   */
  recordUsage(params: {
    keyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const usage: ApiKeyUsage = {
      id: randomUUID(),
      keyId: params.keyId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      timestamp: new Date().toISOString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };

    const stmt = this.db.prepare(`
      INSERT INTO api_key_usage (
        id, key_id, endpoint, method, status_code,
        timestamp, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      usage.id,
      usage.keyId,
      usage.endpoint,
      usage.method,
      usage.statusCode,
      usage.timestamp,
      usage.ipAddress || null,
      usage.userAgent || null
    );
  }

  /**
   * Get usage statistics for an API key
   */
  getUsageStats(keyId: string, since?: string): {
    totalRequests: number;
    successRate: number;
    lastUsed?: string;
  } {
    const sinceClause = since ? 'AND timestamp >= ?' : '';
    const params = since ? [keyId, since] : [keyId];

    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as successful,
        MAX(timestamp) as last_used
      FROM api_key_usage
      WHERE key_id = ? ${sinceClause}
    `);

    const row = stmt.get(...params) as any;

    return {
      totalRequests: row.total || 0,
      successRate: row.total > 0 ? (row.successful / row.total) * 100 : 0,
      lastUsed: row.last_used,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert database row to ApiKey object
   */
  private rowToApiKey(row: any): ApiKey {
    return {
      id: row.id,
      key: row.key,
      keyPrefix: row.key_prefix,
      keyType: row.key_type || 'standard',
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      isActive: row.is_active === 1,
      permissions: JSON.parse(row.permissions),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    logger.info('Database connection closed');
  }
}

// Singleton instance
let dbInstance: DatabaseClient | null = null;

/**
 * Get database client instance (singleton)
 */
export function getDatabase(): DatabaseClient {
  if (!dbInstance) {
    dbInstance = new DatabaseClient();
  }
  return dbInstance;
}
