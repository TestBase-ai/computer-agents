/**
 * Database Schema for Testbase Cloud
 *
 * Uses SQLite for simplicity - can be migrated to PostgreSQL for production.
 */

export type ApiKeyType = 'standard' | 'internal';

export interface ApiKey {
  id: string;              // UUID
  key: string;             // The actual API key (hashed in DB)
  keyPrefix: string;       // First 8 chars for identification (e.g., "tb_prod_")
  keyType: ApiKeyType;     // 'standard' (normal users) or 'internal' (unlimited usage for testing)
  name: string;            // Human-readable name
  description?: string;    // Optional description
  createdAt: string;       // ISO timestamp
  lastUsedAt?: string;     // ISO timestamp
  expiresAt?: string;      // ISO timestamp (optional expiration)
  isActive: boolean;       // Can be revoked by setting to false
  permissions: string[];   // Array of permissions (e.g., ["execute", "read", "write"])
  metadata?: Record<string, any>; // Optional custom metadata
}

export interface ApiKeyUsage {
  id: string;              // UUID
  keyId: string;           // Foreign key to ApiKey
  endpoint: string;        // API endpoint called
  method: string;          // HTTP method
  statusCode: number;      // Response status
  timestamp: string;       // ISO timestamp
  ipAddress?: string;      // Client IP
  userAgent?: string;      // Client user agent
}

/**
 * SQL Schema Definitions
 */

export const CREATE_API_KEYS_TABLE = `
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_type TEXT NOT NULL DEFAULT 'standard',
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  permissions TEXT NOT NULL,
  metadata TEXT,
  CHECK(is_active IN (0, 1)),
  CHECK(key_type IN ('standard', 'internal'))
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_type ON api_keys(key_type);
`;

export const CREATE_API_KEY_USAGE_TABLE = `
CREATE TABLE IF NOT EXISTS api_key_usage (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp);
`;
