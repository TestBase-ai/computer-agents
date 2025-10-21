# Testbase Cloud - Billing System

Complete documentation for the pay-per-token billing system.

## Overview

Testbase Cloud uses a **pay-per-token** billing model with automatic usage tracking and credit-based payments.

### Key Features

- 🔒 **Budget Protection** - Automatic blocking when credits run out
- 📊 **Real-time Tracking** - Token usage tracked per execution
- 💳 **Credit System** - Prepaid credits with flexible top-up
- 📈 **Usage Analytics** - Detailed stats by workspace, session, and time period
- 🔑 **Dual Key Types** - Billable standard keys + unlimited internal keys
- ⚠️ **Spending Limits** - Optional daily/monthly caps

## Architecture

### Components

```
┌─────────────────────┐
│   API Request       │
│   (with API key)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Auth Middleware    │◄──── Check API key in database
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Budget Middleware   │◄──── Check balance & limits
└──────────┬──────────┘      (skip for internal keys)
           │
           ▼
┌─────────────────────┐
│   Execute Task      │
│  (Codex SDK)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Track Usage        │◄──── Record tokens & costs
│  Deduct Balance     │      (skip for internal keys)
└─────────────────────┘
```

### Database Schema

**api_keys**
- `id`, `key` (hashed), `key_prefix`, `key_type`, `name`, `description`
- `created_at`, `last_used_at`, `expires_at`, `is_active`
- `permissions`, `metadata`

**billing_accounts**
- `id`, `api_key_id`
- `credits_balance` - Current prepaid credits ($)
- `total_spent` - Lifetime spending
- `daily_limit`, `monthly_limit` - Optional spending caps
- `created_at`, `updated_at`

**usage_records**
- `id`, `api_key_id`, `session_id`, `workspace_id`
- `timestamp`, `input_tokens`, `output_tokens`, `total_tokens`
- `input_cost`, `output_cost`, `total_cost`
- `model`, `duration`, `status`, `endpoint`

**transactions**
- `id`, `api_key_id`, `type`, `amount`
- `balance_after`, `description`, `metadata`, `timestamp`

## Pricing

### Current Rates (1.5x OpenAI)

| Token Type | OpenAI Rate | Testbase Rate | Markup |
|------------|-------------|---------------|--------|
| Input      | $0.010/1K   | $0.015/1K     | 50%    |
| Output     | $0.030/1K   | $0.045/1K     | 50%    |

### Cost Calculation

```typescript
inputCost = (inputTokens / 1000) * 0.015
outputCost = (outputTokens / 1000) * 0.045
totalCost = inputCost + outputCost
```

**Example:**
- Input: 6,548 tokens → $0.09822
- Output: 108 tokens → $0.00486
- **Total: $0.10308**

## API Key Types

### Standard Keys (Billable)

**Purpose:** Normal users with pay-per-token billing

**Features:**
- Usage tracked and charged
- Credit balance required
- Budget protection enabled
- Spending limits enforced

**Creation:**
```bash
POST /admin/keys
{
  "name": "User API Key",
  "keyType": "standard",
  "prefix": "tb_prod_"
}
```

**Workflow:**
1. User executes task
2. System checks balance & limits
3. Task executes if checks pass
4. Usage recorded & balance deducted
5. Response includes billing info

### Internal Keys (Unlimited)

**Purpose:** Internal testing and development

**Features:**
- No billing or usage tracking
- Unlimited usage
- Bypasses all budget checks
- For testing only

**Creation:**
```bash
POST /admin/keys
{
  "name": "Internal Testing Key",
  "keyType": "internal",
  "prefix": "tb_internal_"
}
```

**Workflow:**
1. User executes task
2. Budget checks skipped
3. Task executes
4. Usage calculated but not charged
5. Response includes usage but no billing

## User Billing API

All endpoints require user API key authentication.

### Get Billing Account

```bash
GET /billing/account
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "id": "9fc77e55-...",
  "apiKeyId": "eff7352c-...",
  "creditsBalance": 9.89692,
  "totalSpent": 0.10308,
  "dailyLimit": 10,
  "monthlyLimit": 300,
  "createdAt": "2025-10-20T16:03:30.239Z",
  "updatedAt": "2025-10-20T16:03:54.046Z"
}
```

### Get Usage Statistics

```bash
GET /billing/stats?from=2025-10-01T00:00:00.000Z&to=2025-10-31T23:59:59.999Z
```

**Response:**
```json
{
  "totalRequests": 10,
  "totalTokens": 66560,
  "inputTokens": 65480,
  "outputTokens": 1080,
  "totalCost": 1.0308,
  "inputCost": 0.9822,
  "outputCost": 0.0486,
  "successfulRequests": 10,
  "failedRequests": 0,
  "successRate": 100
}
```

### Get Usage Records

```bash
GET /billing/usage?limit=50&offset=0&from=2025-10-20T00:00:00.000Z
```

**Response:**
```json
{
  "count": 1,
  "records": [
    {
      "id": "5b034812-...",
      "apiKeyId": "eff7352c-...",
      "sessionId": "019a025c-...",
      "workspaceId": "billing-test",
      "timestamp": "2025-10-20T16:03:54.044Z",
      "inputTokens": 6548,
      "outputTokens": 108,
      "totalTokens": 6656,
      "inputCost": 0.09822,
      "outputCost": 0.00486,
      "totalCost": 0.10308,
      "model": "codex-computer",
      "duration": 14856,
      "status": "success",
      "endpoint": "/execute"
    }
  ]
}
```

### Get Transaction History

```bash
GET /billing/transactions?limit=50&offset=0&type=usage_deduction
```

**Transaction Types:**
- `credit_purchase` - User added credits
- `usage_deduction` - Task execution cost
- `credit_adjustment` - Admin credit adjustment
- `refund` - Credit refund

**Response:**
```json
{
  "count": 2,
  "transactions": [
    {
      "id": "03c0f3df-...",
      "apiKeyId": "eff7352c-...",
      "type": "usage_deduction",
      "amount": -0.10308,
      "balanceAfter": 9.89692,
      "description": "Task execution: billing-test",
      "timestamp": "2025-10-20T16:03:54.046Z"
    },
    {
      "id": "bc070ea9-...",
      "apiKeyId": "eff7352c-...",
      "type": "credit_adjustment",
      "amount": 10,
      "balanceAfter": 10,
      "description": "Initial test credits",
      "timestamp": "2025-10-20T16:03:30.240Z"
    }
  ]
}
```

### Get Usage by Workspace

```bash
GET /billing/workspaces?from=2025-10-01T00:00:00.000Z
```

**Response:**
```json
{
  "count": 2,
  "workspaces": [
    {
      "workspaceId": "project-a",
      "totalCost": 5.42,
      "totalTokens": 120000,
      "requestCount": 50
    },
    {
      "workspaceId": "project-b",
      "totalCost": 2.15,
      "totalTokens": 48000,
      "requestCount": 20
    }
  ]
}
```

## Admin Billing API

All admin endpoints require `ADMIN_API_KEY` authentication.

### Add Credits

```bash
POST /billing/admin/:apiKeyId/credits
Authorization: Bearer YOUR_ADMIN_KEY
Content-Type: application/json

{
  "amount": 100,
  "description": "Credit purchase - $100 via Stripe"
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": "9fc77e55-...",
    "apiKeyId": "eff7352c-...",
    "creditsBalance": 100,
    "totalSpent": 0,
    "createdAt": "2025-10-20T16:03:30.239Z",
    "updatedAt": "2025-10-20T16:10:00.000Z"
  }
}
```

### Set Spending Limits

```bash
POST /billing/admin/:apiKeyId/limits
Authorization: Bearer YOUR_ADMIN_KEY
Content-Type: application/json

{
  "dailyLimit": 10,
  "monthlyLimit": 300
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": "9fc77e55-...",
    "creditsBalance": 100,
    "dailyLimit": 10,
    "monthlyLimit": 300
  }
}
```

### Get Admin Usage Stats

```bash
GET /billing/admin/:apiKeyId/stats?from=2025-10-01T00:00:00.000Z
Authorization: Bearer YOUR_ADMIN_KEY
```

Same response format as user stats endpoint.

## Budget Protection

### Balance Check

**When:** Before every `/execute` request (standard keys only)

**Logic:**
```typescript
if (apiKey.keyType === 'standard') {
  const account = getBillingAccount(apiKeyId);

  if (account.creditsBalance <= 0) {
    return HTTP 402 {
      error: "Insufficient Credits",
      message: "Your credit balance is insufficient. Please add credits to continue.",
      details: {
        currentBalance: -0.05,
        totalSpent: 10.05
      }
    }
  }
}
```

### Spending Limits Check

**Daily Limit:**
```typescript
const today = new Date().toISOString().split('T')[0];
const dailyUsage = getUsageStats({
  apiKeyId,
  from: `${today}T00:00:00.000Z`,
  to: `${today}T23:59:59.999Z`
});

if (account.dailyLimit && dailyUsage.totalCost >= account.dailyLimit) {
  return HTTP 429 {
    error: "Spending Limit Exceeded",
    message: "Daily spending limit exceeded ($10)",
    details: {
      dailyUsage: 10.05,
      dailyLimit: 10
    }
  }
}
```

**Monthly Limit:** Same logic with month boundaries.

### Bypass for Internal Keys

```typescript
if (apiKey.keyType === 'internal') {
  // Skip all budget checks
  // Execute task
  // Track usage but don't charge
}
```

## Integration Examples

### Dashboard Integration

**Display User Balance:**
```typescript
const response = await fetch('https://api.testbase.io/billing/account', {
  headers: {
    'Authorization': `Bearer ${userApiKey}`
  }
});
const account = await response.json();

// Show: $9.90 remaining
console.log(`$${account.creditsBalance.toFixed(2)} remaining`);
```

**Add Credits via Stripe:**
```typescript
// 1. User purchases $100 via Stripe
const stripePayment = await stripe.charges.create({ amount: 10000 });

// 2. Add credits to user account
await fetch(`https://api.testbase.io/billing/admin/${apiKeyId}/credits`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 100,
    description: `Stripe payment: ${stripePayment.id}`
  })
});
```

**Usage Charts:**
```typescript
const response = await fetch(
  'https://api.testbase.io/billing/usage?limit=1000&from=2025-10-01T00:00:00.000Z',
  {
    headers: { 'Authorization': `Bearer ${userApiKey}` }
  }
);
const { records } = await response.json();

// Group by day for chart
const dailyUsage = records.reduce((acc, record) => {
  const day = record.timestamp.split('T')[0];
  acc[day] = (acc[day] || 0) + record.totalCost;
  return acc;
}, {});
```

### SDK Integration

**Execute with Billing Info:**
```typescript
import { Agent, run, CloudRuntime } from '@testbase/agents';

const runtime = new CloudRuntime({
  apiKey: 'tb_prod_...',  // Standard key
  apiUrl: 'https://api.testbase.io'
});

const agent = new Agent({
  agentType: 'computer',
  runtime,
  workspace: './my-project'
});

const result = await run(agent, 'Create app.py');

console.log('Output:', result.finalOutput);
console.log('Usage:', result.usage);
console.log('Balance after:', result.billing.balanceAfter);
```

## Monitoring & Analytics

### Key Metrics to Track

1. **Total Revenue**: Sum of all credit purchases
2. **Active Users**: Users with balance > 0
3. **Churn Rate**: Users who run out of credits and don't refill
4. **Average Usage**: Tokens per user per day/week/month
5. **Cost per User**: Total spent / number of users
6. **Workspace Distribution**: Which workspaces cost most

### Database Queries

**Total revenue this month:**
```sql
SELECT SUM(amount) as revenue
FROM transactions
WHERE type = 'credit_purchase'
  AND timestamp >= '2025-10-01T00:00:00.000Z';
```

**Active users:**
```sql
SELECT COUNT(DISTINCT api_key_id) as active_users
FROM billing_accounts
WHERE credits_balance > 0;
```

**Top spenders:**
```sql
SELECT api_key_id, SUM(total_cost) as total_spent
FROM usage_records
WHERE timestamp >= '2025-10-01T00:00:00.000Z'
GROUP BY api_key_id
ORDER BY total_spent DESC
LIMIT 10;
```

## Migration Path

### From SQLite to PostgreSQL

When scaling beyond single VM:

1. **Export data:**
   ```bash
   sqlite3 testbase.db .dump > dump.sql
   ```

2. **Convert schema:**
   - Change `INTEGER` to `BIGINT` for IDs
   - Change `TEXT` to `VARCHAR(255)` or `TEXT`
   - Change `REAL` to `NUMERIC(10, 6)` for money

3. **Import to PostgreSQL:**
   ```bash
   psql -U postgres -d testbase < dump.sql
   ```

4. **Update connection string in code**

## Security Considerations

### API Key Storage

- ✅ Keys hashed with SHA-256 before storage
- ✅ Plain key only shown once at creation
- ✅ No way to retrieve plain key after creation

### Transaction Integrity

- ✅ Database transactions ensure consistency
- ✅ Balance never goes negative without recording
- ✅ All deductions logged in transactions table

### Rate Limiting

- Global: 100 requests per 15 minutes per IP
- Execute: 30 requests per 15 minutes per IP
- Consider per-API-key rate limiting for production

## Troubleshooting

### "Insufficient Credits" Error

**Cause:** Balance ≤ 0

**Solution:**
```bash
POST /billing/admin/:apiKeyId/credits
{ "amount": 100, "description": "Top-up" }
```

### "Spending Limit Exceeded" Error

**Cause:** Hit daily/monthly limit

**Solutions:**
1. Wait until next day/month
2. Increase limits via admin API
3. Use internal key for testing

### Usage Not Tracking

**Check:**
1. Is key type "standard"? (Internal keys skip tracking)
2. Is apiKeyId being passed to executor?
3. Are usage tokens in Codex SDK response?

**Debug:**
```bash
# Check logs on VM
sudo journalctl -u testbase-cloud -f
```

## Future Enhancements

### Planned Features

1. **Auto-recharge** - Automatic credit purchase when low
2. **Email alerts** - Notify when balance < $10
3. **Usage forecasting** - Predict when credits will run out
4. **Tiered pricing** - Volume discounts
5. **Team accounts** - Shared billing for organizations
6. **Invoice generation** - PDF invoices for accounting

### API Improvements

1. **Webhook support** - Notify external systems of events
2. **GraphQL API** - More flexible querying
3. **Bulk operations** - Create multiple keys at once
4. **Export endpoints** - CSV/JSON export for accounting

---

**Questions?** Check the main README or create an issue on GitHub.
