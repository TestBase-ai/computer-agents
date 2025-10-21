/**
 * Cryptographic utilities for API key generation and hashing
 */

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a secure API key with prefix
 *
 * @param prefix - Key prefix (e.g., "tb_dev_", "tb_prod_")
 * @param length - Length of random part (default: 32 bytes = 64 hex chars)
 * @returns Secure API key with format: `{prefix}{random_hex}`
 *
 * @example
 * generateApiKey('tb_prod_') // "tb_prod_a1b2c3d4e5f6..."
 */
export function generateApiKey(prefix: string = 'tb_', length: number = 32): string {
  const randomHex = randomBytes(length).toString('hex');
  return `${prefix}${randomHex}`;
}

/**
 * Hash an API key for secure storage
 *
 * Uses SHA-256 for fast lookup while maintaining security.
 * In production, consider using bcrypt/scrypt for even better security.
 *
 * @param key - The plain API key
 * @returns Hashed API key (SHA-256 hex)
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an API key against its hash
 *
 * @param key - The plain API key
 * @param hash - The stored hash
 * @returns True if key matches hash
 */
export function verifyApiKey(key: string, hash: string): boolean {
  return hashApiKey(key) === hash;
}

/**
 * Extract prefix from API key
 *
 * @param key - The API key
 * @returns Prefix (first 8 chars) for identification
 *
 * @example
 * extractKeyPrefix('tb_prod_a1b2c3d4...') // "tb_prod_"
 */
export function extractKeyPrefix(key: string): string {
  return key.substring(0, Math.min(8, key.length));
}

/**
 * Generate a secure random token (for session IDs, etc.)
 *
 * @param length - Length in bytes (default: 32)
 * @returns Random hex string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
