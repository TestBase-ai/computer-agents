/**
 * Testbase Cloud Infrastructure - GCE Server
 *
 * Simple Express server that executes Codex SDK tasks with GCS workspace sync.
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { readdir, readFile, writeFile, unlink, mkdir, stat, access } from 'fs/promises';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { executeTask, clearThreadCache, cleanupStaleThreads, getThreadCacheStats } from './executor.js';
import { logger } from './logger.js';
import { metrics } from './metrics.js';
import { authMiddleware } from './middleware/auth.js';
import { auditLogMiddleware } from './middleware/auditLog.js';
import { budgetCheckMiddleware } from './middleware/budgetCheck.js';
import {
  validateExecuteTaskRequest,
  validateWorkspaceIdParam,
  validateFilePath,
  validateSessionIdParam,
  validateFileUpload,
} from './middleware/validation.js';
import adminRoutes from './routes/admin.js';
import billingRoutes from './routes/billing.js';

const execAsync = promisify(exec);

const app = express();

// ============================================================================
// Middleware Configuration
// ============================================================================

// CORS - Allow requests from any origin (configure as needed)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Audit logging (log all requests)
app.use(auditLogMiddleware);

// Rate limiting - Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Strict rate limit for expensive operations (execute)
const executeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit to 30 executions per 15 minutes
  message: {
    error: 'Too many execution requests',
    message: 'Execution rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API key authentication (applies to all routes except public endpoints)
app.use(authMiddleware);

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Constants (hardcoded as requested)
const GCP_PROJECT = 'firechatbot-a9654';
const PORT = process.env.PORT || 8080;
const WORKSPACES_MOUNT = '/mnt/workspaces';

// ============================================================================
// Startup Verifications
// ============================================================================

/**
 * Verify gcsfuse mount is accessible
 */
async function verifyGcsfuseMount(): Promise<void> {
  try {
    await access(WORKSPACES_MOUNT);
    await mkdir(WORKSPACES_MOUNT, { recursive: true }); // Ensure it's writable
    logger.info('gcsfuse mount verified', { path: WORKSPACES_MOUNT });
  } catch (error) {
    logger.error('FATAL: gcsfuse mount not accessible', {
      path: WORKSPACES_MOUNT,
      error,
    });
    throw new Error(
      `gcsfuse mount not accessible at ${WORKSPACES_MOUNT}. ` +
      `Ensure gcsfuse is mounted with: sudo gcsfuse --implicit-dirs -o allow_other --uid $(id -u testbase) --gid $(id -g testbase) testbase-workspaces ${WORKSPACES_MOUNT}`
    );
  }
}

/**
 * Verify OpenAI API key is configured
 */
function verifyOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    logger.error('FATAL: OPENAI_API_KEY not set');
    throw new Error(
      'OPENAI_API_KEY environment variable is required. ' +
      'Set it in /opt/testbase-cloud/.env'
    );
  }
  logger.info('OpenAI API key configured');
}

// ============================================================================
// Admin Routes (API Key Management)
// ============================================================================

// Mount admin routes at /admin
app.use('/admin', adminRoutes);

// ============================================================================
// Billing Routes
// ============================================================================

// Mount billing routes at /billing
app.use('/billing', billingRoutes);

// ============================================================================
// Health & Monitoring Endpoints
// ============================================================================

/**
 * Enhanced health check with detailed diagnostics
 */
app.get('/health', async (req, res) => {
  const checks: any = {
    status: 'healthy',
    project: GCP_PROJECT,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks: {},
  };

  // Check gcsfuse mount
  try {
    await access(WORKSPACES_MOUNT);
    checks.checks.gcsfuseMount = { status: 'ok', path: WORKSPACES_MOUNT };
  } catch (error) {
    checks.checks.gcsfuseMount = { status: 'error', message: 'Mount not accessible' };
    checks.status = 'unhealthy';
  }

  // Check OpenAI API key
  checks.checks.openaiApiKey = process.env.OPENAI_API_KEY
    ? { status: 'ok' }
    : { status: 'error', message: 'API key not configured' };

  // Check system resources
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = (usedMem / totalMem) * 100;

  checks.checks.memory = {
    status: memUsagePercent > 90 ? 'warning' : 'ok',
    total: `${Math.round(totalMem / 1024 / 1024)} MB`,
    used: `${Math.round(usedMem / 1024 / 1024)} MB`,
    free: `${Math.round(freeMem / 1024 / 1024)} MB`,
    usagePercent: Math.round(memUsagePercent),
  };

  // Check disk space (for gcsfuse mount)
  try {
    const { stdout } = await execAsync(`df -h ${WORKSPACES_MOUNT} | tail -1 | awk '{print $5}'`);
    const diskUsagePercent = parseInt(stdout.trim().replace('%', ''));
    checks.checks.disk = {
      status: diskUsagePercent > 90 ? 'warning' : 'ok',
      usagePercent: diskUsagePercent,
      mount: WORKSPACES_MOUNT,
    };
  } catch (error) {
    checks.checks.disk = { status: 'error', message: 'Could not check disk usage' };
  }

  // Add metrics summary
  const metricsSummary = metrics.getSummary();
  checks.metrics = {
    activeSessions: metricsSummary.activeSessions,
    recentErrors: metricsSummary.recentErrors.length,
    successRate: `${metricsSummary.successRate}%`,
  };

  // Add thread cache stats
  const cacheStats = getThreadCacheStats();
  checks.threadCache = {
    size: cacheStats.size,
    maxSize: cacheStats.maxSize,
    ttlHours: Math.round(cacheStats.ttl / 1000 / 60 / 60),
  };

  res.status(checks.status === 'healthy' ? 200 : 503).json(checks);
});

/**
 * Metrics endpoint - detailed execution metrics
 */
app.get('/metrics', (req, res) => {
  const summary = metrics.getSummary();
  res.json(summary);
});

/**
 * Execution history endpoint
 */
app.get('/metrics/history', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const history = metrics.getExecutionHistory(limit);
  res.json({ count: history.length, history });
});

// Execute task endpoint (with stricter rate limit, budget check, and validation)
app.post('/execute', executeLimiter, budgetCheckMiddleware, validateExecuteTaskRequest, async (req, res) => {
  const { task, workspaceId, sessionId, mcpServers } = req.body;

  logger.info('Received task execution request', {
    workspaceId,
    sessionId,
    taskLength: task.length,
    hasMcpServers: !!mcpServers,
    apiKeyId: (req as any).apiKeyId,
  });

  try {
    const result = await executeTask({
      task,
      workspaceId,
      sessionId,
      mcpServers,
      apiKeyId: (req as any).apiKeyId,
    });

    logger.info('Task execution completed successfully', {
      workspaceId,
      sessionId: result.sessionId,
      outputLength: result.output.length,
      usage: result.usage,
    });

    res.json(result);
  } catch (error) {
    logger.error('Task execution failed', error);

    res.status(500).json({
      error: 'Task execution failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Clear cache endpoint (for memory management)
app.post('/cache/clear', (req, res) => {
  clearThreadCache();
  res.json({ success: true, message: 'Thread cache cleared' });
});

// ============================================================================
// File Management Endpoints
// ============================================================================

// List files in workspace
app.get('/workspace/:workspaceId/files', validateWorkspaceIdParam, async (req, res) => {
  const { workspaceId } = req.params;
  const { path: relativePath = '' } = req.query;

  try {
    const workspacePath = join(WORKSPACES_MOUNT, workspaceId, relativePath as string);
    const files = await readdir(workspacePath, { withFileTypes: true });

    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = join(workspacePath, file.name);
        const stats = await stat(filePath);
        return {
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
    );

    logger.info('Listed workspace files', { workspaceId, path: relativePath, count: fileList.length });
    res.json({ workspaceId, path: relativePath, files: fileList });
  } catch (error) {
    logger.error('Failed to list workspace files', { workspaceId, error });
    res.status(500).json({
      error: 'Failed to list files',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Upload file to workspace
app.post('/workspace/:workspaceId/upload', validateWorkspaceIdParam, upload.single('file'), validateFileUpload, async (req, res) => {
  const { workspaceId } = req.params;
  const { path: relativePath = '' } = req.body;
  // File is guaranteed to exist after validateFileUpload middleware
  const file = req.file!;

  try {
    const targetPath = join(WORKSPACES_MOUNT, workspaceId, relativePath, file.originalname);

    // Ensure directory exists
    await mkdir(dirname(targetPath), { recursive: true });

    // Write file
    await writeFile(targetPath, file.buffer);

    logger.info('File uploaded to workspace', {
      workspaceId,
      filename: file.originalname,
      size: file.size,
      path: relativePath,
    });

    res.json({
      success: true,
      workspaceId,
      filename: file.originalname,
      path: join(relativePath, file.originalname),
      size: file.size,
    });
  } catch (error) {
    logger.error('Failed to upload file', { workspaceId, error });
    res.status(500).json({
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Download file from workspace
app.get('/workspace/:workspaceId/download/*', validateWorkspaceIdParam, validateFilePath, async (req, res) => {
  const { workspaceId } = req.params;
  const filePath = (req.params as any)[0]; // Everything after /download/

  try {
    const fullPath = join(WORKSPACES_MOUNT, workspaceId, filePath);
    const content = await readFile(fullPath);
    const stats = await stat(fullPath);

    logger.info('File downloaded from workspace', {
      workspaceId,
      filePath,
      size: stats.size,
    });

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);
    res.send(content);
  } catch (error) {
    logger.error('Failed to download file', { workspaceId, filePath, error });
    res.status(404).json({
      error: 'File not found',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Delete file from workspace
app.delete('/workspace/:workspaceId/files/*', validateWorkspaceIdParam, validateFilePath, async (req, res) => {
  const { workspaceId } = req.params;
  const filePath = (req.params as any)[0];

  try {
    const fullPath = join(WORKSPACES_MOUNT, workspaceId, filePath);
    await unlink(fullPath);

    logger.info('File deleted from workspace', { workspaceId, filePath });
    res.json({ success: true, workspaceId, filePath });
  } catch (error) {
    logger.error('Failed to delete file', { workspaceId, filePath, error });
    res.status(500).json({
      error: 'Failed to delete file',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// Session Management Endpoints
// ============================================================================

const SESSIONS_DIR = '/mnt/workspaces/.sessions';

/**
 * List all sessions
 */
app.get('/sessions', async (req, res) => {
  try {
    const files = await readdir(SESSIONS_DIR);
    const sessionFiles = files.filter((f) => f.endsWith('.json'));

    const sessions = await Promise.all(
      sessionFiles.map(async (file) => {
        try {
          const content = await readFile(join(SESSIONS_DIR, file), 'utf-8');
          return JSON.parse(content);
        } catch {
          return null;
        }
      })
    );

    const validSessions = sessions.filter((s) => s !== null);

    logger.info('Listed sessions', { count: validSessions.length });
    res.json({ count: validSessions.length, sessions: validSessions });
  } catch (error) {
    logger.error('Failed to list sessions', error);
    res.status(500).json({
      error: 'Failed to list sessions',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Get session by ID
 */
app.get('/sessions/:sessionId', validateSessionIdParam, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
    const content = await readFile(filePath, 'utf-8');
    const session = JSON.parse(content);

    logger.info('Retrieved session', { sessionId });
    res.json(session);
  } catch (error) {
    logger.error('Session not found', { sessionId, error });
    res.status(404).json({
      error: 'Session not found',
      sessionId,
    });
  }
});

/**
 * Delete session by ID
 */
app.delete('/sessions/:sessionId', validateSessionIdParam, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
    await unlink(filePath);

    logger.info('Deleted session', { sessionId });
    res.json({ success: true, sessionId });
  } catch (error) {
    logger.error('Failed to delete session', { sessionId, error });
    res.status(500).json({
      error: 'Failed to delete session',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Get active sessions (from memory)
 */
app.get('/sessions/active/list', (req, res) => {
  const activeSessions = metrics.getActiveSessions();
  res.json({ count: activeSessions.length, sessions: activeSessions });
});

// ============================================================================
// Workspace Management Endpoints
// ============================================================================

/**
 * List all workspaces
 */
app.get('/workspaces', async (req, res) => {
  try {
    const files = await readdir(WORKSPACES_MOUNT);
    const workspaces = await Promise.all(
      files.map(async (name) => {
        try {
          const path = join(WORKSPACES_MOUNT, name);
          const stats = await stat(path);

          if (!stats.isDirectory() || name.startsWith('.')) {
            return null;
          }

          // Get workspace size (file count)
          const workspaceFiles = await readdir(path);
          const fileCount = workspaceFiles.filter((f) => !f.startsWith('.')).length;

          return {
            id: name,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            fileCount,
          };
        } catch {
          return null;
        }
      })
    );

    const validWorkspaces = workspaces.filter((w) => w !== null);

    logger.info('Listed workspaces', { count: validWorkspaces.length });
    res.json({ count: validWorkspaces.length, workspaces: validWorkspaces });
  } catch (error) {
    logger.error('Failed to list workspaces', error);
    res.status(500).json({
      error: 'Failed to list workspaces',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Delete workspace by ID
 */
app.delete('/workspaces/:workspaceId', validateWorkspaceIdParam, async (req, res) => {
  const { workspaceId } = req.params;

  try {
    const workspacePath = join(WORKSPACES_MOUNT, workspaceId);

    // Use rm -rf to delete recursively
    await execAsync(`rm -rf "${workspacePath}"`);

    logger.info('Deleted workspace', { workspaceId });
    res.json({ success: true, workspaceId });
  } catch (error) {
    logger.error('Failed to delete workspace', { workspaceId, error });
    res.status(500).json({
      error: 'Failed to delete workspace',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Cleanup old sessions (older than specified days)
 */
app.post('/cleanup/sessions', async (req, res) => {
  const { olderThanDays = 7 } = req.body;
  const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  try {
    const files = await readdir(SESSIONS_DIR);
    const sessionFiles = files.filter((f) => f.endsWith('.json'));

    let deletedCount = 0;
    for (const file of sessionFiles) {
      try {
        const filePath = join(SESSIONS_DIR, file);
        const content = await readFile(filePath, 'utf-8');
        const session = JSON.parse(content);

        const lastActivity = new Date(session.lastActivity).getTime();
        if (lastActivity < cutoffDate) {
          await unlink(filePath);
          deletedCount++;
        }
      } catch {
        // Skip invalid session files
      }
    }

    logger.info('Cleaned up old sessions', { deletedCount, olderThanDays });
    res.json({ success: true, deletedCount, olderThanDays });
  } catch (error) {
    logger.error('Failed to cleanup sessions', error);
    res.status(500).json({
      error: 'Failed to cleanup sessions',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Cleanup old workspaces (older than specified days)
 */
app.post('/cleanup/workspaces', async (req, res) => {
  const { olderThanDays = 7 } = req.body;
  const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  try {
    const files = await readdir(WORKSPACES_MOUNT);

    let deletedCount = 0;
    for (const name of files) {
      if (name.startsWith('.')) continue;

      try {
        const path = join(WORKSPACES_MOUNT, name);
        const stats = await stat(path);

        if (stats.isDirectory() && stats.mtime.getTime() < cutoffDate) {
          await execAsync(`rm -rf "${path}"`);
          deletedCount++;
        }
      } catch {
        // Skip errors on individual workspaces
      }
    }

    logger.info('Cleaned up old workspaces', { deletedCount, olderThanDays });
    res.json({ success: true, deletedCount, olderThanDays });
  } catch (error) {
    logger.error('Failed to cleanup workspaces', error);
    res.status(500).json({
      error: 'Failed to cleanup workspaces',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// Server Startup
// ============================================================================

async function startServer() {
  try {
    // Run startup verifications
    logger.info('Running startup verifications...');
    verifyOpenAIKey();
    await verifyGcsfuseMount();
    logger.info('All startup verifications passed ✓');

    // Cleanup stale thread cache entries
    logger.info('Cleaning up stale thread cache entries...');
    await cleanupStaleThreads();

    // Start server
    app.listen(PORT, () => {
      logger.info('Testbase Cloud GCE Server started', {
        port: PORT,
        project: GCP_PROJECT,
        nodeVersion: process.version,
        env: process.env.NODE_ENV || 'development',
      });
    });
  } catch (error) {
    logger.error('Server startup failed', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
