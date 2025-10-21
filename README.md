# Computer Agents SDK

[![npm version](https://img.shields.io/npm/v/computer-agents.svg)](https://www.npmjs.com/package/computer-agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The first orchestration framework for parallel computer-use agents.**

Scale from 1 to 100+ agents. Run experiments in parallel. Test multiple approaches simultaneously. computer-agents enables agent workflows that were previously impossible.

## What Makes This Different

Traditional agent frameworks focus on chat-based LLM agents. computer-agents is built for **computer-use agents** that write code, run tests, and modify files—with native support for **parallel execution at scale**.

### Before computer-agents

- ❌ No parallel orchestration for computer-use agents
- ❌ Single agent, single workspace, sequential execution
- ❌ Hours to run experiments sequentially
- ❌ Limited to local machine resources

### With computer-agents

- ✅ **Parallel Orchestration** - Run 10, 50, 100+ agents simultaneously
- ✅ **Unified Interface** - Seamless local ↔ cloud execution with one config change
- ✅ **Workspace Collaboration** - Multiple agents working on the same codebase
- ✅ **Cloud Scalability** - Effortless scaling beyond local machine limits
- ✅ **Session Continuity** - Automatic multi-turn conversations

## Revolutionary Use Cases

**🔬 Scientific Experiments**
Run 20 experimental variations in parallel instead of sequentially. What took hours now takes minutes.

**🧪 ML/AI Development**
Test dozens of hyperparameter configurations simultaneously. Systematic exploration of model architectures at scale.

**⚡️ Multi-Approach Problem Solving**
Try 5 different implementation approaches in parallel. Let the agents find the best solution.

**🚀 A/B Testing at Scale**
Test multiple implementations, frameworks, or approaches concurrently. Data-driven decision making.

## Installation

```bash
npm install computer-agents
```

## Quick Start

### Local Computer Agent

```typescript
import { Agent, run, LocalRuntime } from 'computer-agents';

const agent = new Agent({
  agentType: "computer",
  runtime: new LocalRuntime(),
  workspace: "./my-project",
  instructions: "You are an expert developer."
});

const result = await run(agent, "Create a Python script that calculates fibonacci numbers");
console.log(result.finalOutput);
```

### Cloud Computer Agent (with workspace sync)

```typescript
import { Agent, run, CloudRuntime } from 'computer-agents';

const agent = new Agent({
  agentType: "computer",
  runtime: new CloudRuntime({ apiKey: process.env.TESTBASE_API_KEY }),
  workspace: "./my-project",
  instructions: "You are an expert developer."
});

const result = await run(agent, "Add unit tests to the fibonacci module");
console.log(result.finalOutput);
// Files automatically synced from cloud to local workspace
```

### Cloud-Only Mode (no local sync)

Perfect for CI/CD, experiments, and parallel tasks:

```typescript
const runtime = new CloudRuntime({
  apiKey: process.env.TESTBASE_API_KEY,
  skipWorkspaceSync: true,  // No upload/download, faster execution
});

const agent = new Agent({
  agentType: "computer",
  runtime,
  workspace: "./cloud-workspace",  // Placeholder, not synced
});

const result = await run(agent, "Build a REST API with Express");
// Executes in fresh cloud workspace, results stay in cloud
```

### Parallel Execution (The Game Changer)

Run multiple agents simultaneously:

```typescript
import { Agent, run, CloudRuntime } from 'computer-agents';

const runtime = new CloudRuntime({
  apiKey: process.env.TESTBASE_API_KEY,
  skipWorkspaceSync: true,
});

// Create 5 agents to test different approaches
const agents = [
  'Express',
  'Fastify',
  'Koa',
  'Hapi',
  'Restify'
].map(framework => new Agent({
  name: `${framework} Agent`,
  agentType: 'computer',
  runtime,
  workspace: `./test-${framework.toLowerCase()}`,
  instructions: `You are an expert in ${framework}.`
}));

// Run all 5 in parallel!
const results = await Promise.all(
  agents.map((agent, i) => run(agent, `Create a REST API with ${frameworks[i]}`))
);

// All 5 implementations complete in the time it takes to run 1
console.log('All 5 frameworks tested in parallel!');
```

### LLM Agent (for planning and reasoning)

```typescript
const planner = new Agent({
  agentType: "llm",
  model: "gpt-4o",
  instructions: "You create detailed implementation plans."
});

const plan = await run(planner, "Plan how to add user authentication");
console.log(plan.finalOutput);
```

## Core Concepts

### Agent Types

```typescript
type AgentType = 'llm' | 'computer';
```

| Type | Execution | Use Cases |
|------|-----------|-----------|
| `'llm'` | OpenAI API | Planning, reasoning, reviewing |
| `'computer'` | Codex SDK | Code, tests, file operations, terminal commands |

### Runtime Abstraction

Switch between local and cloud execution with one config change:

```typescript
// Local execution
const localRuntime = new LocalRuntime();

// Cloud execution
const cloudRuntime = new CloudRuntime({
  apiKey: process.env.TESTBASE_API_KEY
});

// Use either runtime with any agent
const agent = new Agent({
  agentType: 'computer',
  runtime: localRuntime,  // or cloudRuntime
  workspace: './project'
});
```

### Workspace Modes

**Default Mode** - Sync local ↔ cloud:
```typescript
const runtime = new CloudRuntime({
  apiKey: process.env.TESTBASE_API_KEY,
  // skipWorkspaceSync: false (default)
});
// Uploads local files, downloads results
```

**Cloud-Only Mode** - No local sync:
```typescript
const runtime = new CloudRuntime({
  apiKey: process.env.TESTBASE_API_KEY,
  skipWorkspaceSync: true,  // NEW in v0.4.6
});
// Fresh cloud workspace, no upload/download
// Perfect for CI/CD, experiments, parallel tasks
```

### Session Continuity

Agents automatically maintain context across multiple runs:

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
});

await run(agent, 'Create app.py');           // New session
await run(agent, 'Add error handling');      // Continues same session!
await run(agent, 'Add tests');               // Still same session!

console.log(agent.currentThreadId);          // Thread ID maintained

agent.resetSession();                         // Start fresh when needed
await run(agent, 'New project');             // New session
```

## Examples

Comprehensive examples demonstrating the power of computer-agents:

```bash
# Clone the repository
git clone https://github.com/TestBase-ai/computer-agents.git
cd computer-agents
npm install
npm run build

# Workspace sync modes (default vs cloud-only)
node examples/testbase/workspace-sync-modes.mjs

# Parallel execution (the game changer!)
node examples/testbase/parallel-execution.mjs

# Scale experiments (ML hyperparameter tuning, algorithm comparison)
node examples/testbase/scale-experiments.mjs

# Multi-agent workflows (planner → executor → reviewer)
node examples/testbase/multi-agent-workflow.mjs

# Session continuity demonstration
node examples/testbase/hello-world.mjs
```

**[📂 View all examples →](https://github.com/TestBase-ai/computer-agents/tree/main/examples/testbase)**

## Multi-Agent Workflows

Build custom workflows by composing agents:

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

// Manual workflow composition - you control the flow
const task = "Add user authentication";
const plan = await run(planner, `Plan: ${task}`);
const code = await run(executor, plan.finalOutput);
const review = await run(reviewer, `Review: ${code.finalOutput}`);
```

## Configuration

### Environment Variables

```bash
# Required for LLM agents and computer agents (Codex SDK uses OpenAI)
OPENAI_API_KEY=your-openai-key

# Optional for CloudRuntime (has default)
TESTBASE_API_KEY=your-testbase-key  # Get from testbase.ai
```

### Runtime Configuration

```typescript
// LocalRuntime
const localRuntime = new LocalRuntime({
  debug: true,              // Show detailed logs
  skipGitRepoCheck: true,   // Allow execution outside git repos (default: true)
});

// CloudRuntime
const cloudRuntime = new CloudRuntime({
  apiKey: process.env.TESTBASE_API_KEY,  // Required (or use env var)
  debug: true,                            // Show detailed logs
  skipWorkspaceSync: false,               // Sync local ↔ cloud (default: false)
  timeout: 600000,                        // 10 minutes (default)
});
```

### Agent Configuration

```typescript
const agent = new Agent({
  name: "My Agent",                    // Optional, auto-generated if omitted
  agentType: 'computer',               // 'llm' | 'computer'

  // Computer agent specific
  runtime: new LocalRuntime(),         // Required for computer agents
  workspace: './my-project',           // Required for computer agents

  // LLM agent specific
  model: 'gpt-4o',                     // Required for LLM agents

  // Shared
  instructions: "You are helpful.",    // System prompt
  mcpServers: [...],                   // MCP server configurations (optional)
});
```

## MCP Server Integration

Unified MCP configuration works for both agent types:

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
  mcpServers  // Automatically converted to appropriate format
});
```

The SDK handles conversion automatically:
- **LLM agents**: MCP servers → function tools
- **Computer agents**: MCP servers → Codex SDK config

## Performance

### LocalRuntime
- **Cold start**: <1 second
- **Warm execution**: <100ms overhead
- **Parallelization**: Limited by local CPU/memory

### CloudRuntime (Default Mode)
- **First execution**: 30-45 seconds (includes workspace sync)
- **Subsequent runs**: ~5-10 seconds
- **Parallelization**: Scale to 100+ agents

### CloudRuntime (Cloud-Only Mode)
- **Execution**: Faster (no sync overhead)
- **Parallelization**: Scale to 100+ agents
- **Perfect for**: CI/CD, experiments, parallel tasks

## API Reference

### Agent

```typescript
class Agent {
  constructor(config: AgentConfiguration);

  currentThreadId: string | undefined;  // Current session thread ID
  resetSession(): void;                 // Start new session
  workspace: string;                    // Workspace path
  agentType: 'llm' | 'computer';       // Agent type
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
  constructor(config?: {
    debug?: boolean;
    skipGitRepoCheck?: boolean;  // default: true
  });

  readonly type: 'local';
  execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult>;
}
```

### CloudRuntime

```typescript
class CloudRuntime implements Runtime {
  constructor(config?: {
    apiKey?: string;              // Required (or env var TESTBASE_API_KEY)
    debug?: boolean;
    skipWorkspaceSync?: boolean;  // default: false
    timeout?: number;             // default: 600000ms (10 min)
  });

  readonly type: 'cloud';
  execute(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult>;
  cleanup(): Promise<void>;
}
```

## Architecture

```
computer-agents/
├── packages/
│   ├── agents-core/              # Core SDK
│   │   ├── src/
│   │   │   ├── agent.ts          # Agent class
│   │   │   ├── run.ts            # Run loop
│   │   │   ├── runtime/          # Runtime abstraction
│   │   │   │   ├── LocalRuntime.ts
│   │   │   │   ├── CloudRuntime.ts
│   │   │   │   └── gcsWorkspace.ts
│   │   │   ├── codex/            # Codex SDK integration
│   │   │   ├── cloud/            # Cloud API client
│   │   │   └── mcpConfig.ts      # Unified MCP types
│   │   └── package.json
│   │
│   ├── agents/                   # Main package export
│   ├── agents-openai/            # OpenAI provider
│   └── cloud-infrastructure/     # GCE cloud execution server
│
└── examples/testbase/            # Working examples
```

## Best Practices

### Choosing Local vs Cloud

**Use LocalRuntime when:**
- Development and rapid iteration
- Working with local files/tools
- No cloud infrastructure needed
- Testing and debugging

**Use CloudRuntime when:**
- Parallel execution at scale
- Production deployments
- CI/CD pipelines
- Need isolated execution environments
- Experiments requiring multiple concurrent agents

### Choosing Workspace Sync Mode

**Use Default Mode (skipWorkspaceSync: false) when:**
- You need results in your local filesystem
- Continuing work locally after cloud execution
- Interactive development workflows

**Use Cloud-Only Mode (skipWorkspaceSync: true) when:**
- CI/CD pipelines (no local filesystem)
- Running experiments at scale
- Parallel task execution
- Faster execution (skip sync overhead)

### Session Management

Always use the **same agent instance** for session continuity:

```typescript
// ✅ Correct - same agent, continuous session
const agent = new Agent({...});
await run(agent, 'Task 1');
await run(agent, 'Task 2');  // Continues session

// ❌ Wrong - different agents, new sessions
await run(new Agent({...}), 'Task 1');
await run(new Agent({...}), 'Task 2');  // Different session!
```

### Parallel Execution

Use `Promise.all()` for parallel execution:

```typescript
const agents = [agent1, agent2, agent3];
const tasks = ['Task 1', 'Task 2', 'Task 3'];

// ✅ Parallel - all execute simultaneously
const results = await Promise.all(
  agents.map((agent, i) => run(agent, tasks[i]))
);

// ❌ Sequential - one at a time
for (let i = 0; i < agents.length; i++) {
  await run(agents[i], tasks[i]);  // Slower!
}
```

## Cloud Infrastructure

computer-agents includes production-ready cloud infrastructure:

- **GCS Bucket** - Workspace storage (`gs://testbase-workspaces`)
- **GCE VM** - Codex SDK execution server
- **Pay-per-token** - Credit-based billing system
- **API Keys** - Database-backed authentication
- **Budget Protection** - Daily/monthly spending limits

See [Cloud Infrastructure docs](./packages/cloud-infrastructure/README.md) for deployment details.

## Documentation

- **[Examples](https://github.com/TestBase-ai/computer-agents/tree/main/examples/testbase)** - Comprehensive working examples
- **[Cloud Infrastructure](./packages/cloud-infrastructure/README.md)** - Deployment and configuration
- **[Architecture](../docs/ARCHITECTURE.md)** - System design and internals

## Troubleshooting

### "OPENAI_API_KEY not set"
```bash
export OPENAI_API_KEY=sk-...
```

### "TESTBASE_API_KEY required"
```bash
export TESTBASE_API_KEY=your-key
# Or provide in constructor:
new CloudRuntime({ apiKey: 'your-key' })
```

### Session continuity not working
Ensure you're using the **same agent instance** across runs.

### Cloud execution slow
Use `skipWorkspaceSync: true` to skip upload/download overhead:
```typescript
new CloudRuntime({ skipWorkspaceSync: true })
```

## What's New

### v0.4.6
- **Cloud-Only Mode**: `skipWorkspaceSync` option for CloudRuntime
- Perfect for CI/CD and parallel experiments
- Faster cloud execution (no sync overhead)

### v0.4.5
- Fixed maxBuffer overflow for large workspace syncs
- Improved GCS operation stability

### v0.4.0
- Initial public release
- Parallel computer-use agent orchestration
- Unified local/cloud runtime abstraction
- Session continuity

## Differences from OpenAI Agents SDK

computer-agents extends OpenAI's Agents SDK with:

1. **Computer-use agent type** - Direct Codex SDK integration
2. **Runtime abstraction** - Local and cloud execution modes
3. **Parallel orchestration** - Native support for concurrent agents
4. **Session continuity** - Automatic thread management
5. **Cloud infrastructure** - Production-ready execution platform
6. **Unified MCP config** - Single configuration for all agent types

## License

MIT

## Links

- **GitHub**: [https://github.com/TestBase-ai/computer-agents](https://github.com/TestBase-ai/computer-agents)
- **Examples**: [https://github.com/TestBase-ai/computer-agents/tree/main/examples/testbase](https://github.com/TestBase-ai/computer-agents/tree/main/examples/testbase)
- **npm**: [https://www.npmjs.com/package/computer-agents](https://www.npmjs.com/package/computer-agents)
- **Website**: [https://testbase.ai/computer-agents](https://testbase.ai/computer-agents)

## Support

- **Issues**: [GitHub Issues](https://github.com/TestBase-ai/computer-agents/issues)
- **Website**: [testbase.ai](https://testbase.ai)

---

**Built with ❤️ by [TestBase](https://testbase.ai)**

*Based on [OpenAI Agents SDK](https://github.com/openai/openai-agents-sdk) • Powered by [Codex SDK](https://github.com/anthropics/claude-code) • Cloud infrastructure on GCP*
