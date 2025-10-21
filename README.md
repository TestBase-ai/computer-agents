# Computer Agents SDK

[![npm version](https://badge.fury.io/js/computer-agents.svg)](https://www.npmjs.com/package/computer-agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript SDK for building AI agents with **unified local and cloud execution**. Built on OpenAI Agents SDK and enhanced with Codex SDK integration for computer-use capabilities.

## Overview

Computer Agents SDK provides a **unified interface** for building multi-agent systems that combine LLM reasoning with real computer use:

- **🎯 Two Agent Types** - `'llm'` for reasoning, `'computer'` for execution
- **🔄 Runtime Abstraction** - Seamless local ↔ cloud switching
- **⚡️ Automatic Session Continuity** - Multi-turn conversations work automatically
- **🔌 Unified MCP Config** - Single configuration for all agent types
- **📦 Manual Composition** - Build custom workflows explicitly
- **☁️ Cloud Execution** - GCE-based with GCS workspace sync and pay-per-token billing
- **✨ Professional** - Zero type assertions, clean abstractions, comprehensive tests

## Installation

```bash
npm install computer-agents
```

## Quick Start

### Computer Agent (Local Execution)

```typescript
import { Agent, run, LocalRuntime } from 'computer-agents';

const agent = new Agent({
  name: "Developer",
  agentType: "computer",
  runtime: new LocalRuntime(),
  instructions: "You are an expert developer."
});

const result = await run(agent, "Create hello.py that prints 'Hello World'");
console.log(result.finalOutput);
```

### Computer Agent (Cloud Execution)

```typescript
import { Agent, run, CloudRuntime } from 'computer-agents';

const agent = new Agent({
  name: "Developer",
  agentType: "computer",
  runtime: new CloudRuntime({ debug: true }),
  instructions: "You are an expert developer."
});

const result = await run(agent, "Create hello.py that prints 'Hello World'");
console.log(result.finalOutput);
```

### LLM Agent

```typescript
import { Agent, run } from 'computer-agents';

const agent = new Agent({
  name: "Planner",
  agentType: "llm",
  model: "gpt-4o",
  instructions: "You create detailed implementation plans."
});

const result = await run(agent, "Plan how to add user authentication");
console.log(result.finalOutput);
```

## Core Concepts

### Agent Types

Testbase uses **only two agent types** for maximum simplicity:

```typescript
type AgentType = 'llm' | 'computer';
```

| Type | Execution | Use Cases |
|------|-----------|-----------|
| `'llm'` | OpenAI API | Chat, reasoning, planning, reviewing |
| `'computer'` | Codex SDK | Code changes, file operations, terminal commands |

**Key principle:** Orchestration roles (planner, worker, reviewer) are **workflow patterns**, not agent types.

### Runtime Abstraction

Runtimes determine **where** and **how** computer agents execute:

```typescript
interface Runtime {
  readonly type: 'local' | 'cloud';
  execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult>;
  cleanup?(): Promise<void>;
}
```

**LocalRuntime** - Execute on your local machine:
```typescript
const runtime = new LocalRuntime();
```

**CloudRuntime** - Execute in cloud containers (GCE):
```typescript
const runtime = new CloudRuntime({
  debug: true,      // Optional: show detailed logs
  timeout: 600000,  // Optional: 10 minutes default
});
```

**Key benefit:** Switch between local and cloud by changing one line of code.

### Session Continuity

Multiple `run()` calls automatically maintain context:

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
});

await run(agent, 'Create app.py');           // New session
await run(agent, 'Add error handling');      // Continues same session!
await run(agent, 'Add tests');               // Still same session!

console.log(agent.currentThreadId);          // Thread ID maintained

agent.resetSession();                         // Start fresh
await run(agent, 'Start new project');       // New session
```

### MCP Server Integration

Both agent types support Model Context Protocol (MCP) servers with **unified configuration**:

```typescript
import type { McpServerConfig } from 'computer-agents';

const mcpServers: McpServerConfig[] = [
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
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers  // ← Automatic conversion
});
```

The SDK automatically converts MCP configs to the appropriate format:
- **LLM agents**: MCP servers → function tools
- **Computer agents**: MCP servers → Codex SDK config

## Multi-Agent Workflows

Build custom workflows by composing agents manually:

```typescript
import { Agent, run, LocalRuntime } from 'computer-agents';

// LLM creates plan
const planner = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Create detailed implementation plans.'
});

// Computer agent executes plan
const executor = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  instructions: 'Execute implementation plans.'
});

// LLM reviews result
const reviewer = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Review implementations for quality.'
});

// Manual workflow composition
const task = "Add user authentication";
const plan = await run(planner, `Plan: ${task}`);
const code = await run(executor, plan.finalOutput);
const review = await run(reviewer, `Review: ${code.finalOutput}`);

console.log('Review:', review.finalOutput);
```

**You control the workflow** - No magic orchestration layer, just explicit composition.

## Examples

Comprehensive examples in `examples/testbase/`:

```bash
cd testbase-agents
pnpm install
pnpm build

# Hello World - Session Continuity
node ./examples/testbase/hello-world.mjs

# Multi-Agent Workflow - Planner → Executor → Reviewer
node ./examples/testbase/multi-agent-workflow.mjs

# Runtime Comparison - Local vs Cloud
node ./examples/testbase/runtime-comparison.mjs local
node ./examples/testbase/runtime-comparison.mjs cloud  # Requires API key

# Cloud Execution - Full cloud workflow
export TESTBASE_API_URL=http://34.170.205.13:8080  # Optional, has default
node ./examples/testbase/cloud-execution.mjs

# MCP Integration - Unified MCP configuration
node ./examples/testbase/mcp-integration.mjs
```

See [examples/testbase/README.md](./examples/testbase/README.md) for detailed guide.

## Configuration

### Environment Variables

```bash
# Required for all LLM agents and computer agents (Codex SDK uses OpenAI)
OPENAI_API_KEY=your-openai-key

# Optional - for cloud runtime (has default)
TESTBASE_API_URL=http://34.170.205.13:8080  # Default GCE VM
```

### Agent Configuration

```typescript
interface AgentConfiguration {
  // Required
  name?: string;
  agentType?: 'llm' | 'computer';

  // LLM-specific (agentType: 'llm')
  model?: string;              // Required for LLM agents
  instructions?: string;
  tools?: Tool[];

  // Computer-specific (agentType: 'computer')
  runtime?: Runtime;           // Required for computer agents
  workspace?: string;

  // Shared
  mcpServers?: McpServerConfig[];
}
```

## Architecture

### Project Structure

```
testbase-agents/
├── packages/
│   ├── agents-core/              # Core SDK
│   │   ├── src/
│   │   │   ├── agent.ts          # Agent class
│   │   │   ├── run.ts            # Run loop
│   │   │   ├── runtime/          # Runtime abstraction
│   │   │   │   ├── LocalRuntime.ts
│   │   │   │   └── CloudRuntime.ts
│   │   │   ├── codex/            # Codex SDK integration
│   │   │   ├── cloud/            # Cloud API client
│   │   │   ├── storage/          # Session storage
│   │   │   ├── mcpConfig.ts      # Unified MCP types
│   │   │   └── mcpConverters.ts  # MCP converters
│   │   └── package.json
│   │
│   ├── agents/                   # Main package export
│   ├── agents-openai/            # OpenAI provider
│   ├── agents-realtime/          # Realtime voice agents
│   └── cloud-infrastructure/     # GCE cloud execution server
│
├── examples/testbase/            # Working examples
└── docs/                         # Documentation
```

### Runtime Flow

**LocalRuntime:**
```
run() → runtime.execute() → Codex SDK (local) → result
```

**CloudRuntime:**
```
run() → runtime.execute() →
  1. Upload workspace to GCS
  2. POST to GCE VM
  3. VM downloads from GCS
  4. VM executes via Codex SDK
  5. VM uploads changes to GCS
  6. Download workspace from GCS
→ result
```

### Execution Optimization

Computer agents **bypass the model provider** entirely for maximum performance:

```typescript
// Computer agents execute directly via runtime
if (agent.agentType === 'computer') {
  return runtime.execute(config);  // No LLM intermediary
}

// LLM agents use standard OpenAI flow
return modelProvider.getResponse(config);
```

**Benefits:**
- Faster execution (no extra LLM hop)
- Lower cost (no additional API calls)
- Deterministic (no LLM variability)

## Cloud Infrastructure

Testbase provides GCE-based cloud execution for computer agents:

### Architecture

- **GCS Bucket** - Source of truth for workspaces (`gs://testbase-workspaces`)
- **GCE VM** - Runs Express server with Codex SDK execution (IP: 34.170.205.13)
- **CloudRuntime** - Handles upload → execute → download flow

### Features

- **Billing System** - Pay-per-token with credit management
- **API Keys** - Database-backed authentication (standard + internal keys)
- **Budget Protection** - Daily/monthly spending limits
- **Session Storage** - Optional GCS persistence

### Usage

```typescript
import { Agent, run, CloudRuntime } from 'computer-agents';

const runtime = new CloudRuntime({ debug: true });

const agent = new Agent({
  agentType: 'computer',
  runtime,
  workspace: './my-project'
});

const result = await run(agent, 'Create REST API with Express');
console.log(result.finalOutput);
```

See [packages/cloud-infrastructure/README.md](./packages/cloud-infrastructure/README.md) for deployment details.

## Storage Abstractions

Optional session and workspace storage backends:

```typescript
import {
  LocalSessionStorage,
  GCSSessionStorage,
  WorkspaceSync
} from 'computer-agents';

// Local filesystem storage
const localStorage = new LocalSessionStorage({
  basePath: '/path/to/sessions'
});

// Google Cloud Storage
const gcsStorage = new GCSSessionStorage({
  bucket: 'testbase-sessions',
  prefix: 'sessions'
});

// Workspace synchronization
const sync = new WorkspaceSync({
  conflictResolution: 'newest',
  excludePatterns: ['node_modules/**', '.git/**']
});
```

**Note:** These are optional - most users won't need custom storage configuration.

## Development

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter computer-agents-core build

# Run tests
pnpm test

# Clean build artifacts
pnpm clean
```

## API Reference

### Agent

```typescript
class Agent {
  constructor(config: AgentConfiguration);
  currentThreadId: string | undefined;
  resetSession(): void;
}
```

### run()

```typescript
function run(
  agent: Agent,
  task: string,
  options?: RunOptions
): Promise<RunResult>;
```

### LocalRuntime

```typescript
class LocalRuntime implements Runtime {
  constructor(config?: LocalRuntimeConfig);
  readonly type: 'local';
  execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult>;
}
```

### CloudRuntime

```typescript
class CloudRuntime implements Runtime {
  constructor(config?: CloudRuntimeConfig);
  readonly type: 'cloud';
  execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult>;
  cleanup(): Promise<void>;
}
```

## Best Practices

### When to Use LocalRuntime vs CloudRuntime

**Use LocalRuntime when:**
- Development and testing
- Fast iteration cycles needed
- Working with local files/tools
- No cloud infrastructure required

**Use CloudRuntime when:**
- Production deployments
- Need isolated execution environment
- Team collaboration on shared workspaces
- Budget tracking and billing required

### Session Management

Always use the **same agent instance** for session continuity:

```typescript
// ✅ Correct - same agent
const agent = new Agent({ agentType: 'computer', runtime: new LocalRuntime() });
await run(agent, 'Task 1');
await run(agent, 'Task 2');  // Continues session

// ❌ Wrong - different agents
await run(new Agent({...}), 'Task 1');
await run(new Agent({...}), 'Task 2');  // New session!
```

### Error Handling

Always cleanup cloud resources:

```typescript
const runtime = new CloudRuntime();
const agent = new Agent({ agentType: 'computer', runtime });

try {
  await run(agent, task);
} finally {
  await runtime.cleanup();  // Important for cloud resources
}
```

## Differences from OpenAI Agents SDK

This SDK extends OpenAI's Agents SDK with:

1. **Computer-use agent type** - Direct Codex SDK integration
2. **Runtime abstraction** - Local and cloud execution modes
3. **Session continuity** - Automatic thread management
4. **Unified MCP config** - Single configuration for all agent types
5. **Cloud infrastructure** - GCE-based execution with billing
6. **Optimized execution** - Computer agents bypass model provider

## Performance

### LocalRuntime
- **Cold start**: <1 second
- **Warm execution**: <100ms overhead
- **Memory**: Depends on Codex SDK and model

### CloudRuntime
- **Cold start**: 30-45 seconds (includes workspace sync)
- **Warm execution**: ~5 seconds
- **Storage**: Persistent workspace in GCS

## Documentation

- [Architecture Guide](../docs/ARCHITECTURE.md)
- [Cloud Infrastructure](./packages/cloud-infrastructure/README.md)
- [Examples Guide](./examples/testbase/README.md)
- [CLAUDE.md](../CLAUDE.md) - Development guide

## Troubleshooting

### "OPENAI_API_KEY not set"
```bash
export OPENAI_API_KEY=sk-...
```

### "Workspace path must be absolute"
Use `resolve()` to create absolute paths:
```typescript
import { resolve } from 'path';
const workspace = resolve('./my-repo');
```

### Cloud execution fails with 401
Check your API key (or use default which doesn't require authentication):
```bash
export TESTBASE_API_URL=http://34.170.205.13:8080  # Default
```

### Session continuity not working
Ensure you're using the **same agent instance** across runs.

## License

MIT

## Credits

- Built on [OpenAI Agents SDK](https://github.com/openai/openai-agents-sdk)
- Integrates with [Codex SDK](https://github.com/anthropics/claude-code)
- Cloud infrastructure powered by Google Cloud Platform

## Support

- **Issues**: [GitHub Issues](https://github.com/testbase/testbase-agents/issues)
- **Documentation**: See docs/ directory
- **Examples**: See examples/testbase/ directory
