/**
 * Request Validation Middleware
 *
 * Validates incoming requests to prevent:
 * - Path traversal attacks
 * - Malformed data
 * - Invalid workspace/session IDs
 * - Oversized payloads
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validate workspace ID format
 * Must be alphanumeric with hyphens/underscores only
 */
function isValidWorkspaceId(workspaceId: string): boolean {
  if (!workspaceId || typeof workspaceId !== 'string') {
    return false;
  }
  // Must be 1-128 characters, alphanumeric plus - and _
  const pattern = /^[a-zA-Z0-9_-]{1,128}$/;
  return pattern.test(workspaceId);
}

/**
 * Validate session ID format (similar to workspace ID)
 */
function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  // Must be 1-128 characters, alphanumeric plus - and _
  const pattern = /^[a-zA-Z0-9_-]{1,128}$/;
  return pattern.test(sessionId);
}

/**
 * Check for path traversal attempts
 */
function hasPathTraversal(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  // Check for ../ or ..\\ patterns
  return path.includes('../') || path.includes('..\\') || path.includes('..');
}

/**
 * Validate file path (used in workspace operations)
 */
function isValidFilePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  // Must not contain path traversal
  if (hasPathTraversal(path)) {
    return false;
  }
  // Must be reasonable length
  if (path.length > 1024) {
    return false;
  }
  return true;
}

/**
 * Validate MCP server configuration
 */
function isValidMcpServer(server: any): boolean {
  if (!server || typeof server !== 'object') {
    return false;
  }

  // Must have name
  if (!server.name || typeof server.name !== 'string') {
    return false;
  }

  // Check type-specific fields
  if (server.type === 'stdio') {
    return typeof server.command === 'string' && Array.isArray(server.args);
  } else if (server.type === 'http') {
    return typeof server.url === 'string';
  }

  return false;
}

/**
 * Validate task execution request
 */
export function validateExecuteTaskRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: ValidationError[] = [];
  const { task, workspaceId, sessionId, mcpServers } = req.body;

  // Validate task
  if (!task) {
    errors.push({ field: 'task', message: 'Task is required' });
  } else if (typeof task !== 'string') {
    errors.push({ field: 'task', message: 'Task must be a string' });
  } else if (task.trim().length === 0) {
    errors.push({ field: 'task', message: 'Task cannot be empty' });
  } else if (task.length > 100000) {
    errors.push({
      field: 'task',
      message: 'Task exceeds maximum length (100KB)',
      value: `${task.length} bytes`,
    });
  }

  // Validate workspaceId
  if (!workspaceId) {
    errors.push({ field: 'workspaceId', message: 'Workspace ID is required' });
  } else if (!isValidWorkspaceId(workspaceId)) {
    errors.push({
      field: 'workspaceId',
      message:
        'Invalid workspace ID format (must be alphanumeric with - or _, max 128 chars)',
      value: workspaceId,
    });
  }

  // Validate sessionId (optional)
  if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
    if (!isValidSessionId(sessionId)) {
      errors.push({
        field: 'sessionId',
        message:
          'Invalid session ID format (must be alphanumeric with - or _, max 128 chars)',
        value: sessionId,
      });
    }
  }

  // Validate mcpServers (optional)
  if (mcpServers !== undefined && mcpServers !== null) {
    if (!Array.isArray(mcpServers)) {
      errors.push({
        field: 'mcpServers',
        message: 'mcpServers must be an array',
        value: typeof mcpServers,
      });
    } else {
      mcpServers.forEach((server, index) => {
        if (!isValidMcpServer(server)) {
          errors.push({
            field: `mcpServers[${index}]`,
            message: 'Invalid MCP server configuration',
            value: server,
          });
        }
      });
    }
  }

  if (errors.length > 0) {
    logger.warn('Request validation failed', { errors, endpoint: '/execute' });
    res.status(400).json({
      error: 'Validation failed',
      errors,
    });
    return;
  }

  next();
}

/**
 * Validate workspace ID parameter
 */
export function validateWorkspaceIdParam(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { workspaceId } = req.params;

  if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
    logger.warn('Invalid workspace ID parameter', { workspaceId });
    res.status(400).json({
      error: 'Invalid workspace ID',
      message:
        'Workspace ID must be alphanumeric with - or _, max 128 characters',
    });
    return;
  }

  next();
}

/**
 * Validate file path in workspace operations
 */
export function validateFilePath(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Path can come from query params or route params
  const filePath = req.query.path as string || (req.params as any)[0];

  if (!filePath) {
    logger.warn('Missing file path in request');
    res.status(400).json({
      error: 'Missing file path',
      message: 'File path is required',
    });
    return;
  }

  if (!isValidFilePath(filePath)) {
    logger.warn('Invalid or unsafe file path', { filePath });
    res.status(400).json({
      error: 'Invalid file path',
      message:
        'File path contains invalid characters or path traversal attempts',
    });
    return;
  }

  next();
}

/**
 * Validate session ID parameter
 */
export function validateSessionIdParam(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { sessionId } = req.params;

  if (!sessionId || !isValidSessionId(sessionId)) {
    logger.warn('Invalid session ID parameter', { sessionId });
    res.status(400).json({
      error: 'Invalid session ID',
      message: 'Session ID must be alphanumeric with - or _, max 128 characters',
    });
    return;
  }

  next();
}

/**
 * Validate file upload request
 */
export function validateFileUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: ValidationError[] = [];

  if (!req.file) {
    errors.push({ field: 'file', message: 'No file uploaded' });
  }

  const targetPath = req.body.path;
  if (!targetPath) {
    errors.push({ field: 'path', message: 'Target path is required' });
  } else if (!isValidFilePath(targetPath)) {
    errors.push({
      field: 'path',
      message: 'Invalid target path or path traversal attempt',
      value: targetPath,
    });
  }

  if (errors.length > 0) {
    logger.warn('File upload validation failed', { errors });
    res.status(400).json({
      error: 'Validation failed',
      errors,
    });
    return;
  }

  next();
}
