/**
 * Billing Database Client
 *
 * Handles all billing-related database operations.
 */

import { randomUUID } from 'crypto';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import {
  UsageRecord,
  BillingAccount,
  Transaction,
  PricingConfig,
  DEFAULT_PRICING,
} from './billing-schema.js';
import { logger } from '../logger.js';

export class BillingClient {
  constructor(private db: SQLiteDatabase) {}

  // ============================================================================
  // Usage Records
  // ============================================================================

  /**
   * Record usage for an API key
   */
  recordUsage(usage: Omit<UsageRecord, 'id'>): UsageRecord {
    const id = randomUUID();

    const record: UsageRecord = {
      id,
      ...usage,
    };

    const stmt = this.db.prepare(`
      INSERT INTO usage_records (
        id, api_key_id, session_id, workspace_id, timestamp,
        input_tokens, output_tokens, total_tokens,
        input_cost, output_cost, total_cost,
        model, duration, status, endpoint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.apiKeyId,
      record.sessionId || null,
      record.workspaceId,
      record.timestamp,
      record.inputTokens,
      record.outputTokens,
      record.totalTokens,
      record.inputCost,
      record.outputCost,
      record.totalCost,
      record.model,
      record.duration || null,
      record.status,
      record.endpoint
    );

    logger.info('Usage recorded', {
      id: record.id,
      apiKeyId: record.apiKeyId,
      totalCost: record.totalCost,
      totalTokens: record.totalTokens,
    });

    return record;
  }

  /**
   * Get usage records for an API key within a date range
   */
  getUsageRecords(params: {
    apiKeyId: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): UsageRecord[] {
    const { apiKeyId, from, to, limit = 100, offset = 0 } = params;

    let whereClause = 'WHERE api_key_id = ?';
    const queryParams: any[] = [apiKeyId];

    if (from) {
      whereClause += ' AND timestamp >= ?';
      queryParams.push(from);
    }

    if (to) {
      whereClause += ' AND timestamp <= ?';
      queryParams.push(to);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM usage_records
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    queryParams.push(limit, offset);

    const rows = stmt.all(...queryParams) as any[];
    return rows.map((row) => this.rowToUsageRecord(row));
  }

  /**
   * Get usage statistics for an API key
   */
  getUsageStats(params: {
    apiKeyId: string;
    from?: string;
    to?: string;
  }): {
    totalRequests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    inputCost: number;
    outputCost: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  } {
    const { apiKeyId, from, to } = params;

    let whereClause = 'WHERE api_key_id = ?';
    const queryParams: any[] = [apiKeyId];

    if (from) {
      whereClause += ' AND timestamp >= ?';
      queryParams.push(from);
    }

    if (to) {
      whereClause += ' AND timestamp <= ?';
      queryParams.push(to);
    }

    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(total_cost) as total_cost,
        SUM(input_cost) as input_cost,
        SUM(output_cost) as output_cost,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_requests
      FROM usage_records
      ${whereClause}
    `);

    const row = stmt.get(...queryParams) as any;

    const totalRequests = row.total_requests || 0;
    const successfulRequests = row.successful_requests || 0;

    return {
      totalRequests,
      totalTokens: row.total_tokens || 0,
      inputTokens: row.input_tokens || 0,
      outputTokens: row.output_tokens || 0,
      totalCost: row.total_cost || 0,
      inputCost: row.input_cost || 0,
      outputCost: row.output_cost || 0,
      successfulRequests,
      failedRequests: row.failed_requests || 0,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
    };
  }

  /**
   * Get usage grouped by workspace
   */
  getUsageByWorkspace(params: {
    apiKeyId: string;
    from?: string;
    to?: string;
  }): Array<{
    workspaceId: string;
    totalCost: number;
    totalTokens: number;
    requestCount: number;
  }> {
    const { apiKeyId, from, to } = params;

    let whereClause = 'WHERE api_key_id = ?';
    const queryParams: any[] = [apiKeyId];

    if (from) {
      whereClause += ' AND timestamp >= ?';
      queryParams.push(from);
    }

    if (to) {
      whereClause += ' AND timestamp <= ?';
      queryParams.push(to);
    }

    const stmt = this.db.prepare(`
      SELECT
        workspace_id,
        SUM(total_cost) as total_cost,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as request_count
      FROM usage_records
      ${whereClause}
      GROUP BY workspace_id
      ORDER BY total_cost DESC
    `);

    const rows = stmt.all(...queryParams) as any[];

    return rows.map((row) => ({
      workspaceId: row.workspace_id,
      totalCost: row.total_cost || 0,
      totalTokens: row.total_tokens || 0,
      requestCount: row.request_count || 0,
    }));
  }

  // ============================================================================
  // Billing Accounts
  // ============================================================================

  /**
   * Create or get billing account for an API key
   */
  getOrCreateBillingAccount(apiKeyId: string): BillingAccount {
    // Try to get existing
    const existing = this.getBillingAccount(apiKeyId);
    if (existing) {
      return existing;
    }

    // Create new
    const id = randomUUID();
    const now = new Date().toISOString();

    const account: BillingAccount = {
      id,
      apiKeyId,
      creditsBalance: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO billing_accounts (
        id, api_key_id, credits_balance, total_spent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      account.id,
      account.apiKeyId,
      account.creditsBalance,
      account.totalSpent,
      account.createdAt,
      account.updatedAt
    );

    logger.info('Billing account created', { id: account.id, apiKeyId });

    return account;
  }

  /**
   * Get billing account by API key ID
   */
  getBillingAccount(apiKeyId: string): BillingAccount | null {
    const stmt = this.db.prepare(`
      SELECT * FROM billing_accounts WHERE api_key_id = ?
    `);

    const row = stmt.get(apiKeyId) as any;

    if (!row) {
      return null;
    }

    return this.rowToBillingAccount(row);
  }

  /**
   * Update billing account balance
   */
  updateBalance(apiKeyId: string, amount: number, description?: string): BillingAccount {
    const account = this.getOrCreateBillingAccount(apiKeyId);

    const newBalance = account.creditsBalance + amount;

    // Update account
    const stmt = this.db.prepare(`
      UPDATE billing_accounts
      SET credits_balance = ?, updated_at = ?
      WHERE api_key_id = ?
    `);

    stmt.run(newBalance, new Date().toISOString(), apiKeyId);

    // Record transaction
    this.recordTransaction({
      apiKeyId,
      type: amount > 0 ? 'credit_adjustment' : 'usage_deduction',
      amount,
      balanceAfter: newBalance,
      description,
    });

    logger.info('Balance updated', {
      apiKeyId,
      amount,
      newBalance,
      description,
    });

    // Return updated account
    return this.getBillingAccount(apiKeyId)!;
  }

  /**
   * Deduct usage cost from balance
   */
  deductUsage(apiKeyId: string, cost: number, description?: string): BillingAccount {
    const account = this.getOrCreateBillingAccount(apiKeyId);

    const newBalance = account.creditsBalance - cost;
    const newTotalSpent = account.totalSpent + cost;

    // Update account
    const stmt = this.db.prepare(`
      UPDATE billing_accounts
      SET credits_balance = ?, total_spent = ?, updated_at = ?
      WHERE api_key_id = ?
    `);

    stmt.run(newBalance, newTotalSpent, new Date().toISOString(), apiKeyId);

    // Record transaction
    this.recordTransaction({
      apiKeyId,
      type: 'usage_deduction',
      amount: -cost,
      balanceAfter: newBalance,
      description,
    });

    return this.getBillingAccount(apiKeyId)!;
  }

  /**
   * Set spending limits
   */
  setLimits(apiKeyId: string, limits: { dailyLimit?: number; monthlyLimit?: number }): void {
    const account = this.getOrCreateBillingAccount(apiKeyId);

    const stmt = this.db.prepare(`
      UPDATE billing_accounts
      SET daily_limit = ?, monthly_limit = ?, updated_at = ?
      WHERE api_key_id = ?
    `);

    stmt.run(
      limits.dailyLimit ?? null,
      limits.monthlyLimit ?? null,
      new Date().toISOString(),
      apiKeyId
    );

    logger.info('Spending limits updated', { apiKeyId, ...limits });
  }

  /**
   * Check if spending limit is exceeded
   */
  checkLimits(apiKeyId: string): {
    withinLimits: boolean;
    dailyUsage?: number;
    monthlyUsage?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    reason?: string;
  } {
    const account = this.getBillingAccount(apiKeyId);

    if (!account) {
      return { withinLimits: true };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get today's usage
    const dailyStats = this.getUsageStats({
      apiKeyId,
      from: `${today}T00:00:00.000Z`,
      to: `${today}T23:59:59.999Z`,
    });

    // Get this month's usage
    const monthlyStats = this.getUsageStats({
      apiKeyId,
      from: `${thisMonth}-01T00:00:00.000Z`,
    });

    const result: any = {
      withinLimits: true,
      dailyUsage: dailyStats.totalCost,
      monthlyUsage: monthlyStats.totalCost,
      dailyLimit: account.dailyLimit,
      monthlyLimit: account.monthlyLimit,
    };

    // Check daily limit
    if (account.dailyLimit && dailyStats.totalCost >= account.dailyLimit) {
      result.withinLimits = false;
      result.reason = `Daily spending limit exceeded ($${account.dailyLimit})`;
      return result;
    }

    // Check monthly limit
    if (account.monthlyLimit && monthlyStats.totalCost >= account.monthlyLimit) {
      result.withinLimits = false;
      result.reason = `Monthly spending limit exceeded ($${account.monthlyLimit})`;
      return result;
    }

    return result;
  }

  // ============================================================================
  // Transactions
  // ============================================================================

  /**
   * Record a transaction
   */
  recordTransaction(params: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    const transaction: Transaction = {
      id,
      timestamp,
      ...params,
    };

    const stmt = this.db.prepare(`
      INSERT INTO transactions (
        id, api_key_id, type, amount, balance_after, description, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      transaction.id,
      transaction.apiKeyId,
      transaction.type,
      transaction.amount,
      transaction.balanceAfter,
      transaction.description || null,
      transaction.metadata ? JSON.stringify(transaction.metadata) : null,
      transaction.timestamp
    );

    return transaction;
  }

  /**
   * Get transactions for an API key
   */
  getTransactions(params: {
    apiKeyId: string;
    from?: string;
    to?: string;
    type?: Transaction['type'];
    limit?: number;
    offset?: number;
  }): Transaction[] {
    const { apiKeyId, from, to, type, limit = 100, offset = 0 } = params;

    let whereClause = 'WHERE api_key_id = ?';
    const queryParams: any[] = [apiKeyId];

    if (from) {
      whereClause += ' AND timestamp >= ?';
      queryParams.push(from);
    }

    if (to) {
      whereClause += ' AND timestamp <= ?';
      queryParams.push(to);
    }

    if (type) {
      whereClause += ' AND type = ?';
      queryParams.push(type);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM transactions
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    queryParams.push(limit, offset);

    const rows = stmt.all(...queryParams) as any[];
    return rows.map((row) => this.rowToTransaction(row));
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Calculate cost from token usage
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    pricing: PricingConfig = DEFAULT_PRICING
  ): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    const inputCost = (inputTokens / 1000) * pricing.inputTokenPrice;
    const outputCost = (outputTokens / 1000) * pricing.outputTokenPrice;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Math.round(inputCost * 1000000) / 1000000, // Round to 6 decimals
      outputCost: Math.round(outputCost * 1000000) / 1000000,
      totalCost: Math.round(totalCost * 1000000) / 1000000,
    };
  }

  // ============================================================================
  // Row Converters
  // ============================================================================

  private rowToUsageRecord(row: any): UsageRecord {
    return {
      id: row.id,
      apiKeyId: row.api_key_id,
      sessionId: row.session_id,
      workspaceId: row.workspace_id,
      timestamp: row.timestamp,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      inputCost: row.input_cost,
      outputCost: row.output_cost,
      totalCost: row.total_cost,
      model: row.model,
      duration: row.duration,
      status: row.status,
      endpoint: row.endpoint,
    };
  }

  private rowToBillingAccount(row: any): BillingAccount {
    return {
      id: row.id,
      apiKeyId: row.api_key_id,
      creditsBalance: row.credits_balance,
      totalSpent: row.total_spent,
      dailyLimit: row.daily_limit,
      monthlyLimit: row.monthly_limit,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private rowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      apiKeyId: row.api_key_id,
      type: row.type,
      amount: row.amount,
      balanceAfter: row.balance_after,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.timestamp,
    };
  }
}
