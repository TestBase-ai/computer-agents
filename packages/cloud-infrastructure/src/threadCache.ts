/**
 * Thread Cache with LRU eviction and GCS persistence
 *
 * Provides session continuity for Codex SDK threads with:
 * - In-memory LRU cache (fast access)
 * - GCS persistence via gcsfuse (survives VM restarts)
 * - Automatic eviction policy (memory management)
 * - TTL-based cleanup (stale session removal)
 */

import { LRUCache } from 'lru-cache';
import { writeFile, readFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { logger } from './logger.js';

interface ThreadCacheEntry {
  threadId: string;
  thread: any; // Codex thread object
  sessionId: string;
  workspaceId: string;
  created: string;
  lastAccessed: string;
}

interface ThreadMetadata {
  threadId: string;
  sessionId: string;
  workspaceId: string;
  created: string;
  lastAccessed: string;
}

const THREAD_CACHE_DIR = '/mnt/workspaces/.thread-cache';
const MAX_CACHE_SIZE = 100; // Maximum threads in memory
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ThreadCache {
  private cache: LRUCache<string, ThreadCacheEntry>;
  private cacheDir: string;

  constructor(
    maxSize: number = MAX_CACHE_SIZE,
    ttl: number = TTL_MS,
    cacheDir: string = THREAD_CACHE_DIR
  ) {
    this.cacheDir = cacheDir;

    this.cache = new LRUCache<string, ThreadCacheEntry>({
      max: maxSize,
      ttl,
      ttlAutopurge: true,
      updateAgeOnGet: true, // Refresh TTL on access
      dispose: (entry, key) => {
        // When entry is evicted from memory, persist to GCS
        this.persistMetadata(entry).catch(err => {
          logger.warn('Failed to persist evicted thread metadata', {
            sessionId: key,
            error: err
          });
        });
      },
    });

    // Ensure cache directory exists
    this.initializeCacheDir().catch(err => {
      logger.error('Failed to initialize thread cache directory', err);
    });
  }

  /**
   * Ensure cache directory exists on gcsfuse mount
   */
  private async initializeCacheDir(): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
      logger.info('Thread cache directory initialized', { path: this.cacheDir });
    } catch (error) {
      logger.error('Failed to create thread cache directory', error);
      throw error;
    }
  }

  /**
   * Get thread from cache (checks memory first, then GCS)
   */
  async get(sessionId: string): Promise<any | null> {
    // Try memory cache first
    const entry = this.cache.get(sessionId);
    if (entry) {
      logger.debug('Thread cache hit (memory)', { sessionId });
      return entry.thread;
    }

    // Try loading from GCS (handles VM restart scenario)
    const metadata = await this.loadMetadata(sessionId);
    if (metadata) {
      logger.info('Thread cache hit (GCS) - VM restart recovery', {
        sessionId,
        threadId: metadata.threadId,
        age: Date.now() - new Date(metadata.created).getTime()
      });

      // Note: We can't reconstruct the actual thread object from metadata alone
      // The Codex SDK thread object cannot be persisted/deserialized
      // So we return null here, but log that we found the metadata
      // The caller will need to start a new thread but can use the same sessionId
      logger.warn('Thread metadata found but cannot restore thread object (Codex SDK limitation)', {
        sessionId,
        threadId: metadata.threadId
      });
      return null;
    }

    logger.debug('Thread cache miss', { sessionId });
    return null;
  }

  /**
   * Set thread in cache (memory + GCS persistence)
   */
  async set(sessionId: string, thread: any, workspaceId: string): Promise<void> {
    const entry: ThreadCacheEntry = {
      threadId: thread.id || sessionId,
      thread,
      sessionId,
      workspaceId,
      created: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    // Store in memory cache
    this.cache.set(sessionId, entry);
    logger.debug('Thread cached in memory', { sessionId, threadId: entry.threadId });

    // Persist metadata to GCS (async, non-blocking)
    this.persistMetadata(entry).catch(err => {
      logger.warn('Failed to persist thread metadata', { sessionId, error: err });
    });
  }

  /**
   * Check if thread exists in cache
   */
  has(sessionId: string): boolean {
    return this.cache.has(sessionId);
  }

  /**
   * Remove thread from cache
   */
  async delete(sessionId: string): Promise<void> {
    this.cache.delete(sessionId);

    // Also remove from GCS
    try {
      const filePath = join(this.cacheDir, `${sessionId}.json`);
      await unlink(filePath);
      logger.debug('Thread metadata deleted', { sessionId });
    } catch (error) {
      // File might not exist, that's okay
      logger.debug('Thread metadata file not found (already deleted?)', { sessionId });
    }
  }

  /**
   * Clear all threads from cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('Thread cache cleared (memory only, GCS metadata preserved)');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      ttl: this.cache.ttl || 0,
    };
  }

  /**
   * Persist thread metadata to GCS via gcsfuse
   */
  private async persistMetadata(entry: ThreadCacheEntry): Promise<void> {
    try {
      const metadata: ThreadMetadata = {
        threadId: entry.threadId,
        sessionId: entry.sessionId,
        workspaceId: entry.workspaceId,
        created: entry.created,
        lastAccessed: entry.lastAccessed,
      };

      const filePath = join(this.cacheDir, `${entry.sessionId}.json`);
      await writeFile(filePath, JSON.stringify(metadata, null, 2));
      logger.debug('Thread metadata persisted to GCS', { sessionId: entry.sessionId });
    } catch (error) {
      logger.error('Failed to persist thread metadata', {
        sessionId: entry.sessionId,
        error
      });
      throw error;
    }
  }

  /**
   * Load thread metadata from GCS via gcsfuse
   */
  private async loadMetadata(sessionId: string): Promise<ThreadMetadata | null> {
    try {
      const filePath = join(this.cacheDir, `${sessionId}.json`);
      const content = await readFile(filePath, 'utf-8');
      const metadata = JSON.parse(content) as ThreadMetadata;

      // Check if metadata is stale (older than TTL)
      const age = Date.now() - new Date(metadata.created).getTime();
      if (age > TTL_MS) {
        logger.info('Thread metadata expired, deleting', {
          sessionId,
          age: Math.floor(age / 1000 / 60) + ' minutes'
        });
        await this.delete(sessionId);
        return null;
      }

      return metadata;
    } catch {
      return null;
    }
  }

  /**
   * Cleanup stale metadata files from GCS
   * Should be called periodically (e.g., on server startup or via cron)
   */
  async cleanupStaleMetadata(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0;
    let errors = 0;

    try {
      const files = await readdir(this.cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = join(this.cacheDir, file);
          const content = await readFile(filePath, 'utf-8');
          const metadata = JSON.parse(content) as ThreadMetadata;

          const age = Date.now() - new Date(metadata.created).getTime();
          if (age > TTL_MS) {
            await unlink(filePath);
            cleaned++;
            logger.debug('Cleaned stale thread metadata', {
              sessionId: metadata.sessionId,
              age: Math.floor(age / 1000 / 60 / 60) + ' hours'
            });
          }
        } catch (error) {
          errors++;
          logger.warn('Error processing thread metadata file', { file, error });
        }
      }

      logger.info('Thread metadata cleanup completed', { cleaned, errors });
      return { cleaned, errors };
    } catch (error) {
      logger.error('Failed to cleanup thread metadata', error);
      return { cleaned, errors };
    }
  }
}

// Export singleton instance
export const threadCache = new ThreadCache();
