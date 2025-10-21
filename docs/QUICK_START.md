# Testbase Agents SDK - Quick Start Guide

Get started with the Testbase Agents SDK in 5 minutes.

---

## 📋 What You'll Build

By the end of this guide, you'll have:
- ✅ A working LLM agent for reasoning tasks
- ✅ A computer agent for code execution (local)
- ✅ Understanding of cloud execution
- ✅ MCP server integration
- ✅ Multi-agent workflows

---

## ⚡ Quick Setup

### Prerequisites

```bash
# Required
- Node.js >= 18
- OpenAI API key
- Git repository (for computer agents)

# Optional (for cloud execution)
- Testbase Cloud infrastructure
```

### Installation

```bash
# Create a new project
mkdir my-agent-project
cd my-agent-project

# Initialize
npm init -y

# Install Testbase Agents SDK
npm install @testbase/agents

# Set your OpenAI API key
export OPENAI_API_KEY=sk-...
```

---

## 🎯 Tutorial 1: Your First LLM Agent

**Goal:** Create an LLM agent that answers questions.

**File:** `llm-agent.mjs`

```javascript
import { Agent, run } from '@testbase/agents';

// Create an LLM agent
const agent = new Agent({
  name: 'Assistant',
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'You are a helpful assistant that provides clear, concise answers.',
});

// Run a task
const result = await run(agent, {
  input: 'Explain what an API is in simple terms.',
});

console.log(result.finalOutput);
```

**Run it:**
```bash
node llm-agent.mjs
```

**Expected output:**
```
An API (Application Programming Interface) is like a waiter in a restaurant...
```

**What happened:**
1. Created an LLM agent with `agentType: 'llm'`
2. Specified `model: 'gpt-4o'` (uses OpenAI API)
3. Ran a task with `run(agent, input)`
4. Got a text response

**Key takeaway:** LLM agents are for reasoning, planning, and text generation.

---

## 💻 Tutorial 2: Your First Computer Agent (Local)

**Goal:** Create a computer agent that executes code locally.

**File:** `computer-agent.mjs`

```javascript
import { Agent, run, LocalRuntime } from '@testbase/agents';
import { resolve } from 'path';

// Create a computer agent
const agent = new Agent({
  name: 'Developer',
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: resolve('./my-workspace'),
  instructions: 'You are a coding assistant.',
});

// Run a task
const result = await run(agent, {
  input: 'Create a file called hello.py that prints "Hello, World!"',
});

console.log(result.finalOutput);
console.log(`Thread ID: ${agent.currentThreadId}`);
```

**Run it:**
```bash
node computer-agent.mjs
```

**Expected output:**
```
Created `hello.py` with the requested message.
Thread ID: 019a0152-05d1-76b3-9dbe-96f8c68ab855
```

**Check the file:**
```bash
cat my-workspace/hello.py
# Output: print("Hello, World!")
```

**What happened:**
1. Created a computer agent with `agentType: 'computer'`
2. Configured `LocalRuntime()` for local execution
3. Specified a `workspace` directory
4. Codex SDK executed the task and created the file

**Key takeaway:** Computer agents execute code and file operations via Codex CLI.

---

## 🔄 Tutorial 3: Session Continuity

**Goal:** Make multiple requests that share context.

**File:** `session-continuity.mjs`

```javascript
import { Agent, run, LocalRuntime } from '@testbase/agents';
import { resolve } from 'path';

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: resolve('./my-workspace'),
});

// First task - creates new session
console.log('Task 1: Create a file');
await run(agent, 'Create calculator.py with an add function');
console.log(`Thread ID: ${agent.currentThreadId}`);

// Second task - CONTINUES the same session
console.log('\nTask 2: Modify the file');
await run(agent, 'Add a subtract function to calculator.py');
console.log(`Thread ID: ${agent.currentThreadId}`);

// Third task - STILL the same session
console.log('\nTask 3: Add more functions');
await run(agent, 'Add multiply and divide functions');
console.log(`Thread ID: ${agent.currentThreadId}`);

console.log('\n✓ All tasks used the same session (thread)');
```

**Run it:**
```bash
node session-continuity.mjs
```

**Expected output:**
```
Task 1: Create a file
Thread ID: 019a0152-05d1-76b3-9dbe-96f8c68ab855

Task 2: Modify the file
Thread ID: 019a0152-05d1-76b3-9dbe-96f8c68ab855  ← Same!

Task 3: Add more functions
Thread ID: 019a0152-05d1-76b3-9dbe-96f8c68ab855  ← Same!

✓ All tasks used the same session (thread)
```

**What happened:**
1. First `run()` created a new Codex thread
2. Thread ID stored on agent: `agent.currentThreadId`
3. Subsequent `run()` calls reused the same thread
4. Agent remembers previous context automatically

**Key takeaway:** Session continuity is automatic - no manual management needed!

**Reset session:**
```javascript
agent.resetSession();  // Start fresh
await run(agent, 'New task');  // New thread ID
```

---

## ☁️ Tutorial 4: Cloud Execution

**Goal:** Execute tasks in the cloud instead of locally.

**File:** `cloud-agent.mjs`

```javascript
import { Agent, run, CloudRuntime } from '@testbase/agents';
import { resolve } from 'path';

// Create CloudRuntime with API key for authentication
const runtime = new CloudRuntime({
  apiKey: process.env.TESTBASE_API_KEY,  // Required for cloud execution
  debug: true,
  timeout: 600000,  // 10 minutes
});

const agent = new Agent({
  agentType: 'computer',
  runtime,  // ← Only change needed!
  workspace: resolve('./my-workspace'),
});

// Same API - different execution environment
const result = await run(agent, {
  input: 'Create a Python script that calculates fibonacci numbers',
});

console.log(result.finalOutput);
```

**Setup:**
```bash
# Cloud execution requires authentication
export OPENAI_API_KEY=sk-...
export TESTBASE_API_KEY=your-testbase-api-key  # Required

node cloud-agent.mjs
```

**What happened:**
1. Local workspace uploaded to GCS
2. Task executed on remote GCE VM
3. Results downloaded back to local workspace
4. Session continuity maintained in cloud

**Key takeaway:** Switch from local to cloud by changing runtime - same code!

---

## 🔌 Tutorial 5: MCP Integration

**Goal:** Add tools to your agents via MCP servers.

**File:** `mcp-agent.mjs`

```javascript
import { Agent, run, LocalRuntime } from '@testbase/agents';
import { resolve } from 'path';

// Define MCP servers
const mcpServers = [
  {
    type: 'stdio',
    name: 'filesystem',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', resolve('./my-workspace')],
  },
];

// Computer agent with MCP
const computerAgent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: resolve('./my-workspace'),
  mcpServers,  // ← Add MCP servers
});

await run(computerAgent, 'Create a project README.md');

// LLM agent with MCP (same config!)
const llmAgent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  mcpServers,  // ← Same config works!
  instructions: 'You have filesystem access.',
});

await run(llmAgent, `List files in ${resolve('./my-workspace')}`);
```

**Setup:**
```bash
# Install filesystem MCP server
npm install -g @modelcontextprotocol/server-filesystem

# Run
node mcp-agent.mjs
```

**What happened:**
1. MCP server configuration created
2. Computer agent: MCP passed to Codex SDK
3. LLM agent: MCP converted to function tools
4. Same config works for both!

**Key takeaway:** Unified MCP configuration works across all agent types.

---

## 🏗️ Tutorial 6: Multi-Agent Workflow

**Goal:** Combine multiple agents for complex tasks.

**File:** `workflow.mjs`

```javascript
import { Agent, run, LocalRuntime } from '@testbase/agents';
import { resolve } from 'path';

// Define specialized agents
const planner = new Agent({
  name: 'Planner',
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Create detailed implementation plans.',
});

const executor = new Agent({
  name: 'Executor',
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: resolve('./my-workspace'),
  instructions: 'Execute implementation plans.',
});

const reviewer = new Agent({
  name: 'Reviewer',
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Review code for quality and correctness.',
});

// Compose workflow manually
async function workflow(task) {
  console.log('Step 1: Planning...');
  const plan = await run(planner, `Create a plan for: ${task}`);

  console.log('Step 2: Executing...');
  const code = await run(executor, plan.finalOutput);

  console.log('Step 3: Reviewing...');
  const review = await run(reviewer, `Review this implementation:\n${code.finalOutput}`);

  return review.finalOutput;
}

// Run the workflow
const result = await workflow('Build a simple web scraper in Python');
console.log('\nFinal Review:\n', result);
```

**Run it:**
```bash
node workflow.mjs
```

**What happened:**
1. Planner (LLM) created implementation plan
2. Executor (computer) wrote the code
3. Reviewer (LLM) assessed quality
4. Manual composition - you control the flow

**Key takeaway:** Build custom workflows by composing agents explicitly.

---

## 📚 Common Patterns

### Pattern 1: LLM for Reasoning

```javascript
const analyst = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Analyze data and provide insights.',
});

const result = await run(analyst, {
  input: 'Analyze this sales data...',
});
```

**Use when:** You need reasoning, analysis, or text generation

### Pattern 2: Computer for Execution

```javascript
const developer = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './project',
});

await run(developer, 'Implement the API endpoint');
```

**Use when:** You need code changes, file operations, or terminal commands

### Pattern 3: Local → Cloud Migration

```javascript
// Development
const devRuntime = new LocalRuntime();

// Production
const prodRuntime = new CloudRuntime({ timeout: 900000 });

// Same agent code!
const agent = new Agent({
  agentType: 'computer',
  runtime: process.env.NODE_ENV === 'production' ? prodRuntime : devRuntime,
  workspace: './app',
});
```

**Use when:** You want to develop locally and deploy to cloud

### Pattern 4: MCP Tools for Both Agents

```javascript
const mcpServers = [
  {
    type: 'stdio',
    name: 'github',
    command: 'npx',
    args: ['@modelcontextprotocol/server-github'],
  },
];

// Works for LLM
const llm = new Agent({ agentType: 'llm', mcpServers });

// Works for computer
const computer = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers,
});
```

**Use when:** You want consistent tooling across agent types

---

## 🎯 Next Steps

### Beginner
1. ✅ Complete all 6 tutorials
2. 📖 Read [examples/testbase/README.md](./examples/testbase/README.md)
3. 🔍 Explore [example files](./examples/testbase/)
4. 🧪 Run existing examples

### Intermediate
1. 🏗️ Build a custom multi-agent workflow
2. 🔌 Integrate MCP servers for your use case
3. ☁️ Deploy to cloud with CloudRuntime
4. 📊 Monitor performance and optimize

### Advanced
1. 🛠️ Create custom MCP servers
2. 🔐 Add guardrails and validation
3. 📈 Build production workflows
4. 🚀 Scale with cloud infrastructure

---

## 📖 Additional Resources

### Documentation
- **[Architecture Guide](./CLAUDE.md)** - Design principles and architecture
- **[API Documentation](./API_DOCUMENTATION.md)** - Cloud API reference
- **[Examples README](./examples/testbase/README.md)** - All examples explained
- **[New Examples Guide](./examples/testbase/NEW-EXAMPLES-GUIDE.md)** - Cloud & MCP reference

### Examples
- **[hello-world.mjs](./examples/testbase/hello-world.mjs)** - Session continuity
- **[multi-agent-workflow.mjs](./examples/testbase/multi-agent-workflow.mjs)** - Workflow composition
- **[runtime-comparison.mjs](./examples/testbase/runtime-comparison.mjs)** - Local vs cloud
- **[cloud-execution.mjs](./examples/testbase/cloud-execution.mjs)** - Cloud execution
- **[mcp-integration.mjs](./examples/testbase/mcp-integration.mjs)** - MCP integration

### Community
- **[GitHub Issues](https://github.com/testbasehq/testbase-agents/issues)** - Report bugs
- **[Discussions](https://github.com/testbasehq/testbase-agents/discussions)** - Ask questions

---

## 🐛 Troubleshooting

### "OPENAI_API_KEY not set"

```bash
export OPENAI_API_KEY=sk-...
```

### "Workspace path must be absolute"

```javascript
import { resolve } from 'path';
const workspace = resolve('./my-workspace');  // ✅ Correct
```

### "Cannot find module '@testbase/agents'"

```bash
npm install @testbase/agents
```

### "Computer agent requires runtime"

```javascript
// ❌ Missing runtime
const agent = new Agent({ agentType: 'computer' });

// ✅ Correct
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
});
```

### "Session continuity not working"

```javascript
// ❌ Creating new agent each time
await run(new Agent({...}), 'Task 1');
await run(new Agent({...}), 'Task 2');  // New session!

// ✅ Reuse same agent
const agent = new Agent({...});
await run(agent, 'Task 1');
await run(agent, 'Task 2');  // Same session!
```

### Cloud execution fails

```bash
# Check required environment variables
export OPENAI_API_KEY=sk-...
export TESTBASE_API_KEY=your-testbase-api-key

# Or pass directly to CloudRuntime
const runtime = new CloudRuntime({
  apiKey: 'your-testbase-api-key'
});
```

**Common errors:**
- `CloudRuntime requires an API key` - Set TESTBASE_API_KEY environment variable
- `Authentication failed` (401/403) - Check your TESTBASE_API_KEY is correct
- Connection refused - Verify cloud infrastructure is running

---

## ✅ Quick Reference

### Agent Types

| Type | Execution | Use Cases | Runtime Required |
|------|-----------|-----------|------------------|
| `'llm'` | OpenAI API | Reasoning, planning, text | No |
| `'computer'` | Codex SDK | Code, files, terminal | Yes |

### Runtimes

| Runtime | Execution | When to Use |
|---------|-----------|-------------|
| `LocalRuntime` | Local machine | Development, testing |
| `CloudRuntime` | GCE VM | Production, isolation |

### MCP Server Types

| Type | Transport | Example |
|------|-----------|---------|
| `stdio` | Local process | Filesystem, Git |
| `http` | Remote API | Notion, GitHub |

### Common Commands

```bash
# Installation
npm install @testbase/agents

# Build (if from source)
cd testbase-agents && pnpm build

# Run example
node my-agent.mjs

# Install MCP server
npm install -g @modelcontextprotocol/server-filesystem
```

---

## 🎓 Key Concepts

### 1. Two Agent Types

**Simple and clear:**
- `llm` = Reasoning (OpenAI API)
- `computer` = Execution (Codex SDK)

### 2. Runtime Abstraction

**Switch execution environment:**
- `LocalRuntime` = Your machine
- `CloudRuntime` = Remote GCE VM

### 3. Session Continuity

**Automatic context:**
- First `run()` → new thread
- Next `run()` → same thread
- Thread ID stored on agent

### 4. Unified MCP

**One config for all:**
- LLM agents: MCP → function tools
- Computer agents: MCP → Codex SDK
- Automatic conversion

### 5. Manual Composition

**You control the workflow:**
- Create specialized agents
- Compose them explicitly
- No magic orchestration

---

## 🚀 Quick Start Checklist

- [ ] Install Node.js >= 18
- [ ] Get OpenAI API key
- [ ] Install `@testbase/agents`
- [ ] Set `OPENAI_API_KEY` environment variable
- [ ] Run Tutorial 1 (LLM agent)
- [ ] Run Tutorial 2 (Computer agent)
- [ ] Run Tutorial 3 (Session continuity)
- [ ] Understand runtime abstraction (Tutorial 4)
- [ ] Try MCP integration (Tutorial 5)
- [ ] Build multi-agent workflow (Tutorial 6)
- [ ] Read examples
- [ ] Build your first real agent!

---

**Ready to build?** Start with [Tutorial 1](#-tutorial-1-your-first-llm-agent) and work your way through!

**Have questions?** Check the [troubleshooting section](#-troubleshooting) or [additional resources](#-additional-resources).

**Happy building! 🎉**
