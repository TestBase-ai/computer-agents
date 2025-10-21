# Quick Start Guide

Get started with Testbase Agents in 5 minutes.

## Installation

```bash
cd testbase-agents
pnpm install
pnpm build
```

**Requirements:**
- Node.js 18+
- OpenAI API key
- Git repository (for computer agents)

## Your First Agent (30 seconds)

### 1. Set API Key

```bash
export OPENAI_API_KEY=sk-...
```

### 2. Run Local Computer Agent

```bash
node examples/testbase/basic-computer-agent.mjs
```

This creates a computer agent that runs locally via Codex SDK.

**What it does:**
- Creates a workspace in `./tmp/basic-demo`
- Executes: "Create a Python script called greet.py"
- Shows the result and session ID

## Examples

### Basic Computer Agent (Local)

```bash
node examples/testbase/basic-computer-agent.mjs
```

**Use case**: Development, testing, fast iteration

### Computer Agent (Cloud)

```bash
# 1. Get API key from admin
export TESTBASE_API_KEY=tb_prod_...

# 2. Run
node examples/testbase/computer-agent-cloud.mjs
```

**Use case**: Production, isolated execution, billing tracking

### Multi-Agent Workflow

```bash
node examples/testbase/multi-agent-workflow.mjs
```

**Use case**: LLM planner → computer executor → LLM reviewer

### Session Continuity

```bash
node examples/testbase/hello-world.mjs
```

**Use case**: Shows automatic session continuity across multiple runs

## Common Patterns

### Create a Computer Agent

```typescript
import { Agent, run, LocalRuntime } from 'computer-agents';

const agent = new Agent({
  name: 'Developer',
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './my-project',
  instructions: 'You are a software developer.'
});

const result = await run(agent, 'Create app.py');
console.log(result.finalOutput);
```

### Create an LLM Agent

```typescript
import { Agent, run } from 'computer-agents';

const agent = new Agent({
  name: 'Planner',
  agentType: 'llm',
  model: 'gpt-4o',
  instructions: 'Create implementation plans.'
});

const result = await run(agent, 'Plan: Build a calculator');
console.log(result.finalOutput);
```

### Session Continuity

```typescript
// First run - new session
await run(agent, 'Create hello.py');

// Second run - continues same session automatically!
await run(agent, 'Add a main function');

console.log(agent.currentThreadId); // Same thread ID

// Start fresh
agent.resetSession();
await run(agent, 'New project');
```

### Switch to Cloud Execution

```typescript
// Just change the runtime!
const agent = new Agent({
  name: 'Developer',
  agentType: 'computer',
  runtime: new CloudRuntime({
    apiKey: process.env.TESTBASE_API_KEY
  }),
  workspace: './my-project',
  instructions: 'You are a software developer.'
});

// Same code, different execution environment
const result = await run(agent, 'Create app.py');
```

## Common Issues

### "Runtime required for computer agents"

**Cause**: Computer agents need `LocalRuntime` or `CloudRuntime`

**Fix**: Add to agent config:
```typescript
runtime: new LocalRuntime()
```

### "OPENAI_API_KEY not set"

**Cause**: Missing OpenAI API key

**Fix**:
```bash
export OPENAI_API_KEY=sk-...
```

### "CloudRuntime authentication failed"

**Cause**: Invalid or missing `TESTBASE_API_KEY`

**Fix**: Get API key from admin:
```bash
curl -X POST http://VM_IP:8080/admin/keys \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Key","prefix":"tb_prod_"}'
```

See `cloud-infrastructure/API_KEY_MANAGEMENT.md` for details.

### "Session not found"

**Cause**: Session expired or invalid thread ID

**Fix**: Start fresh:
```typescript
agent.resetSession();
await run(agent, 'New task');
```

### "Not a git repository"

**Cause**: Codex SDK requires workspace to be a git repo

**Fix**: Initialize git in workspace:
```bash
cd my-project
git init
git add .
git commit -m "Initial commit"
```

Or skip the check (not recommended):
```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './my-project',
  // Add this:
  skipGitRepoCheck: true  // Not recommended - use git instead
});
```

## Next Steps

1. **Read Examples** - Check `examples/testbase/` for more patterns
2. **Cloud Setup** - See `cloud-infrastructure/README.md` for cloud deployment
3. **API Keys** - See `cloud-infrastructure/API_KEY_MANAGEMENT.md` for key management
4. **Billing** - See `cloud-infrastructure/BILLING.md` for usage tracking
5. **Architecture** - See main `CLAUDE.md` for complete documentation

## Environment Variables

Create `.env` file:

```bash
# Required for all operations
OPENAI_API_KEY=sk-...

# Optional - CloudRuntime
TESTBASE_API_KEY=tb_prod_...
TESTBASE_API_URL=http://34.170.205.13:8080  # Default

# Optional - Admin operations
ADMIN_API_KEY=admin_...
```

## Getting Help

**Issues**: Open an issue on GitHub
**Questions**: Check the documentation in `CLAUDE.md`
**Examples**: See `examples/testbase/` directory

## Key Concepts

**Agent Types**:
- `'llm'` - OpenAI API for reasoning (no runtime needed)
- `'computer'` - Codex SDK for code execution (requires runtime)

**Runtimes**:
- `LocalRuntime` - Local execution (fast, for development)
- `CloudRuntime` - Cloud execution (isolated, with billing)

**Session Continuity**:
- Thread IDs maintained automatically
- Multiple `run()` calls continue same conversation
- Use `agent.resetSession()` to start fresh

**Workspace**:
- Must be a git repository (for safety)
- Computer agents execute within workspace
- CloudRuntime syncs workspace to/from cloud

---

**You're ready!** Start with `basic-computer-agent.mjs` and explore from there.
