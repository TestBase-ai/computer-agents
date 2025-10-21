# Testbase Cloud API Documentation

Complete API reference for the Testbase Cloud Agent Server.

## Base URL

```
http://YOUR_VM_IP:8080
```

## Authentication

### API Key Authentication

Most endpoints require authentication via API key. Public endpoints (health, metrics) do not require authentication.

**Methods to provide API key:**

1. **Authorization header** (recommended):
```
Authorization: Bearer YOUR_API_KEY
```

2. **X-API-Key header**:
```
X-API-Key: YOUR_API_KEY
```

3. **Query parameter** (testing only):
```
?api_key=YOUR_API_KEY
```

### Configuring API Keys

Set the `TESTBASE_API_KEYS` environment variable on the server with comma-separated keys:

```bash
TESTBASE_API_KEYS=key1,key2,key3
```

If no keys are configured, the server runs in **open mode** (insecure).

## Rate Limiting

- **Global limit**: 100 requests per 15 minutes per IP
- **Execution limit**: 30 executions per 15 minutes per IP

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Timestamp when limit resets

## CORS

CORS is enabled for all origins by default. Configure via `CORS_ORIGIN` environment variable.

---

## Endpoints

### Health & Monitoring

#### GET /health

Enhanced health check with detailed diagnostics.

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "status": "healthy",
  "project": "firechatbot-a9654",
  "timestamp": "2025-10-20T10:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "gcsfuseMount": {
      "status": "ok",
      "path": "/mnt/workspaces"
    },
    "openaiApiKey": {
      "status": "ok"
    },
    "memory": {
      "status": "ok",
      "total": "3913 MB",
      "used": "516 MB",
      "free": "3398 MB",
      "usagePercent": 13
    },
    "disk": {
      "status": "ok",
      "usagePercent": 0,
      "mount": "/mnt/workspaces"
    }
  },
  "metrics": {
    "activeSessions": 2,
    "recentErrors": 0,
    "successRate": "98.5%"
  }
}
```

#### GET /metrics

Get execution metrics summary.

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "totalTasks": 150,
  "successfulTasks": 148,
  "failedTasks": 2,
  "successRate": 98.67,
  "averageDuration": 12500,
  "recentErrors": [
    {
      "timestamp": "2025-10-20T09:30:00.000Z",
      "error": "Task timeout",
      "workspaceId": "test-workspace"
    }
  ],
  "activeSessions": 3
}
```

#### GET /metrics/history

Get detailed execution history.

**Authentication**: Not required

**Query Parameters**:
- `limit` (optional): Number of records to return (default: 100)

**Response** (200 OK):
```json
{
  "count": 10,
  "history": [
    {
      "workspaceId": "my-workspace",
      "sessionId": "session-123",
      "startTime": 1634567890000,
      "endTime": 1634567905000,
      "success": true,
      "duration": 15000
    }
  ]
}
```

---

### Task Execution

#### POST /execute

Execute a task using Codex SDK.

**Authentication**: Required
**Rate Limit**: 30 requests per 15 minutes

**Request Body**:
```json
{
  "task": "Create a Python script that prints Hello World",
  "workspaceId": "my-workspace-123",
  "sessionId": "optional-session-id",
  "mcpServers": []
}
```

**Fields**:
- `task` (required): Task description for the agent
- `workspaceId` (required): Unique identifier for the workspace
- `sessionId` (optional): Session ID for continuity
- `mcpServers` (optional): Array of MCP server configurations

**Response** (200 OK):
```json
{
  "output": "Created Python script successfully",
  "sessionId": "019a0128-9011-7621-89be-24a56bf145d6",
  "workspaceId": "my-workspace-123"
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: No API key provided
- `403 Forbidden`: Invalid API key
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Task execution failed

---

### Session Management

#### GET /sessions

List all sessions.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "count": 5,
  "sessions": [
    {
      "sessionId": "019a0118-b795-7013-8ccd-f6c202e0de53",
      "threadId": "019a0118-b795-7013-8ccd-f6c202e0de53",
      "workspaceId": "my-workspace",
      "lastActivity": "2025-10-20T10:11:08.608Z",
      "taskCount": 3,
      "created": "2025-10-20T10:09:57.197Z"
    }
  ]
}
```

#### GET /sessions/:sessionId

Get specific session details.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "sessionId": "019a0118-b795-7013-8ccd-f6c202e0de53",
  "threadId": "019a0118-b795-7013-8ccd-f6c202e0de53",
  "workspaceId": "my-workspace",
  "lastActivity": "2025-10-20T10:11:08.608Z",
  "taskCount": 3,
  "created": "2025-10-20T10:09:57.197Z"
}
```

**Error**: `404 Not Found` if session doesn't exist

#### DELETE /sessions/:sessionId

Delete a specific session.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "sessionId": "019a0118-b795-7013-8ccd-f6c202e0de53"
}
```

#### GET /sessions/active/list

Get currently active sessions (in-memory).

**Authentication**: Required

**Response** (200 OK):
```json
{
  "count": 2,
  "sessions": ["session-id-1", "session-id-2"]
}
```

---

### Workspace Management

#### GET /workspaces

List all workspaces.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "count": 8,
  "workspaces": [
    {
      "id": "my-workspace-123",
      "created": "2025-10-20T08:00:00.000Z",
      "modified": "2025-10-20T10:30:00.000Z",
      "fileCount": 5
    }
  ]
}
```

#### DELETE /workspaces/:workspaceId

Delete a specific workspace.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "workspaceId": "my-workspace-123"
}
```

---

### File Management

#### GET /workspace/:workspaceId/files

List files in a workspace.

**Authentication**: Required

**Query Parameters**:
- `path` (optional): Relative path within workspace

**Response** (200 OK):
```json
{
  "workspaceId": "my-workspace",
  "path": "",
  "files": [
    {
      "name": "script.py",
      "type": "file",
      "size": 1024,
      "modified": "2025-10-20T10:00:00.000Z"
    },
    {
      "name": "data",
      "type": "directory",
      "size": 0,
      "modified": "2025-10-20T09:00:00.000Z"
    }
  ]
}
```

#### POST /workspace/:workspaceId/upload

Upload a file to a workspace.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file`: File to upload
- `path`: Relative path in workspace (optional)

**Response** (200 OK):
```json
{
  "success": true,
  "workspaceId": "my-workspace",
  "filename": "data.txt",
  "path": "data.txt",
  "size": 1024
}
```

#### GET /workspace/:workspaceId/download/*

Download a file from a workspace.

**Authentication**: Required

**Example**: `/workspace/my-workspace/download/results/output.txt`

**Response**: File content with appropriate headers

#### DELETE /workspace/:workspaceId/files/*

Delete a file from a workspace.

**Authentication**: Required

**Example**: `/workspace/my-workspace/files/temp/old.txt`

**Response** (200 OK):
```json
{
  "success": true,
  "workspaceId": "my-workspace",
  "filePath": "temp/old.txt"
}
```

---

### Cleanup Operations

#### POST /cleanup/sessions

Delete old sessions based on age.

**Authentication**: Required

**Request Body**:
```json
{
  "olderThanDays": 7
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "deletedCount": 15,
  "olderThanDays": 7
}
```

#### POST /cleanup/workspaces

Delete old workspaces based on age.

**Authentication**: Required

**Request Body**:
```json
{
  "olderThanDays": 30
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "deletedCount": 5,
  "olderThanDays": 30
}
```

---

### Cache Management

#### POST /cache/clear

Clear the thread cache (for memory management).

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Thread cache cleared"
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: No API key provided
- `403 Forbidden`: Invalid API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service unhealthy

---

## Best Practices

1. **Authentication**: Always use the Authorization header with Bearer token
2. **Rate Limiting**: Monitor rate limit headers and implement backoff
3. **Session Continuity**: Reuse sessionId for multi-turn conversations
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Cleanup**: Regularly clean up old sessions and workspaces
6. **Monitoring**: Use /health and /metrics endpoints for observability

---

## Example Usage

### Python Example

```python
import requests

# Configuration
API_URL = "http://your-vm-ip:8080"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Execute a task
response = requests.post(
    f"{API_URL}/execute",
    headers=headers,
    json={
        "task": "Create a Python script that calculates fibonacci numbers",
        "workspaceId": "my-project"
    }
)

result = response.json()
print(f"Session ID: {result['sessionId']}")
print(f"Output: {result['output']}")

# Continue the session
response = requests.post(
    f"{API_URL}/execute",
    headers=headers,
    json={
        "task": "Add error handling to the script",
        "workspaceId": "my-project",
        "sessionId": result['sessionId']  # Session continuity
    }
)
```

### curl Example

```bash
# Execute a task
curl -X POST http://your-vm-ip:8080/execute \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create hello.txt with Hello World",
    "workspaceId": "test-workspace"
  }'

# Check health
curl http://your-vm-ip:8080/health

# List sessions
curl -H "Authorization: Bearer your-api-key" \
  http://your-vm-ip:8080/sessions
```

---

## Environment Configuration

Server environment variables:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
TESTBASE_API_KEYS=key1,key2,key3  # Comma-separated API keys
CORS_ORIGIN=*                      # CORS allowed origins
PORT=8080                          # Server port
```
