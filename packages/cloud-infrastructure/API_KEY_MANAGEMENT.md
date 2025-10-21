# API Key Management System

Complete guide to the Testbase Cloud API key management system.

---

## 📋 Overview

The API key management system provides:

- **Secure API key generation** - Crypto-random keys with prefixes
- **Database storage** - SQLite with easy PostgreSQL migration path
- **Admin API** - RESTful endpoints for CRUD operations
- **Usage tracking** - Track requests, success rates, last used
- **Expiration support** - Optional key expiration dates
- **Permissions** - Granular permissions per key
- **Dashboard-ready** - Designed for web dashboard integration

---

## 🚀 Quick Start

### Step 1: Set Admin Key

The admin API requires a master key for authentication:

```bash
# SSH to your VM
gcloud compute ssh testbase-ubuntu-vm

# Edit environment file
sudo nano /opt/testbase-cloud/.env

# Add admin key (use a strong random string)
ADMIN_API_KEY=admin_your_secure_master_key_here

# Optional: Keep legacy env var keys for backward compatibility
TESTBASE_API_KEYS=legacy-key-1,legacy-key-2

# Restart service
sudo systemctl restart testbase-cloud
```

### Step 2: Create Your First API Key

```bash
# Create a new API key
curl -X POST http://YOUR_VM_IP:8080/admin/keys \
  -H "Authorization: Bearer admin_your_secure_master_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "description": "Main production API key",
    "prefix": "tb_prod_",
    "permissions": ["execute", "read", "write"]
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "tb_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
  "keyPrefix": "tb_prod_",
  "name": "Production Key",
  "description": "Main production API key",
  "createdAt": "2025-10-20T12:00:00.000Z",
  "permissions": ["execute", "read", "write"],
  "warning": "⚠️ Store this key securely - it cannot be retrieved again!"
}
```

**⚠️ IMPORTANT:** Save the `key` value immediately - it's only shown once!

### Step 3: Use the API Key

```bash
export TESTBASE_API_KEY=tb_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...

# Now you can use it with the SDK or API
curl -X POST http://YOUR_VM_IP:8080/execute \
  -H "Authorization: Bearer $TESTBASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create hello.py",
    "workspaceId": "my-workspace"
  }'
```

---

## 🔑 Admin API Reference

All admin endpoints require the `ADMIN_API_KEY` for authentication.

**Base URL:** `http://YOUR_VM_IP:8080/admin`

**Authentication:** `Authorization: Bearer {ADMIN_API_KEY}`

---

### POST /admin/keys

Create a new API key.

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "prefix": "string (optional, default: 'tb_')",
  "expiresIn": "number (optional, days until expiration)",
  "permissions": ["array of strings (optional, default: all)"],
  "metadata": { "custom": "metadata (optional)" }
}
```

**Example:**
```bash
curl -X POST http://YOUR_VM_IP:8080/admin/keys \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development Key",
    "description": "For local development",
    "prefix": "tb_dev_",
    "expiresIn": 90,
    "permissions": ["execute", "read"],
    "metadata": {
      "environment": "development",
      "team": "engineering"
    }
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "key": "tb_dev_...",
  "keyPrefix": "tb_dev_",
  "name": "Development Key",
  "description": "For local development",
  "createdAt": "2025-10-20T12:00:00.000Z",
  "expiresAt": "2026-01-18T12:00:00.000Z",
  "permissions": ["execute", "read"],
  "metadata": { "environment": "development", "team": "engineering" },
  "warning": "⚠️ Store this key securely - it cannot be retrieved again!"
}
```

---

### GET /admin/keys

List all API keys (paginated).

**Query Parameters:**
- `limit` - Number of keys to return (default: 100)
- `offset` - Offset for pagination (default: 0)
- `includeInactive` - Include revoked keys (default: false)

**Example:**
```bash
curl -X GET "http://YOUR_VM_IP:8080/admin/keys?limit=10&offset=0" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

**Response:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "keyPrefix": "tb_prod_",
      "name": "Production Key",
      "description": "Main production API key",
      "createdAt": "2025-10-20T12:00:00.000Z",
      "lastUsedAt": "2025-10-20T13:30:00.000Z",
      "expiresAt": null,
      "isActive": true,
      "permissions": ["execute", "read", "write"]
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

### GET /admin/keys/:id

Get details for a specific API key.

**Example:**
```bash
curl -X GET "http://YOUR_VM_IP:8080/admin/keys/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

**Response:**
```json
{
  "id": "uuid",
  "keyPrefix": "tb_prod_",
  "name": "Production Key",
  "description": "Main production API key",
  "createdAt": "2025-10-20T12:00:00.000Z",
  "lastUsedAt": "2025-10-20T13:30:00.000Z",
  "expiresAt": null,
  "isActive": true,
  "permissions": ["execute", "read", "write"],
  "metadata": {},
  "usage": {
    "totalRequests": 152,
    "successRate": 98.68,
    "lastUsed": "2025-10-20T13:30:00.000Z"
  }
}
```

---

### PATCH /admin/keys/:id

Update API key metadata (name, description, permissions).

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "permissions": ["array (optional)"],
  "metadata": { "object (optional)" }
}
```

**Example:**
```bash
curl -X PATCH "http://YOUR_VM_IP:8080/admin/keys/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key (Updated)",
    "permissions": ["execute", "read", "write", "admin"]
  }'
```

---

### POST /admin/keys/:id/revoke

Revoke an API key (soft delete - can be restored).

**Example:**
```bash
curl -X POST "http://YOUR_VM_IP:8080/admin/keys/550e8400-e29b-41d4-a716-446655440000/revoke" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "message": "API key revoked successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### DELETE /admin/keys/:id

Permanently delete an API key (hard delete - cannot be restored).

**Example:**
```bash
curl -X DELETE "http://YOUR_VM_IP:8080/admin/keys/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "message": "API key deleted permanently",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### GET /admin/keys/:id/usage

Get usage statistics for an API key.

**Query Parameters:**
- `since` - ISO timestamp to get stats from (optional)

**Example:**
```bash
curl -X GET "http://YOUR_VM_IP:8080/admin/keys/550e8400-e29b-41d4-a716-446655440000/usage?since=2025-10-01T00:00:00.000Z" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

**Response:**
```json
{
  "keyId": "550e8400-e29b-41d4-a716-446655440000",
  "keyPrefix": "tb_prod_",
  "name": "Production Key",
  "stats": {
    "totalRequests": 1520,
    "successRate": 98.68,
    "lastUsed": "2025-10-20T13:30:00.000Z"
  }
}
```

---

## 🔐 Authentication Flow

### Priority Order

1. **Database keys** (primary) - Checked first
2. **Environment variable keys** (legacy) - Fallback for backward compatibility
3. **Open mode** (insecure) - If no keys configured anywhere

### Key Lookup

```
Request → Extract API key → Hash it → Check database →
  ✓ Found & Active → Authenticate
  ✗ Not found → Check TESTBASE_API_KEYS env var →
    ✓ Found → Authenticate (legacy)
    ✗ Not found → Reject (403)
```

### Expiration Handling

- Keys with `expiresAt` date are checked on each request
- Expired keys return 401 Unauthorized
- No automatic cleanup - expired keys remain in database

### Usage Tracking

- Every authenticated request is logged to `api_key_usage` table
- `lastUsedAt` timestamp updated automatically
- Stats available via `/admin/keys/:id/usage`

---

## 📊 Database Schema

### api_keys Table

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,              -- Hashed key (SHA-256)
  key_prefix TEXT NOT NULL,              -- First 8 chars (e.g., "tb_prod_")
  name TEXT NOT NULL,                    -- Human-readable name
  description TEXT,                      -- Optional description
  created_at TEXT NOT NULL,              -- ISO timestamp
  last_used_at TEXT,                     -- ISO timestamp
  expires_at TEXT,                       -- ISO timestamp (optional)
  is_active INTEGER NOT NULL DEFAULT 1,  -- 0 = revoked, 1 = active
  permissions TEXT NOT NULL,             -- JSON array
  metadata TEXT                          -- JSON object (optional)
);
```

### api_key_usage Table

```sql
CREATE TABLE api_key_usage (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL,                  -- Foreign key to api_keys
  endpoint TEXT NOT NULL,                -- API endpoint called
  method TEXT NOT NULL,                  -- HTTP method
  status_code INTEGER NOT NULL,          -- Response status
  timestamp TEXT NOT NULL,               -- ISO timestamp
  ip_address TEXT,                       -- Client IP
  user_agent TEXT,                       -- Client user agent
  FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);
```

---

## 🎯 Dashboard Integration

### React/Next.js Example

```typescript
// lib/api-keys.ts
export async function createApiKey(data: {
  name: string;
  description?: string;
  prefix?: string;
  expiresIn?: number;
  permissions?: string[];
}) {
  const response = await fetch(`${API_URL}/admin/keys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create API key');
  }

  return response.json();
}

export async function listApiKeys() {
  const response = await fetch(`${API_URL}/admin/keys`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to list API keys');
  }

  return response.json();
}

export async function revokeApiKey(id: string) {
  const response = await fetch(`${API_URL}/admin/keys/${id}/revoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to revoke API key');
  }

  return response.json();
}
```

### Dashboard Component Example

```tsx
// components/ApiKeyManager.tsx
import { useState, useEffect } from 'react';
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api-keys';

export function ApiKeyManager() {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const data = await listApiKeys();
    setKeys(data.keys);
  }

  async function handleCreate(name: string, prefix: string) {
    const result = await createApiKey({ name, prefix });
    setNewKey(result.key); // ⚠️ Show this once!
    await loadKeys();
  }

  async function handleRevoke(id: string) {
    await revokeApiKey(id);
    await loadKeys();
  }

  return (
    <div>
      {newKey && (
        <div className="alert alert-warning">
          ⚠️ New API Key (save it now - won't be shown again):
          <code>{newKey}</code>
          <button onClick={() => setNewKey(null)}>Dismiss</button>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Prefix</th>
            <th>Created</th>
            <th>Last Used</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id}>
              <td>{key.name}</td>
              <td><code>{key.keyPrefix}</code></td>
              <td>{new Date(key.createdAt).toLocaleDateString()}</td>
              <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</td>
              <td>{key.isActive ? 'Active' : 'Revoked'}</td>
              <td>
                {key.isActive && (
                  <button onClick={() => handleRevoke(key.id)}>Revoke</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => handleCreate('New Key', 'tb_')}>Create Key</button>
    </div>
  );
}
```

---

## 🛠️ Advanced Usage

### Custom Permissions

```typescript
// Create key with custom permissions
const key = await createApiKey({
  name: 'Read-Only Key',
  permissions: ['read'],
});

// In your API, check permissions:
if (!req.apiKeyPermissions?.includes('write')) {
  return res.status(403).json({ error: 'Write permission required' });
}
```

### Expiring Keys

```typescript
// Create key that expires in 30 days
const key = await createApiKey({
  name: 'Temporary Key',
  expiresIn: 30,
});
```

### Metadata Tracking

```typescript
// Store custom metadata
const key = await createApiKey({
  name: 'Team Key',
  metadata: {
    team: 'engineering',
    environment: 'staging',
    costCenter: 'R&D',
  },
});
```

---

## 🔒 Security Best Practices

1. **Strong Admin Key**: Use a long, random string for `ADMIN_API_KEY`
   ```bash
   openssl rand -hex 32
   ```

2. **HTTPS Only**: Always use HTTPS in production (nginx reverse proxy)

3. **Rotate Keys**: Regularly rotate API keys, especially after team changes

4. **Least Privilege**: Only grant permissions that are actually needed

5. **Monitor Usage**: Check `/admin/keys/:id/usage` for unusual patterns

6. **Audit Logs**: Review audit logs regularly for suspicious activity

7. **Secure Storage**: Never commit API keys to git, use environment variables

8. **Expiration**: Set expiration dates for temporary access

---

## 🚨 Troubleshooting

### Database Path

**Default:** `/opt/testbase-cloud/data/testbase.db`

**Override:**
```bash
DB_PATH=/custom/path/testbase.db
```

**Ensure directory exists and is writable:**
```bash
sudo mkdir -p /opt/testbase-cloud/data
sudo chown testbase:testbase /opt/testbase-cloud/data
```

### Admin Authentication Fails

```bash
# Check ADMIN_API_KEY is set
echo $ADMIN_API_KEY

# Check in .env file
cat /opt/testbase-cloud/.env | grep ADMIN_API_KEY

# Restart service after .env changes
sudo systemctl restart testbase-cloud
```

### Database Locked

```bash
# Check if database file exists
ls -la /opt/testbase-cloud/data/testbase.db

# Check permissions
sudo chown testbase:testbase /opt/testbase-cloud/data/testbase.db

# Check for stale locks
rm /opt/testbase-cloud/data/testbase.db-wal
```

### Migration from Env Vars

```bash
# Old way (still supported as fallback):
TESTBASE_API_KEYS=key1,key2,key3

# New way (recommended):
# 1. Create keys via admin API
# 2. Remove TESTBASE_API_KEYS from .env
# 3. Restart service
```

---

## 📚 Additional Resources

- [Cloud Infrastructure README](./README.md)
- [Quick Start Guide](./QUICK_START.md)
- [API Documentation](../../API_DOCUMENTATION.md)
- [Deployment Guide](./deployment/README.md)

---

**Need Help?** Open an issue or contact the team!
