# Testbase Cloud Infrastructure

Simple GCE-based cloud runtime for computer agents with pay-per-token billing.

## Architecture

- **GCS**: Source of truth for workspaces (`gs://testbase-workspaces`)
- **GCE VM**: Executes Codex SDK tasks (IP: 34.170.205.13)
- **CloudRuntime**: Handles upload → execute → download flow
- **Billing System**: Usage tracking, credit management, and budget protection
- **API Keys**: Database-backed authentication with standard and internal key types

## How It Works

1. **Upload**: Local workspace → GCS (`gs://testbase-workspaces/{workspace-id}/`)
2. **Execute**: POST to GCE VM → Codex SDK executes task
3. **Download**: GCS → Local workspace (get updated files)

## Setup

### 1. Create GCS Buckets

```bash
gsutil mb -p firechatbot-a9654 -l us-central1 gs://testbase-workspaces
gsutil mb -p firechatbot-a9654 -l us-central1 gs://testbase-sessions
```

### 2. Install Dependencies

```bash
cd packages/cloud-infrastructure
pnpm install
```

### 3. Build

```bash
pnpm build
```

### 4. Deploy to GCE VM

```bash
pnpm deploy
```

## Local Development

```bash
# Set environment variable
export OPENAI_API_KEY=your-key-here

# Run in development mode
pnpm dev
```

Server will start on `http://localhost:8080`.

## Usage from SDK

```typescript
import { Agent, run, CloudRuntime } from '@testbase/agents';

const runtime = new CloudRuntime({ debug: true });

const agent = new Agent({
  agentType: 'computer',
  runtime,
  workspace: './my-project'
});

const result = await run(agent, 'Create app.py with hello world');
console.log(result.finalOutput);
```

## API Endpoints

### POST /execute

Execute a task using Codex SDK. **Requires API key authentication.**

**Request:**
```json
{
  "task": "Create hello.py",
  "workspaceId": "my-project-abc123",
  "sessionId": "optional-session-id",
  "mcpServers": []
}
```

**Response:**
```json
{
  "output": "Created hello.py successfully",
  "sessionId": "thread-xyz",
  "workspaceId": "my-project-abc123",
  "usage": {
    "inputTokens": 6548,
    "outputTokens": 108,
    "totalTokens": 6656,
    "totalCost": 0.10308
  },
  "billing": {
    "balanceAfter": 9.89692,
    "totalSpent": 0.10308
  }
}
```

**Notes:**
- Usage and billing info only returned for standard keys
- Internal keys skip billing (unlimited usage)

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "project": "firechatbot-a9654",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "uptime": 3600
}
```

### POST /cache/clear

Clear thread cache (for memory management).

## API Keys & Authentication

All API endpoints (except `/health` and `/metrics`) require API key authentication.

### Key Types

**Standard Keys** - Pay-per-token billing
- Usage tracked and charged
- Credit balance required
- Budget protection (daily/monthly limits)
- Create via admin API

**Internal Keys** - Unlimited usage
- No billing or usage tracking
- For internal testing/development
- Bypasses all budget checks

### Authentication Methods

Include API key in requests via:
1. **Authorization header** (recommended): `Authorization: Bearer YOUR_API_KEY`
2. **X-API-Key header**: `X-API-Key: YOUR_API_KEY`
3. **Query parameter** (testing only): `?api_key=YOUR_API_KEY`

### Admin API (Key Management)

**Requires admin authentication** via `ADMIN_API_KEY` environment variable.

#### Create API Key
```bash
POST /admin/keys
Authorization: Bearer YOUR_ADMIN_KEY
Content-Type: application/json

{
  "name": "User Key",
  "description": "Optional description",
  "keyType": "standard",  // or "internal"
  "prefix": "tb_user_",
  "expiresIn": 365,       // days (optional)
  "permissions": ["execute", "read", "write"]
}
```

**Response:**
```json
{
  "id": "...",
  "key": "tb_user_abc123...",  // ⚠️ Only shown once!
  "keyType": "standard",
  "name": "User Key",
  "createdAt": "2025-10-20T12:00:00.000Z",
  "warning": "⚠️ Store this key securely - it cannot be retrieved again!"
}
```

#### List API Keys
```bash
GET /admin/keys?limit=100&offset=0&includeInactive=false
```

#### Get Key Details
```bash
GET /admin/keys/:id
```

#### Revoke API Key
```bash
POST /admin/keys/:id/revoke
```

## Billing System

Pay-per-token billing with automatic usage tracking.

### Pricing

- **Input tokens**: $0.015 per 1K tokens (1.5x OpenAI rate)
- **Output tokens**: $0.045 per 1K tokens (1.5x OpenAI rate)

### User Billing Endpoints

**Requires user API key authentication.**

#### Get Billing Account
```bash
GET /billing/account
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "id": "...",
  "apiKeyId": "...",
  "creditsBalance": 9.89692,
  "totalSpent": 0.10308,
  "dailyLimit": null,
  "monthlyLimit": null,
  "createdAt": "2025-10-20T12:00:00.000Z",
  "updatedAt": "2025-10-20T12:05:00.000Z"
}
```

#### Get Usage Statistics
```bash
GET /billing/stats?from=2025-10-01T00:00:00.000Z&to=2025-10-20T23:59:59.999Z
```

**Response:**
```json
{
  "totalRequests": 10,
  "totalTokens": 66560,
  "inputTokens": 65480,
  "outputTokens": 1080,
  "totalCost": 1.0308,
  "successfulRequests": 10,
  "failedRequests": 0,
  "successRate": 100
}
```

#### Get Usage Records
```bash
GET /billing/usage?limit=50&offset=0
```

#### Get Transaction History
```bash
GET /billing/transactions?limit=50&offset=0
```

#### Get Usage by Workspace
```bash
GET /billing/workspaces
```

### Admin Billing Endpoints

**Requires admin authentication.**

#### Add Credits
```bash
POST /billing/admin/:apiKeyId/credits
Authorization: Bearer YOUR_ADMIN_KEY
Content-Type: application/json

{
  "amount": 100,
  "description": "Credit purchase - $100"
}
```

#### Set Spending Limits
```bash
POST /billing/admin/:apiKeyId/limits
Authorization: Bearer YOUR_ADMIN_KEY
Content-Type: application/json

{
  "dailyLimit": 10,     // $10 per day
  "monthlyLimit": 300   // $300 per month
}
```

### Budget Protection

The system automatically blocks requests when:
- Credit balance ≤ 0 (returns HTTP 402 Payment Required)
- Daily spending limit exceeded (returns HTTP 429)
- Monthly spending limit exceeded (returns HTTP 429)

**Note:** Internal keys bypass all budget checks.

## Configuration

### Hardcoded Configuration

- **GCP Project**: `firechatbot-a9654`
- **Workspace Bucket**: `gs://testbase-workspaces`
- **VM IP**: `34.170.205.13`

### Environment Variables

Required in `/opt/testbase-cloud/.env` on VM:

```bash
# Required
OPENAI_API_KEY=your-openai-key
ADMIN_API_KEY=your-admin-key-for-api-management

# Optional
NODE_ENV=production
PORT=8080
DB_PATH=/opt/testbase-cloud/data/testbase.db
```

### Database

- **Type**: SQLite
- **Location**: `/opt/testbase-cloud/data/testbase.db`
- **Tables**:
  - `api_keys` - API key authentication
  - `api_key_usage` - Request logging
  - `usage_records` - Token usage tracking
  - `billing_accounts` - Credit balances
  - `transactions` - Credit movements

## Limitations & Future Improvements

### Current Limitations

**1. Workspace Sync Performance**
- **Current behavior**: Full workspace sync on every execution (upload before, download after)
- **Impact**: Slow for large repositories (1000+ files)
- **Workaround**: Use smaller workspaces or keep files in subdirectories
- **Future**: Incremental sync (only changed files) - planned for v2.0

**2. No Real-Time Progress**
- **Current behavior**: CloudRuntime blocks until task completes
- **Impact**: No visibility into long-running tasks
- **Workaround**: Use LocalRuntime for development/testing
- **Future**: Streaming support via Codex SDK `runStreamed()` - planned for v2.1

**3. No Task Interruption**
- **Current behavior**: Once started, tasks run to completion
- **Impact**: Cannot cancel expensive or stuck tasks
- **Workaround**: Monitor usage and set daily/monthly limits
- **Future**: AbortController support with task cancellation - planned for v2.1

**4. Single VM Architecture**
- **Current behavior**: One GCE VM handles all requests
- **Impact**: Limited concurrent execution, potential bottleneck
- **Workaround**: Rate limiting prevents overload
- **Future**: Auto-scaling with multiple VMs - planned for v3.0

**5. Network Overhead**
- **Current behavior**: gsutil sync via gcloud CLI
- **Impact**: Network roundtrips for workspace upload/download
- **Workaround**: Use LocalRuntime when possible
- **Future**: Direct gcsfuse mount from SDK (eliminate upload/download) - planned for v2.0

### Performance Benchmarks

**Small workspace** (< 10 files, < 1MB):
- Upload: ~1-2 seconds
- Execution: ~5-15 seconds
- Download: ~1-2 seconds
- **Total overhead**: ~2-4 seconds

**Medium workspace** (50-100 files, 10MB):
- Upload: ~5-10 seconds
- Execution: ~5-15 seconds
- Download: ~5-10 seconds
- **Total overhead**: ~10-20 seconds

**Large workspace** (500+ files, 50MB+):
- Upload: ~20-30 seconds
- Execution: ~5-15 seconds
- Download: ~20-30 seconds
- **Total overhead**: ~40-60 seconds

**Recommendation**: Use LocalRuntime for development. Use CloudRuntime for production/isolated environments.

### When to Use CloudRuntime

✅ **Use CloudRuntime when:**
- Need isolated execution environment
- Workspace is reasonably sized (< 100 files)
- Budget tracking and billing required
- Team collaboration on shared workspaces
- Production deployments

❌ **Use LocalRuntime when:**
- Development and testing
- Large repositories (> 500 files)
- Need fast iteration cycles
- Workspace sync overhead unacceptable
- No billing/isolation requirements

## Deployment

See `deployment/` directory for deployment scripts.
