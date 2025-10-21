/**
 * Billing Database Schema
 *
 * Tracks token usage, costs, credits, and transactions.
 */

export interface UsageRecord {
  id: string;
  apiKeyId: string;         // Link to API key
  sessionId?: string;       // Codex thread ID
  workspaceId: string;      // Workspace identifier
  timestamp: string;        // ISO timestamp

  // Token usage
  inputTokens: number;      // Prompt tokens
  outputTokens: number;     // Completion tokens
  totalTokens: number;      // Sum

  // Cost calculation
  inputCost: number;        // $ for input tokens
  outputCost: number;       // $ for output tokens
  totalCost: number;        // Total $ cost

  // Metadata
  model: string;            // e.g., "codex-computer"
  duration: number;         // Execution time (ms)
  status: 'success' | 'error';
  endpoint: string;         // API endpoint called
}

export interface BillingAccount {
  id: string;
  apiKeyId: string;         // Link to API key (1:1)
  creditsBalance: number;   // Current credit balance
  totalSpent: number;       // Lifetime spending
  dailyLimit?: number;      // Max spend per day (optional)
  monthlyLimit?: number;    // Max spend per month (optional)
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  apiKeyId: string;
  type: 'credit_purchase' | 'usage_deduction' | 'credit_adjustment' | 'refund';
  amount: number;           // Positive for credits added, negative for deductions
  balanceAfter: number;     // Balance after transaction
  description?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Pricing configuration
 */
export interface PricingConfig {
  // Per 1K tokens
  inputTokenPrice: number;   // e.g., 0.015 = $0.015 per 1K input tokens
  outputTokenPrice: number;  // e.g., 0.045 = $0.045 per 1K output tokens
}

/**
 * Default pricing (1.5x OpenAI rates as of Oct 2024)
 */
export const DEFAULT_PRICING: PricingConfig = {
  inputTokenPrice: 0.015,   // OpenAI: $0.01, We charge: $0.015 (50% markup)
  outputTokenPrice: 0.045,  // OpenAI: $0.03, We charge: $0.045 (50% markup)
};

/**
 * SQL Schema Definitions
 */

export const CREATE_USAGE_RECORDS_TABLE = `
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  session_id TEXT,
  workspace_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,

  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,

  input_cost REAL NOT NULL,
  output_cost REAL NOT NULL,
  total_cost REAL NOT NULL,

  model TEXT NOT NULL,
  duration INTEGER,
  status TEXT NOT NULL,
  endpoint TEXT NOT NULL,

  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_records_api_key_id ON usage_records(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_timestamp ON usage_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_records_workspace_id ON usage_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_session_id ON usage_records(session_id);
`;

export const CREATE_BILLING_ACCOUNTS_TABLE = `
CREATE TABLE IF NOT EXISTS billing_accounts (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL UNIQUE,
  credits_balance REAL NOT NULL DEFAULT 0,
  total_spent REAL NOT NULL DEFAULT 0,
  daily_limit REAL,
  monthly_limit REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_accounts_api_key_id ON billing_accounts(api_key_id);
`;

export const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  description TEXT,
  metadata TEXT,
  timestamp TEXT NOT NULL,

  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
  CHECK(type IN ('credit_purchase', 'usage_deduction', 'credit_adjustment', 'refund'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_api_key_id ON transactions(api_key_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
`;
