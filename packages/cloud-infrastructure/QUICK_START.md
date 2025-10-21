# Testbase Cloud - Quick Start Guide

Get started with Testbase Cloud in 5 minutes.

## Prerequisites

- Admin API key (configured on server)
- Server URL: `http://34.170.205.13:8080`

## Step 1: Create Your API Key

Use the admin API to create a user API key:

```bash
curl -X POST http://34.170.205.13:8080/admin/keys \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Key",
    "keyType": "standard",
    "prefix": "tb_user_"
  }'
```

**Response:**
```json
{
  "id": "abc-123",
  "key": "tb_user_abc123def456...",
  "keyType": "standard",
  "name": "My First Key",
  "warning": "⚠️ Store this key securely - it cannot be retrieved again!"
}
```

**⚠️ Important:** Copy the `key` value - you won't be able to retrieve it again!

## Step 2: Add Credits (Standard Keys Only)

Standard keys require credits to execute tasks:

```bash
curl -X POST http://34.170.205.13:8080/billing/admin/abc-123/credits \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "description": "Initial credits"
  }'
```

**For Testing:** Create an internal key instead (unlimited usage, no billing):

```bash
curl -X POST http://34.170.205.13:8080/admin/keys \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Testing Key",
    "keyType": "internal",
    "prefix": "tb_test_"
  }'
```

## Step 3: Verify Server is Running

```bash
curl http://34.170.205.13:8080/health
```

You should see:
```json
{
  "status": "healthy",
  "checks": {
    "gcsfuseMount": { "status": "ok" },
    "openaiApiKey": { "status": "ok" }
  }
}
```

## Step 4: Execute Your First Task

### Using curl:

```bash
curl -X POST http://34.170.205.13:8080/execute \
  -H "Authorization: Bearer tb_user_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a Python script called hello.py that prints Hello World",
    "workspaceId": "my-first-workspace"
  }'
```

**Response:**
```json
{
  "output": "Created hello.py with Hello World message",
  "sessionId": "thread-xyz-123",
  "workspaceId": "my-first-workspace",
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

### Using JavaScript:

```javascript
const API_URL = "http://34.170.205.13:8080";
const API_KEY = "tb_user_abc123def456...";

async function executeTask(task, workspaceId) {
  const response = await fetch(`${API_URL}/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ task, workspaceId })
  });

  return await response.json();
}

// Execute
const result = await executeTask(
  "Create hello.py with Hello World",
  "my-workspace"
);

console.log('Output:', result.output);
console.log('Cost:', result.usage.totalCost);
console.log('Balance:', result.billing.balanceAfter);
```

### Using Python:

```python
import requests

API_URL = "http://34.170.205.13:8080"
API_KEY = "tb_user_abc123def456..."

def execute_task(task, workspace_id):
    response = requests.post(
        f"{API_URL}/execute",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "task": task,
            "workspaceId": workspace_id
        }
    )
    return response.json()

# Execute
result = execute_task(
    "Create hello.py with Hello World",
    "my-workspace"
)

print(f"Output: {result['output']}")
print(f"Cost: ${result['usage']['totalCost']}")
print(f"Balance: ${result['billing']['balanceAfter']}")
```

## Step 5: Check Your Usage

### Get Account Balance:

```bash
curl http://34.170.205.13:8080/billing/account \
  -H "Authorization: Bearer tb_user_abc123def456..."
```

**Response:**
```json
{
  "creditsBalance": 9.89692,
  "totalSpent": 0.10308
}
```

### Get Usage Statistics:

```bash
curl "http://34.170.205.13:8080/billing/stats" \
  -H "Authorization: Bearer tb_user_abc123def456..."
```

**Response:**
```json
{
  "totalRequests": 1,
  "totalTokens": 6656,
  "totalCost": 0.10308,
  "successRate": 100
}
```

### Get Detailed Usage Records:

```bash
curl "http://34.170.205.13:8080/billing/usage?limit=10" \
  -H "Authorization: Bearer tb_user_abc123def456..."
```

## Step 6: Download Workspace Files

### List Files:

```bash
curl "http://34.170.205.13:8080/workspace/my-first-workspace/files" \
  -H "Authorization: Bearer tb_user_abc123def456..."
```

### Read File:

```bash
curl "http://34.170.205.13:8080/workspace/my-first-workspace/file/hello.py" \
  -H "Authorization: Bearer tb_user_abc123def456..."
```

### Download File:

```bash
curl "http://34.170.205.13:8080/workspace/my-first-workspace/download/hello.py" \
  -H "Authorization: Bearer tb_user_abc123def456..." \
  -o hello.py
```

## Common Tasks

### Continue Previous Session

To continue working in the same session (maintains conversation context):

```bash
curl -X POST http://34.170.205.13:8080/execute \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Add error handling to hello.py",
    "workspaceId": "my-first-workspace",
    "sessionId": "thread-xyz-123"
  }'
```

### Add More Credits

```bash
curl -X POST http://34.170.205.13:8080/billing/admin/abc-123/credits \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "description": "Top-up"
  }'
```

### Set Spending Limits

```bash
curl -X POST http://34.170.205.13:8080/billing/admin/abc-123/limits \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dailyLimit": 5,
    "monthlyLimit": 100
  }'
```

### List All API Keys

```bash
curl "http://34.170.205.13:8080/admin/keys?limit=100" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

### Revoke API Key

```bash
curl -X POST http://34.170.205.13:8080/admin/keys/abc-123/revoke \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

## Pricing

- **Input tokens**: $0.015 per 1,000 tokens
- **Output tokens**: $0.045 per 1,000 tokens
- **Typical task**: $0.05 - $0.20

**Example costs:**
- "Create hello.py" → ~$0.10
- "Refactor entire codebase" → ~$2.00
- "Add unit tests to project" → ~$0.50

## Troubleshooting

### Error: "Invalid API key"

**Cause:** API key not found or inactive

**Solution:**
1. Check key is correct
2. Verify key is active: `GET /admin/keys/:id`
3. Create new key if needed

### Error: "Insufficient Credits" (HTTP 402)

**Cause:** Balance ≤ 0

**Solution:**
```bash
POST /billing/admin/:apiKeyId/credits
{ "amount": 10 }
```

### Error: "Spending Limit Exceeded" (HTTP 429)

**Cause:** Hit daily/monthly limit

**Solution:**
1. Wait until next day/month, or
2. Increase limits via admin API, or
3. Use internal key for testing

### Task Returns Empty Output

**Cause:** Task too vague or file already exists

**Solution:**
- Be more specific: "Create a Python file called hello.py with a function that prints 'Hello World'"
- Check existing files first: `GET /workspace/:id/files`

## Next Steps

1. **Read the full docs**: See [README.md](./README.md)
2. **Explore billing**: See [BILLING.md](./BILLING.md)
3. **Use the SDK**: Install `@testbase/agents` npm package
4. **Build a dashboard**: Integrate admin and billing APIs

## SDK Usage

For production use, integrate with the Testbase SDK:

```bash
npm install @testbase/agents
```

```typescript
import { Agent, run, CloudRuntime } from '@testbase/agents';

const runtime = new CloudRuntime({
  apiKey: 'tb_user_abc123...',
  apiUrl: 'http://34.170.205.13:8080'
});

const agent = new Agent({
  agentType: 'computer',
  runtime,
  workspace: './my-project'
});

const result = await run(agent, 'Create app.py');
console.log(result.finalOutput);
```

## Support

- **Documentation**: See README.md and BILLING.md
- **API Reference**: See API_KEY_MANAGEMENT.md
- **Issues**: Create issue on GitHub

---

**Ready to build?** Start with a simple task and scale from there!
