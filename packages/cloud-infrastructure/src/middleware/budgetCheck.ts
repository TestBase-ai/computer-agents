/**
 * Budget Checking Middleware
 *
 * Checks if user has sufficient credits and is within spending limits
 * before allowing expensive operations (like /execute).
 *
 * Only applies to 'standard' keys - 'internal' keys have unlimited usage.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { getDatabase } from '../db/client.js';
import { AuthenticatedRequest } from './auth.js';

/**
 * Budget checking middleware
 *
 * Checks:
 * 1. Daily spending limits
 * 2. Monthly spending limits
 * 3. Credit balance (must be > 0)
 *
 * Skips checks for:
 * - Internal keys (unlimited usage)
 * - Requests without apiKeyId (fallback to env var keys)
 */
export function budgetCheckMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKeyId = req.apiKeyId;

  // Skip if no apiKeyId (fallback to env var keys)
  if (!apiKeyId) {
    logger.debug('Budget check skipped: no apiKeyId (env var key or open mode)');
    return next();
  }

  try {
    const db = getDatabase();
    const apiKey = db.getApiKey(apiKeyId);

    if (!apiKey) {
      // Shouldn't happen (auth middleware should catch this)
      logger.error('Budget check failed: API key not found', { apiKeyId });
      res.status(403).json({
        error: 'Forbidden',
        message: 'API key not found',
      });
      return;
    }

    // Skip budget checks for internal keys
    if (apiKey.keyType === 'internal') {
      logger.debug('Budget check skipped: internal key (unlimited usage)', {
        apiKeyId,
        keyName: apiKey.name,
      });
      return next();
    }

    // Check spending limits (daily/monthly)
    const limitCheck = db.billing.checkLimits(apiKeyId);

    if (!limitCheck.withinLimits) {
      logger.warn('Budget check failed: spending limit exceeded', {
        apiKeyId,
        keyName: apiKey.name,
        reason: limitCheck.reason,
        dailyUsage: limitCheck.dailyUsage,
        dailyLimit: limitCheck.dailyLimit,
        monthlyUsage: limitCheck.monthlyUsage,
        monthlyLimit: limitCheck.monthlyLimit,
      });

      res.status(429).json({
        error: 'Spending Limit Exceeded',
        message: limitCheck.reason,
        details: {
          dailyUsage: limitCheck.dailyUsage,
          dailyLimit: limitCheck.dailyLimit,
          monthlyUsage: limitCheck.monthlyUsage,
          monthlyLimit: limitCheck.monthlyLimit,
        },
      });
      return;
    }

    // Check credit balance
    const account = db.billing.getBillingAccount(apiKeyId);

    if (account && account.creditsBalance <= 0) {
      logger.warn('Budget check failed: insufficient credits', {
        apiKeyId,
        keyName: apiKey.name,
        balance: account.creditsBalance,
      });

      res.status(402).json({
        error: 'Insufficient Credits',
        message: 'Your credit balance is insufficient. Please add credits to continue.',
        details: {
          currentBalance: account.creditsBalance,
          totalSpent: account.totalSpent,
        },
      });
      return;
    }

    // Budget checks passed
    logger.debug('Budget check passed', {
      apiKeyId,
      keyName: apiKey.name,
      balance: account?.creditsBalance,
      dailyUsage: limitCheck.dailyUsage,
      monthlyUsage: limitCheck.monthlyUsage,
    });

    next();
  } catch (error) {
    logger.error('Budget check middleware error', { error, apiKeyId });

    // Don't block execution on middleware errors
    // Log and continue (fail open for availability)
    next();
  }
}
