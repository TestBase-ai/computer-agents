# computer-agents

[![npm version](https://badge.fury.io/js/computer-agents.svg)](https://www.npmjs.com/package/computer-agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Build computer-use agents that write code, run tests, and deploy apps. Seamless local and cloud execution with automatic session continuity.

## Installation

```bash
npm install computer-agents
```

## Quick Start

```typescript
import { Agent, run, LocalRuntime } from 'computer-agents';

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  instructions: 'You are an expert developer.'
});

const result = await run(agent, "Create a Python script that prints 'Hello World'");
console.log(result.finalOutput);
```

## Features

- **🎯 Two Agent Types** - `'llm'` for reasoning, `'computer'` for execution
- **🔄 Runtime Abstraction** - Seamless local ↔ cloud switching
- **⚡️ Automatic Session Continuity** - Multi-turn conversations work automatically
- **🔌 Unified MCP Config** - Single configuration for all agent types
- **📦 Manual Composition** - Build custom workflows explicitly
- **☁️ Cloud Execution** - GCE-based with workspace sync
- **✨ Professional** - Zero type assertions, clean abstractions

## Agent Types

### Computer Agent (Local)

```typescript
import { Agent, run, LocalRuntime } from 'computer-agents';

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './my-project',
  instructions: 'You are an expert developer.'
});

const result = await run(agent, 'Add a README to the project');
```

### Computer Agent (Cloud)

```typescript
import { Agent, run, CloudRuntime } from 'computer-agents';

const agent = new Agent({
  agentType: 'computer',
  runtime: new CloudRuntime({ debug: true }),
  workspace: './my-project'
});

const result = await run(agent, 'Run the tests');
```

### LLM Agent

```typescript
import { Agent, run } from 'computer-agents';

const agent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'You create detailed implementation plans.'
});

const result = await run(agent, 'Plan how to add user authentication');
```

## Multi-Agent Workflows

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

// Manual workflow
const task = "Add user authentication";
const plan = await run(planner, `Plan: ${task}`);
const code = await run(executor, plan.finalOutput);
const review = await run(reviewer, `Review: ${code.finalOutput}`);
```

## Session Continuity

Multiple `run()` calls automatically maintain context:

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime()
});

await run(agent, 'Create app.py');           // New session
await run(agent, 'Add error handling');      // Continues same session!
await run(agent, 'Add tests');               // Still same session!

agent.resetSession();                         // Start fresh
await run(agent, 'Start new project');       // New session
```

## Configuration

### Environment Variables

```bash
# Required - Codex SDK and OpenAI both need this
OPENAI_API_KEY=your-openai-key
```

### MCP Server Integration

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

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers  // Works for both LLM and computer agents!
});
```

## Documentation

- [GitHub Repository](https://github.com/testbasehq/computer-agents)
- [Examples](https://github.com/testbasehq/computer-agents/tree/main/examples)
- [API Reference](https://github.com/testbasehq/computer-agents/blob/main/docs)

## License

MIT

## Credits

- Built on [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- Integrates with [@openai/codex-sdk](https://www.npmjs.com/package/@openai/codex-sdk)
