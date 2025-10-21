# New Examples Guide

## Quick Reference for Cloud Execution and MCP Integration

---

## 🌐 Cloud Execution Example

**File:** `cloud-execution.mjs`

**What it demonstrates:**
- End-to-end cloud execution with CloudRuntime
- Automatic workspace synchronization (local ↔ cloud)
- Session continuity in cloud environment
- Comprehensive error handling
- Performance monitoring

**Prerequisites:**
```bash
# Required
export OPENAI_API_KEY=sk-...

# Optional (has default)
export TESTBASE_API_URL=http://your-vm-ip:8080
```

**Run:**
```bash
cd testbase-agents
pnpm install && pnpm build
node ./examples/testbase/cloud-execution.mjs
```

**Key Code Pattern:**
```javascript
import { Agent, run, CloudRuntime } from 'computer-agents';

// Step 1: Create CloudRuntime
const runtime = new CloudRuntime({
  debug: true,
  timeout: 600000,  // 10 minutes
});

// Step 2: Create agent with CloudRuntime
const agent = new Agent({
  agentType: 'computer',
  runtime,
  workspace: './my-project',
});

// Step 3: Execute tasks (automatic sync!)
const result1 = await run(agent, "Create calculator.py");
const result2 = await run(agent, "Add tests");  // Same session

console.log(agent.currentThreadId);  // Session maintained
```

**What Happens Under the Hood:**
1. **Upload Phase:**
   - Local workspace → compressed tarball
   - Upload to GCS via cloud API
   - Creates unique workspace ID

2. **Execution Phase:**
   - Task sent to GCE VM
   - Codex SDK executes in cloud
   - Thread ID tracked for continuity

3. **Download Phase:**
   - Results synced from GCS
   - Local workspace updated
   - Files appear automatically

**Error Handling:**
```javascript
try {
  const result = await run(agent, task);
} catch (error) {
  if (error.message?.includes('ECONNREFUSED')) {
    // Cloud API not reachable
    console.log('Check VM is running and firewall allows connections');
  } else if (error.message?.includes('timeout')) {
    // Task took too long
    console.log('Increase timeout or optimize task');
  } else if (error.message?.includes('401')) {
    // Authentication failed
    console.log('Check API key configuration');
  }
}
```

**Performance Tips:**
- Default timeout: 600s (10 minutes)
- Increase for long tasks: `timeout: 900000` (15 minutes)
- Monitor network latency for large workspaces
- Session continuity reduces overhead (reuses thread)

**Troubleshooting:**

| Issue | Solution |
|-------|----------|
| Connection refused | Check VM is running, verify API URL |
| 401 Unauthorized | Verify API key is set correctly |
| Timeout | Increase `timeout` in CloudRuntime config |
| Files not syncing | Check GCS permissions, verify workspace path |
| Session lost | Check VM didn't restart (thread cache cleared) |

---

## 🔌 MCP Integration Example

**File:** `mcp-integration.mjs`

**What it demonstrates:**
- Unified MCP configuration for all agent types
- stdio MCP servers (local processes)
- HTTP MCP servers (remote APIs)
- Automatic conversion for LLM vs computer agents
- Configuration validation

**Prerequisites:**
```bash
# Required
export OPENAI_API_KEY=sk-...

# Install filesystem MCP server (example)
npm install -g @modelcontextprotocol/server-filesystem
```

**Run:**
```bash
cd testbase-agents
pnpm install && pnpm build
node ./examples/testbase/mcp-integration.mjs
```

**Key Code Pattern:**
```javascript
import { Agent, run, LocalRuntime } from 'computer-agents';

// Step 1: Define MCP servers (unified config!)
const mcpServers = [
  // Local stdio server
  {
    type: 'stdio',
    name: 'filesystem',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/workspace']
  },

  // Remote HTTP server
  {
    type: 'http',
    name: 'notion',
    url: 'https://notion-mcp.example.com/mcp',
    bearerToken: process.env.NOTION_TOKEN
  }
];

// Step 2: Use with LLM agent
const llmAgent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  mcpServers  // Converted to function tools
});

// Step 3: Use with computer agent (same config!)
const computerAgent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers  // Passed to Codex SDK
});
```

**Conversion Process:**

```
Unified Config (what you write):
  McpServerConfig[] = [{
    type: 'stdio',
    name: 'filesystem',
    command: 'npx',
    args: [...]
  }]

         ↓

For LLM Agents:
  SDK converts → MCPServer instances
  Tools become → Function tools
  Agent can call → read_file(), write_file(), etc.

For Computer Agents:
  SDK passes → Codex SDK format
  Tools available → Via Codex CLI MCP integration
  Agent can use → Same filesystem tools via Codex
```

**MCP Server Types:**

### stdio (Local Process)
```javascript
{
  type: 'stdio',
  name: 'my-server',
  command: 'npx',           // or 'node', 'python', etc.
  args: ['@scope/package', 'arg1', 'arg2']
}
```

**When to use:**
- Local file operations
- Git integration
- Database connections
- System tools

**Examples:**
- `@modelcontextprotocol/server-filesystem`
- `@modelcontextprotocol/server-git`
- Custom local MCP servers

### HTTP (Remote API)
```javascript
{
  type: 'http',
  name: 'my-api',
  url: 'https://api.example.com/mcp',
  bearerToken: process.env.TOKEN  // Optional
}
```

**When to use:**
- Remote APIs
- Cloud services
- Shared team resources
- Third-party integrations

**Examples:**
- Notion API wrapper
- GitHub API wrapper
- Custom HTTP MCP servers

**Validation Rules:**

✅ **Valid Config:**
```javascript
// stdio - must have command and args
{
  type: 'stdio',
  name: 'server',
  command: 'npx',
  args: ['package']
}

// HTTP - must have url
{
  type: 'http',
  name: 'server',
  url: 'https://example.com/mcp'
}
```

❌ **Invalid Config:**
```javascript
// Missing name
{ type: 'stdio', command: 'npx' }

// stdio without command
{ type: 'stdio', name: 'server', args: [...] }

// HTTP without url
{ type: 'http', name: 'server' }

// Invalid type
{ type: 'websocket', name: 'server' }
```

**Troubleshooting:**

| Issue | Solution |
|-------|----------|
| MCP server not found | Install with `npm install -g @scope/package` |
| Permission denied | Check command path and permissions |
| Connection refused (HTTP) | Verify HTTP MCP server is running |
| Tools not appearing | Check agent type and MCP config |
| Validation error | Review config structure against rules |

---

## 🎯 Comparison Table

| Feature | Cloud Execution | MCP Integration |
|---------|----------------|-----------------|
| **Purpose** | Execute in cloud environment | Add tools to agents |
| **Complexity** | Medium | Low |
| **Prerequisites** | Cloud infrastructure | MCP server package |
| **Use Case** | Heavy computation, isolation | Enhanced capabilities |
| **Session Continuity** | ✅ Maintained in cloud | ✅ Works with all agents |
| **Workspace Sync** | ✅ Automatic | N/A |
| **Agent Types** | Computer only | LLM + Computer |
| **Configuration** | CloudRuntime config | McpServerConfig array |

---

## 🚀 Next Steps

### After Cloud Execution Example:
1. ✅ Verify workspace sync works
2. ✅ Test session continuity
3. ✅ Monitor performance metrics
4. 📊 Compare with LocalRuntime
5. 🔧 Optimize timeout settings
6. 🌍 Deploy to production

### After MCP Integration Example:
1. ✅ Test with filesystem MCP server
2. ✅ Verify tool availability
3. 🔌 Try other MCP servers
4. 🏗️ Build custom MCP server
5. 🔗 Combine multiple MCP servers
6. 📚 Document available tools

---

## 📚 Additional Resources

**Cloud Execution:**
- [Cloud Infrastructure README](../../packages/cloud-infrastructure/README.md)
- [API Documentation](../../API_DOCUMENTATION.md)
- [CloudRuntime TypeScript docs](../../packages/agents-core/src/runtime/CloudRuntime.ts)

**MCP Integration:**
- [MCP Config Types](../../packages/agents-core/src/mcpConfig.ts)
- [MCP Converters](../../packages/agents-core/src/mcpConverters.ts)
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)

**General:**
- [Main README](./README.md)
- [Architecture Guide](../../../CLAUDE.md)
- [Testing Summary](../../TESTING-SUMMARY.md)

---

## ✅ Checklist

### Before Running Cloud Execution:
- [ ] OPENAI_API_KEY set
- [ ] GCE VM running
- [ ] Firewall allows port 8080
- [ ] GCS bucket accessible
- [ ] Local workspace prepared

### Before Running MCP Integration:
- [ ] OPENAI_API_KEY set
- [ ] MCP server package installed
- [ ] Test workspace created
- [ ] (Optional) HTTP MCP server running

### After Running Examples:
- [ ] Check workspace for synced files
- [ ] Verify session continuity worked
- [ ] Review logs for errors
- [ ] Note performance metrics
- [ ] Document any issues

---

**Created:** 2025-10-20
**Status:** ✅ Ready to use
**Tested:** Unit tests passing, examples verified
