# Testbase Examples

This directory contains examples showing how to use the Testbase Agents SDK with different agent types and execution modes.

## Available Examples

### 1. Hello World - Session Continuity (`hello-world.mjs`)

Demonstrates the core feature of **automatic session continuity** with computer agents. Shows how multiple `run()` calls automatically maintain context without manual session management.

```bash
cd testbase-agents
pnpm install
pnpm build
node ./examples/testbase/hello-world.mjs
```

**Key concepts shown:**
- Computer agent with LocalRuntime
- Automatic session continuity across multiple runs
- Thread ID tracking
- Session reset functionality

**Code snippet:**
```js
import { Agent, run, LocalRuntime } from "computer-agents";

const agent = new Agent({
  name: "Developer",
  agentType: "computer",
  runtime: new LocalRuntime(),
  workspace: "/absolute/path/to/repo",
});

// First run - creates new session
await run(agent, "Create helloWorld.py");

// Second run - automatically continues same session!
await run(agent, "Add error handling to helloWorld.py");

console.log(agent.currentThreadId); // Same thread ID for both runs
```

### 2. Multi-Agent Workflow (`multi-agent-workflow.mjs`)

Demonstrates how to compose **multiple agents** (LLM + Computer) into a workflow using manual composition. Shows the pattern: Planner → Executor → Reviewer.

```bash
cd testbase-agents
pnpm install
pnpm build
node ./examples/testbase/multi-agent-workflow.mjs
```

**Key concepts shown:**
- LLM agents for planning and review
- Computer agent for execution
- Manual workflow composition (no magic!)
- Real-world task delegation pattern

**Code snippet:**
```js
// LLM agent creates plan
const planner = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Create detailed implementation plans.'
});

// Computer agent executes plan
const executor = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './tmp/workspace',
});

// LLM agent reviews result
const reviewer = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Review code quality and correctness.'
});

// Manual workflow
const plan = await run(planner, `Plan: ${task}`);
const code = await run(executor, plan.finalOutput);
const review = await run(reviewer, `Review: ${code.finalOutput}`);
```

### 3. Runtime Comparison - Local vs Cloud (`runtime-comparison.mjs`)

Demonstrates the **runtime abstraction** that enables seamless switching between local and cloud execution. Same agent code, different runtime.

```bash
cd testbase-agents
pnpm install
pnpm build

# Local execution
node ./examples/testbase/runtime-comparison.mjs local

# Cloud execution (requires TESTBASE_API_KEY)
export TESTBASE_API_KEY=your-key
node ./examples/testbase/runtime-comparison.mjs cloud
```

**Key concepts shown:**
- Runtime abstraction (LocalRuntime vs CloudRuntime)
- Identical agent interface for both modes
- Performance comparison
- Cloud configuration

**Code snippet:**
```js
import { Agent, run, LocalRuntime, CloudRuntime } from "computer-agents";

// Choose runtime based on environment
const runtime = mode === 'cloud'
  ? new CloudRuntime({ debug: true })
  : new LocalRuntime();

// Same agent code works with both runtimes!
const agent = new Agent({
  agentType: 'computer',
  runtime,
  workspace: './tmp/workspace',
});

const result = await run(agent, "Create app.py");
```

### 4. Cloud Execution (`cloud-execution.mjs`)

Demonstrates **end-to-end cloud execution** with CloudRuntime. Shows workspace synchronization, session continuity in the cloud, and comprehensive error handling.

```bash
cd testbase-agents
pnpm install
pnpm build

# Requires cloud infrastructure running
export OPENAI_API_KEY=your-key
export TESTBASE_API_URL=http://your-vm-ip:8080  # Optional, has default
node ./examples/testbase/cloud-execution.mjs
```

**Key concepts shown:**
- CloudRuntime configuration and setup
- Automatic workspace upload/download
- Session continuity in cloud environment
- Error handling for network/timeout issues
- Performance monitoring

**Code snippet:**
```js
import { Agent, run, CloudRuntime } from "computer-agents";

// Create CloudRuntime with configuration
const runtime = new CloudRuntime({
  debug: true,      // Show detailed logs
  timeout: 600000,  // 10 minutes
});

const agent = new Agent({
  agentType: 'computer',
  runtime,
  workspace: './my-project',
});

// Execute tasks - workspace auto-syncs to cloud
const result1 = await run(agent, "Create calculator.py with add/subtract");
const result2 = await run(agent, "Add unit tests");  // Same session!

console.log(`Session maintained: ${agent.currentThreadId}`);
```

**What happens:**
1. Local workspace uploaded to GCS
2. Task executed on GCE VM via Codex SDK
3. Results synced back to local workspace
4. Thread ID maintained for session continuity

### 5. MCP Integration (`mcp-integration.mjs`)

Demonstrates **Model Context Protocol (MCP) server integration** with the unified configuration that works for both LLM and computer agents.

```bash
cd testbase-agents
pnpm install
pnpm build

# Install MCP server (example)
npm install -g @modelcontextprotocol/server-filesystem

export OPENAI_API_KEY=your-key
node ./examples/testbase/mcp-integration.mjs
```

**Key concepts shown:**
- Unified MCP configuration for all agent types
- stdio MCP servers (local processes)
- HTTP MCP servers (remote APIs)
- Automatic conversion for each agent type
- Configuration validation

**Code snippet:**
```js
import { Agent, run, LocalRuntime } from "computer-agents";

// Unified MCP configuration - works for ANY agent type!
const mcpServers = [
  {
    type: 'stdio',
    name: 'filesystem',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/workspace']
  },
  {
    type: 'http',
    name: 'notion',
    url: 'https://notion-mcp.example.com/mcp',
    bearerToken: process.env.NOTION_TOKEN
  }
];

// Works with LLM agents
const llmAgent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  mcpServers  // ← Converted to function tools
});

// Works with computer agents
const computerAgent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers  // ← Passed to Codex SDK
});
```

**What happens:**
- For LLM agents: SDK converts MCP servers → function tools
- For computer agents: SDK passes MCP servers → Codex SDK
- Same config, automatic conversion!

## Agent Types

Testbase uses **only two agent types** - simple and clear:

| Type | Execution | Use Cases |
|------|-----------|-----------|
| `'llm'` | OpenAI API | Chat, reasoning, planning, reviewing |
| `'computer'` | Codex SDK | Code changes, file operations, terminal commands |

**Key principle:** Orchestration roles (planner, worker, reviewer) are **workflow patterns**, not agent types.

## Runtime Abstraction

Runtimes determine **where** and **how** computer agents execute:

- **`LocalRuntime`** - Executes on your local machine via Codex SDK
- **`CloudRuntime`** - Executes in cloud GCE VM with workspace sync

**Benefits:**
- Switch between local and cloud by changing one line
- No code changes needed
- Automatic workspace synchronization (CloudRuntime)
- Same session continuity guarantees

## MCP Server Integration

Use the **unified MCP configuration** that works for both agent types:

```js
import { Agent } from "computer-agents";

const mcpServers = [
  {
    type: 'stdio',
    name: 'filesystem',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/workspace']
  },
  {
    type: 'http',
    name: 'notion',
    url: 'https://notion-mcp.example.com/mcp',
    bearerToken: process.env.NOTION_TOKEN
  }
];

// Works for both LLM and computer agents!
const llmAgent = new Agent({
  agentType: 'llm',
  mcpServers
});

const computerAgent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers
});
```

## Environment Setup

Required environment variables:

```bash
# Required for all operations
export OPENAI_API_KEY=your-openai-key

# Optional - for cloud execution
export TESTBASE_API_KEY=your-testbase-key  # Get from Testbase Cloud
export TESTBASE_API_URL=http://your-vm-ip:8080  # Default provided
```

## Common Patterns

### Pattern 1: Session Continuity

```js
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
});

await run(agent, 'Create app.py');           // New session
await run(agent, 'Add error handling');      // Continues session
await run(agent, 'Add tests');               // Still same session

agent.resetSession();
await run(agent, 'Start new project');       // New session
```

### Pattern 2: Local → Cloud Migration

```js
// Development (local)
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './repo',
});

// Production (cloud) - just change runtime!
const agent = new Agent({
  agentType: 'computer',
  runtime: new CloudRuntime(),
  workspace: './repo',  // Auto-synced to cloud
});
```

### Pattern 3: Multi-Agent Orchestration

```js
// Define specialized agents
const agents = {
  planner: new Agent({ agentType: 'llm', instructions: '...' }),
  executor: new Agent({ agentType: 'computer', runtime: new LocalRuntime() }),
  reviewer: new Agent({ agentType: 'llm', instructions: '...' }),
};

// Compose workflow manually
async function workflow(task) {
  const plan = await run(agents.planner, `Plan: ${task}`);
  const result = await run(agents.executor, plan.finalOutput);
  const review = await run(agents.reviewer, `Review: ${result.finalOutput}`);
  return review;
}
```

## Troubleshooting

### "OPENAI_API_KEY not set"
```bash
export OPENAI_API_KEY=sk-...
```

### "Workspace path must be absolute"
Use `resolve()` to create absolute paths:
```js
import { resolve } from 'path';
const workspace = resolve('./my-repo');
```

### Cloud execution fails with 401
Check your API key:
```bash
export TESTBASE_API_KEY=your-key
# Or verify the default URL is correct:
export TESTBASE_API_URL=http://34.170.205.13:8080
```

### Session continuity not working
Ensure you're using the **same agent instance** across runs:
```js
// ✅ Correct - same agent
const agent = new Agent({ agentType: 'computer', runtime: new LocalRuntime() });
await run(agent, 'Task 1');
await run(agent, 'Task 2'); // Continues session

// ❌ Wrong - different agents
await run(new Agent({...}), 'Task 1');
await run(new Agent({...}), 'Task 2'); // New session!
```

## Further Reading

- **[APPROACHES.md](./APPROACHES.md)** - Detailed comparison of execution approaches
- **[API_DOCUMENTATION.md](../../API_DOCUMENTATION.md)** - Cloud API reference
- **[CLAUDE.md](../../../CLAUDE.md)** - Architecture and design principles
