/**
 * Budget & Billing Resource Manager
 *
 * Handles budget management, billing records, and usage tracking.
 *
 * Note: projectId is now embedded in the API key, so routes use
 * simplified paths without /projects/:projectId prefix.
 */

import type { ApiClient } from '../ApiClient';
import type {
  BudgetStatus,
  CanExecuteResult,
  IncreaseBudgetParams,
  IncreaseBudgetResult,
  BillingRecord,
  ListBillingRecordsParams,
  BillingAccount,
  UsageStats,
  UsageStatsParams,
} from '../types';

export class BudgetResource {
  constructor(private readonly client: ApiClient) {}

  // =========================================================================
  // Budget Operations
  // =========================================================================

  /**
   * Get budget status via costs summary
   *
   * Project is determined automatically from the API key.
   */
  async getStatus(): Promise<BudgetStatus> {
    // Use costs/summary endpoint since /budget doesn't exist
    const response = await this.client.get<{
      period: string;
      totals: {
        totalCost: number;
        agentCost: number;
        environmentCost: number;
        totalThreads: number;
      };
    }>(`/costs/summary`);

    // Map to BudgetStatus format
    return {
      balance: 0, // Not available from this endpoint
      spent: response.totals.totalCost,
      limit: 0, // Not available
      remaining: 0, // Not available
    };
  }

  /**
   * Check if execution is allowed given current budget
   *
   * Note: This is a convenience method that always returns true
   * since the backend handles budget checks during execution.
   */
  async canExecute(estimatedCost?: number): Promise<CanExecuteResult> {
    // Budget checks are handled server-side during execution
    return {
      canExecute: true,
      reason: 'Budget checks performed during execution',
    };
  }

  /**
   * Increase budget
   *
   * Project is determined automatically from the API key.
   */
  async increase(
    params: IncreaseBudgetParams
  ): Promise<IncreaseBudgetResult> {
    const response = await this.client.post<IncreaseBudgetResult>(
      `/budget/increase`,
      params
    );
    return response;
  }

  // =========================================================================
  // Billing Records
  // =========================================================================

  /**
   * Get billing records
   *
   * Project is determined automatically from the API key.
   */
  async getRecords(
    params: ListBillingRecordsParams = {}
  ): Promise<{
    records: BillingRecord[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    const response = await this.client.get<{
      data: BillingRecord[];
      object: string;
      has_more: boolean;
      total_count: number;
    }>(`/billing/records`, {
      limit: params.limit,
      offset: params.offset,
      since: params.since,
      until: params.until,
      type: params.type,
    });
    return {
      records: response.data,
      pagination: {
        total: response.total_count,
        limit: params.limit || 50,
        offset: params.offset || 0,
      },
    };
  }

  /**
   * Get billing summary
   *
   * Project is determined automatically from the API key.
   */
  async getSummary(): Promise<{
    totalSpent: number;
    periodStart: string;
    periodEnd: string;
    runCount: number;
    tokenCount: number;
  }> {
    const response = await this.client.get<{
      totalSpent: number;
      periodStart: string;
      periodEnd: string;
      runCount: number;
      tokenCount: number;
    }>(`/billing/summary`);
    return response;
  }

  /**
   * Get daily spending breakdown
   *
   * Project is determined automatically from the API key.
   */
  async getDailySpending(): Promise<{
    days: Array<{
      date: string;
      cost: number;
      runs: number;
      tokens: number;
    }>;
  }> {
    const response = await this.client.get<{
      days: Array<{
        date: string;
        cost: number;
        runs: number;
        tokens: number;
      }>;
    }>(`/billing/daily`);
    return response;
  }

  /**
   * Record MCP server usage
   *
   * Project is determined automatically from the API key.
   */
  async recordMcpUsage(
    params: {
      serverType: 'deep_research' | 'nano_banana';
      referenceId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.client.post(`/billing/mcp-usage`, params);
  }

  // =========================================================================
  // Payment Integration
  // =========================================================================

  /**
   * Get available top-up options
   *
   * Project is determined automatically from the API key.
   */
  async getTopUpOptions(): Promise<{
    options: Array<{
      amount: number;
      variantId: string;
      label: string;
    }>;
  }> {
    const response = await this.client.get<{
      options: Array<{
        amount: number;
        variantId: string;
        label: string;
      }>;
    }>(`/budget/topup-options`);
    return response;
  }

  /**
   * Create a checkout session for adding funds
   *
   * Project is determined automatically from the API key.
   */
  async createCheckout(
    params: {
      variantId: string;
      userEmail?: string;
      userName?: string;
      redirectUrl?: string;
    }
  ): Promise<{ checkoutUrl: string }> {
    const response = await this.client.post<{ checkoutUrl: string }>(
      `/budget/checkout`,
      params
    );
    return response;
  }

  /**
   * Get payment integration status
   *
   * Project is determined automatically from the API key.
   */
  async getPaymentStatus(): Promise<{
    configured: boolean;
    provider?: string;
    pendingPayments: number;
  }> {
    const response = await this.client.get<{
      configured: boolean;
      provider?: string;
      pendingPayments: number;
    }>(`/budget/payment-status`);
    return response;
  }
}

export class BillingResource {
  constructor(private readonly client: ApiClient) {}

  /**
   * Get billing account information
   */
  async getAccount(): Promise<BillingAccount> {
    const response = await this.client.get<{ account: BillingAccount }>(
      '/billing/account'
    );
    return response.account;
  }

  /**
   * Get usage statistics
   */
  async getStats(params: UsageStatsParams = {}): Promise<UsageStats> {
    const response = await this.client.get<{ stats: UsageStats }>(
      '/billing/stats',
      {
        period: params.period,
        breakdown: params.breakdown,
      }
    );
    return response.stats;
  }

  /**
   * Get workspace usage breakdown
   */
  async getWorkspaceUsage(): Promise<{
    workspaces: Array<{
      projectId: string;
      projectName: string;
      storageBytes: number;
      fileCount: number;
      lastAccessed: string;
    }>;
    total: {
      storageBytes: number;
      projectCount: number;
    };
  }> {
    const response = await this.client.get<{
      workspaces: Array<{
        projectId: string;
        projectName: string;
        storageBytes: number;
        fileCount: number;
        lastAccessed: string;
      }>;
      total: {
        storageBytes: number;
        projectCount: number;
      };
    }>('/billing/usage/workspace');
    return response;
  }

  /**
   * Get transaction history
   */
  async getTransactions(params?: {
    from?: string;
    to?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      description?: string;
      createdAt: string;
    }>;
    pagination: { total: number; limit: number; offset: number };
  }> {
    const response = await this.client.get<{
      transactions: Array<{
        id: string;
        type: string;
        amount: number;
        description?: string;
        createdAt: string;
      }>;
      pagination: { total: number; limit: number; offset: number };
    }>('/billing/transactions', params);
    return response;
  }
}
