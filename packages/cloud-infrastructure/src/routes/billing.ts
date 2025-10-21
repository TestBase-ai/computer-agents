/**
 * Billing API Routes
 *
 * Endpoints for managing billing, usage, and credits.
 */

import express, { Request, Response } from 'express';
import { getDatabase } from '../db/client.js';
import { logger } from '../logger.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// User Billing Endpoints (require authentication)
// ============================================================================

/**
 * Get billing account information
 *
 * GET /billing/account
 */
router.get('/account', (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeyId = req.apiKeyId;

    if (!apiKeyId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'API key ID not found in request',
      });
      return;
    }

    const db = getDatabase();
    const account = db.billing.getBillingAccount(apiKeyId);

    if (!account) {
      // Create account if it doesn't exist
      const newAccount = db.billing.getOrCreateBillingAccount(apiKeyId);
      res.json(newAccount);
      return;
    }

    res.json(account);
  } catch (error) {
    logger.error('Failed to get billing account', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve billing account',
    });
  }
});

/**
 * Get usage statistics
 *
 * GET /billing/stats?from=<iso-date>&to=<iso-date>
 */
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeyId = req.apiKeyId;

    if (!apiKeyId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'API key ID not found in request',
      });
      return;
    }

    const { from, to } = req.query;

    const db = getDatabase();
    const stats = db.billing.getUsageStats({
      apiKeyId,
      from: from as string | undefined,
      to: to as string | undefined,
    });

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get usage stats', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve usage statistics',
    });
  }
});

/**
 * Get usage records
 *
 * GET /billing/usage?from=<iso-date>&to=<iso-date>&limit=<number>&offset=<number>
 */
router.get('/usage', (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeyId = req.apiKeyId;

    if (!apiKeyId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'API key ID not found in request',
      });
      return;
    }

    const { from, to, limit, offset } = req.query;

    const db = getDatabase();
    const records = db.billing.getUsageRecords({
      apiKeyId,
      from: from as string | undefined,
      to: to as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      count: records.length,
      records,
    });
  } catch (error) {
    logger.error('Failed to get usage records', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve usage records',
    });
  }
});

/**
 * Get usage by workspace
 *
 * GET /billing/workspaces?from=<iso-date>&to=<iso-date>
 */
router.get('/workspaces', (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeyId = req.apiKeyId;

    if (!apiKeyId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'API key ID not found in request',
      });
      return;
    }

    const { from, to } = req.query;

    const db = getDatabase();
    const workspaces = db.billing.getUsageByWorkspace({
      apiKeyId,
      from: from as string | undefined,
      to: to as string | undefined,
    });

    res.json({
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    logger.error('Failed to get workspace usage', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve workspace usage',
    });
  }
});

/**
 * Get transaction history
 *
 * GET /billing/transactions?from=<iso-date>&to=<iso-date>&type=<type>&limit=<number>&offset=<number>
 */
router.get('/transactions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeyId = req.apiKeyId;

    if (!apiKeyId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'API key ID not found in request',
      });
      return;
    }

    const { from, to, type, limit, offset } = req.query;

    const db = getDatabase();
    const transactions = db.billing.getTransactions({
      apiKeyId,
      from: from as string | undefined,
      to: to as string | undefined,
      type: type as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    logger.error('Failed to get transactions', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve transactions',
    });
  }
});

// ============================================================================
// Admin Billing Endpoints (require admin authentication)
// ============================================================================

/**
 * Add credits to an API key's account
 *
 * POST /admin/billing/:apiKeyId/credits
 * Body: { amount: number, description?: string }
 */
router.post('/admin/:apiKeyId/credits', (req: Request, res: Response) => {
  try {
    const { apiKeyId } = req.params;
    const { amount, description } = req.body;

    if (!amount || typeof amount !== 'number') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Amount is required and must be a number',
      });
      return;
    }

    const db = getDatabase();
    const account = db.billing.updateBalance(apiKeyId, amount, description);

    logger.info('Credits added to account', {
      apiKeyId,
      amount,
      newBalance: account.creditsBalance,
    });

    res.json({
      success: true,
      account,
    });
  } catch (error) {
    logger.error('Failed to add credits', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add credits',
    });
  }
});

/**
 * Set spending limits for an API key
 *
 * POST /admin/billing/:apiKeyId/limits
 * Body: { dailyLimit?: number, monthlyLimit?: number }
 */
router.post('/admin/:apiKeyId/limits', (req: Request, res: Response) => {
  try {
    const { apiKeyId } = req.params;
    const { dailyLimit, monthlyLimit } = req.body;

    if (dailyLimit !== undefined && typeof dailyLimit !== 'number') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'dailyLimit must be a number',
      });
      return;
    }

    if (monthlyLimit !== undefined && typeof monthlyLimit !== 'number') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'monthlyLimit must be a number',
      });
      return;
    }

    const db = getDatabase();
    db.billing.setLimits(apiKeyId, { dailyLimit, monthlyLimit });

    const account = db.billing.getBillingAccount(apiKeyId);

    logger.info('Spending limits updated', {
      apiKeyId,
      dailyLimit,
      monthlyLimit,
    });

    res.json({
      success: true,
      account,
    });
  } catch (error) {
    logger.error('Failed to set spending limits', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to set spending limits',
    });
  }
});

/**
 * Get usage stats for any API key (admin only)
 *
 * GET /admin/billing/:apiKeyId/stats?from=<iso-date>&to=<iso-date>
 */
router.get('/admin/:apiKeyId/stats', (req: Request, res: Response) => {
  try {
    const { apiKeyId } = req.params;
    const { from, to } = req.query;

    const db = getDatabase();
    const stats = db.billing.getUsageStats({
      apiKeyId,
      from: from as string | undefined,
      to: to as string | undefined,
    });

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get usage stats (admin)', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve usage statistics',
    });
  }
});

export default router;
