# Computer Agent Execution in Testbase

This guide explains how to use computer-use agents in the testbase-agents SDK.

## Overview

Testbase provides a clean, unified approach for computer-use agents:
- **Computer agents** (`agentType: 'computer'`) - Execute via Codex SDK for code changes
- **LLM agents** (`agentType: 'llm'`) - Execute via OpenAI API for reasoning and planning
- **MCP servers** - Add external tools to any agent type

---

## Computer Agents

Computer agents use the Codex SDK to perform code changes, file operations, and terminal commands.

### Basic Usage

```typescript
import { Agent, run, LocalRuntime } from 'computer-agents';

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),  // or CloudRuntime()
  workspace: './repo',
  instructions: 'You are a coding assistant'
});

const result = await run(agent, 'Implement authentication');
```

### Execution Flow

```
User → Agent → Runtime → Codex SDK → Result
```

### Characteristics

- ✅ Fast execution (direct to Codex SDK)
- ✅ Lower cost (only Codex usage)
- ✅ Automatic session continuity
- ✅ Perfect for coding tasks

### Runtime Options

**LocalRuntime** - Execute locally via Codex CLI:
```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime({ debug: true }),
  workspace: './repo'
});
```

**CloudRuntime** - Execute in cloud containers:
```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new CloudRuntime({
    apiKey: process.env.TESTBASE_API_KEY,
    region: 'us-central1'
  }),
  workspace: './repo'
});
```

---

## Adding Tools with MCP Servers

MCP (Model Context Protocol) servers allow you to add external tools to agents.

### For Computer Agents

Add MCP servers directly to the agent configuration:

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './repo',
  mcpServers: [
    {
      type: 'stdio',
      name: 'filesystem',
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '/data']
    },
    {
      type: 'http',
      name: 'notion',
      url: 'https://notion-mcp.example.com/mcp',
      bearerToken: process.env.NOTION_TOKEN
    }
  ]
});
```

MCP servers are passed to the Codex SDK, which handles the integration automatically.

### For LLM Agents

The same MCP server configs work for LLM agents:

```typescript
const agent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  mcpServers: [
    {
      type: 'http',
      name: 'jira',
      url: 'https://jira-mcp.example.com/mcp',
      bearerToken: process.env.JIRA_TOKEN
    }
  ]
});
```

MCP servers are converted to function tools that the LLM can call.

---

## Multi-Agent Workflows

Build complex workflows by composing LLM and computer agents:

```typescript
// LLM creates plan
const planner = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Create detailed implementation plans'
});

// Computer agent executes
const executor = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './repo',
  instructions: 'Execute code changes'
});

// LLM reviews
const reviewer = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Review code for quality'
});

// Manual workflow
const task = "Add user authentication";
const plan = await run(planner, `Plan: ${task}`);
const code = await run(executor, plan.finalOutput);
const review = await run(reviewer, `Review: ${code.finalOutput}`);
```

---

## Session Continuity

Computer agents automatically maintain session continuity across multiple `run()` calls:

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime()
});

// First task - creates new session
await run(agent, 'Create app.py');

// Second task - continues same session automatically!
await run(agent, 'Add error handling to app.py');

// Check current session
console.log(agent.currentThreadId);  // thread-abc-123

// Reset for new session
agent.resetSession();
await run(agent, 'Start new project');  // New session
```

---

## Example Scenarios

### Scenario 1: Pure Coding Task

"Fix all TypeScript errors"

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime()
});

await run(agent, 'Fix all TypeScript errors');
```

### Scenario 2: Coding + External Data

"Read spec from Notion and implement it"

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers: [
    {
      type: 'http',
      name: 'notion',
      url: process.env.NOTION_MCP_URL,
      bearerToken: process.env.NOTION_TOKEN
    }
  ]
});

await run(agent, 'Read the spec from Notion page X and implement it');
```

### Scenario 3: LLM Orchestrating Multiple Tools

"Analyze database, generate report, send via email"

```typescript
const agent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  mcpServers: [
    databaseMcpServer,
    emailMcpServer,
    reportGeneratorMcpServer
  ]
});

await run(agent, 'Query sales data, generate monthly report, email to team@company.com');
```

---

## Decision Guide

### Use Computer Agent When:
- ✅ Need to make code changes
- ✅ File operations required
- ✅ Terminal commands needed
- ✅ Want fast, cost-effective execution

### Use LLM Agent When:
- ✅ Pure reasoning/planning task
- ✅ No code changes needed
- ✅ Orchestrating multiple API tools
- ✅ Complex decision trees

### Use MCP Servers When:
- ✅ Need external tools (databases, APIs, etc.)
- ✅ Same config works for both agent types
- ✅ Automatically integrated by SDK

---

## Summary

**Simplified Architecture:**
- Two agent types: `'llm'` and `'computer'`
- One MCP server type: `McpServerConfig`
- Two runtimes: `LocalRuntime` and `CloudRuntime`
- Manual composition: Build workflows explicitly

**Key Benefits:**
- Clean, predictable API
- No magic orchestration layers
- Runtime abstraction (local ↔ cloud)
- Automatic session continuity
- Unified MCP server configuration

**Examples:**
- `hello-world.mjs` - Basic computer agent with session continuity
- `multi-agent-workflow.mjs` - LLM planner → Computer executor → LLM reviewer
- `runtime-comparison.mjs` - LocalRuntime vs CloudRuntime
