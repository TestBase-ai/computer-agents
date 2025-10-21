# Session Continuity in Testbase Agents

## Overview

Testbase agents support **session continuity** - the ability to maintain context across multiple tasks. However, the behavior differs between LocalRuntime and CloudRuntime.

## LocalRuntime: Persistent Sessions

### How It Works

LocalRuntime executes tasks on your local machine using the Codex SDK. Sessions are **fully persistent** and maintained by the SDK itself.

```typescript
import { Agent, run, LocalRuntime } from '@testbase/agents';

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './my-project'
});

// Task 1
await run(agent, 'Create app.py');           
// Session created: thread-abc-123

// Task 2 - continues same session automatically
await run(agent, 'Add error handling to app.py'); 
// Same session: thread-abc-123

console.log(agent.currentThreadId); // "thread-abc-123"
```

### Characteristics

✅ **Persistent** - Sessions survive indefinitely  
✅ **Automatic** - Codex SDK manages session state  
✅ **Reliable** - State stored by OpenAI's servers  
✅ **No limit** - Can resume sessions days later  

### Use Cases

- Long-running development sessions
- Iterative code reviews
- Projects requiring deep context

---

## CloudRuntime: VM-Lifetime Sessions

### How It Works

CloudRuntime executes tasks on a remote GCE VM. Sessions are **cached in VM memory** and persist only while the VM is running.

```typescript
import { Agent, run, CloudRuntime } from '@testbase/agents';

const agent = new Agent({
  agentType: 'computer',
  runtime: new CloudRuntime({ debug: true }),
  workspace: './my-project'
});

// Task 1
const result1 = await run(agent, 'Create app.py');
console.log(result1.sessionId); // "019a00ce-0675-7041-9754-e57604c1a2f0"

// Task 2 - continues same session (if VM still running)
await run(agent, 'Add error handling to app.py');
// Same session continues ✓
```

### Characteristics

⚠️ **VM-Lifetime** - Sessions last as long as the VM is running  
⚠️ **Memory-Based** - Cached in-memory, not persisted to disk  
✅ **Fast** - No disk I/O for session management  
⚠️ **Lost on Restart** - VM restart clears all sessions  

### What Happens on VM Restart

When the VM restarts (deployment, crash, manual restart):

1. **In-memory cache is cleared**
2. **Session metadata persists** (saved to GCS via gcsfuse)
3. **New requests with old sessionId are detected**
4. **Warning is logged** with previous session info
5. **Fresh session is started**

```json
// Logged when session found in GCS but not in memory:
{
  "level": "warn",
  "message": "Session found in GCS but not in memory (VM restart?)",
  "sessionId": "019a00ce-0675-7041-9754-e57604c1a2f0",
  "threadId": "thread_xyz",
  "lastActivity": "2025-10-20T10:30:00Z"
}
```

### Session Metadata

CloudRuntime saves session metadata to GCS for audit trail:

```
gs://testbase-workspaces/.sessions/{sessionId}.json
```

**Metadata includes:**
- Session ID and Thread ID
- Workspace ID
- Last activity timestamp
- Task count
- Creation time

This metadata:
✅ Survives VM restarts  
✅ Provides audit trail  
✅ Helps debugging  
❌ Does NOT restore actual session state  

---

## Comparison Table

| Feature | LocalRuntime | CloudRuntime |
|---------|--------------|--------------|
| **Session Persistence** | Indefinite | VM lifetime |
| **Survives Process Restart** | Yes (SDK managed) | No (memory cache) |
| **Session Metadata** | Managed by SDK | Saved to GCS |
| **Best For** | Long-running projects | Scalable task execution |
| **Typical Duration** | Days/weeks | Hours |

---

## Best Practices

### When to Use LocalRuntime

```typescript
// Long-running development sessions
// Multi-day projects with deep context
const runtime = new LocalRuntime();
```

**Use LocalRuntime when:**
- Working on the same project across multiple days
- Building complex features requiring lots of context
- Running locally on your development machine
- Session persistence is critical

### When to Use CloudRuntime

```typescript
// Scalable, ephemeral task execution
// One-off or short-duration tasks
const runtime = new CloudRuntime({ debug: true });
```

**Use CloudRuntime when:**
- Running many tasks in parallel
- Executing one-off code changes
- Workspace needs to be accessible to multiple users
- Don't need multi-day session continuity

### Hybrid Approach

For the best of both worlds, use LocalRuntime for development and CloudRuntime for production execution:

```typescript
// Development: Use LocalRuntime for iterative work
const devAgent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './my-project'
});

// Multi-turn development session
await run(devAgent, 'Create initial structure');
await run(devAgent, 'Add tests');
await run(devAgent, 'Fix bugs');
// Context preserved across all tasks

// Production: Use CloudRuntime for one-off executions
const prodAgent = new Agent({
  agentType: 'computer',
  runtime: new CloudRuntime(),
  workspace: './my-project'
});

// Single deployment task
await run(prodAgent, 'Deploy to production');
```

---

## Troubleshooting

### Session Lost After VM Restart

**Problem:** Your sessionId no longer works after VM restart.

**Solution:** This is expected behavior. Check logs for session metadata:

```bash
# View session metadata
gsutil cat gs://testbase-workspaces/.sessions/{sessionId}.json

# Check VM restart time
gcloud compute ssh testbase-ubuntu-vm --command='uptime'
```

### Manual Session Reset

To explicitly start a fresh session:

```typescript
agent.resetSession();
await run(agent, 'Start fresh');
```

### Session Continuity Testing

Test session continuity:

```bash
# Run the session continuity test
node testbase-agents/examples/cloud-test/test-cloud-continuity.mjs
```

---

## Implementation Details

### LocalRuntime Session Management

```typescript
// Managed by Codex SDK
const codex = new Codex({ apiKey: '...' });
const thread = codex.startThread({ workingDirectory: '...' });

// Thread object persists in SDK
await thread.run(task1);
await thread.run(task2); // Same thread
```

### CloudRuntime Session Management

```typescript
// Server-side (VM)
const threadCache = new Map<string, any>();

// Cache thread in memory
threadCache.set(sessionId, thread);

// Resume from cache
if (threadCache.has(sessionId)) {
  thread = threadCache.get(sessionId);
}

// Save metadata to GCS (audit trail only)
await writeFile(
  `/mnt/workspaces/.sessions/${sessionId}.json`,
  JSON.stringify(metadata)
);
```

---

## FAQ

**Q: Can I resume a CloudRuntime session after VM restart?**  
A: No. CloudRuntime sessions are in-memory only. Session metadata persists for audit purposes, but the session itself cannot be resumed.

**Q: How long do CloudRuntime sessions last?**  
A: Until the VM restarts. Typically hours to days, depending on deployment frequency.

**Q: Can I make CloudRuntime sessions fully persistent?**  
A: Not currently. For persistent sessions, use LocalRuntime. CloudRuntime prioritizes simplicity and scalability over persistence.

**Q: What happens if I send the same sessionId after VM restart?**  
A: CloudRuntime detects this, logs a warning with the old session metadata, and starts a fresh session.

**Q: Is session metadata deleted?**  
A: No. Session metadata is stored in GCS and persists indefinitely for audit purposes.

---

## Summary

- **LocalRuntime**: Fully persistent sessions, managed by Codex SDK
- **CloudRuntime**: VM-lifetime sessions with GCS metadata for audit trail
- **Choose based on needs**: Development (Local) vs Production (Cloud)
- **Both support session continuity**: Just with different persistence guarantees

For most users, CloudRuntime's VM-lifetime persistence is sufficient, as tasks typically complete within a single session. For long-running development, LocalRuntime provides full persistence.
