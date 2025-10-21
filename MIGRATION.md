# Migration Guide

This guide helps you migrate to the latest version of testbase-agents with simplified computer agent execution.

## What Changed

### Renamed: Removed `codex` Prefix from Properties

All `codex*` prefixed properties have been renamed to cleaner names:

- `codexMcpServers` → `mcpServers`
- `codexModelOverride` → use `model` directly
- `codexReasoningEffort` → `reasoningEffort`
- `codexSessionId` → `sessionId` (already existed)

**Before:**
```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  codexMcpServers: [{ command: 'npx', args: ['...'] }],
  codexModel: 'gpt-4o',
  codexReasoningEffort: 'high'
});
```

**After:**
```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  mcpServers: [{ command: 'npx', args: ['...'] }],
  model: 'gpt-4o',
  reasoningEffort: 'high'
});
```

**Why:** The `codex` prefix was confusing and redundant. Computer agents naturally use these properties.

### Removed: CodexModelProvider

**Before:** Computer agents required setting CodexModelProvider
```typescript
import { CodexModelProvider, setDefaultModelProvider } from '@testbase/agents';

const codexProvider = new CodexModelProvider();
setDefaultModelProvider(codexProvider);

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime()
});
```

**After:** Computer agents work automatically (no provider needed)
```typescript
import { Agent, LocalRuntime } from '@testbase/agents';

const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime()
});
```

**Why:** Computer agents bypass the model provider entirely, so CodexModelProvider was dead code.

### Improved: Clearer Execution Routing

The execution path for computer agents is now explicit:

1. `run()` detects `agentType === 'computer'`
2. Calls `runtime.execute()` directly
3. Returns result

No hidden model provider magic. Just direct execution.

### Added: createCodexTool() for Hybrid Workflows

**New capability:** Use computer-use as a tool in LLM agents

```typescript
import { Agent, run, createCodexTool, LocalRuntime } from '@testbase/agents';

// Create codex as a tool
const codexTool = createCodexTool({
  workspace: './repo',
  runtime: new LocalRuntime()
});

// Use in LLM agent
const agent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  tools: [codexTool, notionTool, slackTool]
});
```

This enables LLM agents to orchestrate between computer-use and other tools.

### Enhanced: Agent Validation

Computer agents now have stricter validation to prevent misconfigurations:

```typescript
// ❌ This now throws an error
const agent = new Agent({
  agentType: 'computer',
  tools: [someTool]  // ERROR: Computer agents don't support function tools
});

// ✅ Use MCP servers instead
const agent = new Agent({
  agentType: 'computer',
  codexMcpServers: [mcpServer]  // Correct way
});
```

```typescript
// ❌ This now throws an error
const agent = new Agent({
  agentType: 'llm',
  runtime: new LocalRuntime()  // ERROR: LLM agents don't use runtime
});

// ✅ Only computer agents use runtime
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime()  // Correct way
});
```

## Migration Steps

### Step 1: Remove CodexModelProvider

**Find all imports:**
```bash
grep -r "CodexModelProvider" .
```

**Remove imports:**
```diff
- import { CodexModelProvider, setDefaultModelProvider } from '@testbase/agents';
+ import { Agent, LocalRuntime } from '@testbase/agents';
```

**Remove provider setup:**
```diff
- const codexProvider = new CodexModelProvider();
- setDefaultModelProvider(codexProvider);

  const agent = new Agent({
    agentType: 'computer',
    runtime: new LocalRuntime()
  });
```

### Step 2: Fix Agent Configuration

**Check for invalid configurations:**

1. Computer agents with tools:
```diff
  const agent = new Agent({
    agentType: 'computer',
-   tools: [myTool],  // ❌ Not supported
+   codexMcpServers: [mcpServer]  // ✅ Use MCP servers
  });
```

2. LLM agents with runtime:
```diff
  const agent = new Agent({
    agentType: 'llm',
-   runtime: new LocalRuntime()  // ❌ Not supported
  });
```

### Step 4: Rebuild Your Project

```bash
pnpm build  # or npm run build
```

## New Patterns

### Pattern 1: Direct Computer Agent

Use this for pure coding tasks:

```typescript
const agent = new Agent({
  agentType: 'computer',
  runtime: new LocalRuntime(),
  workspace: './repo',
  instructions: 'You are a coding assistant'
});

const result = await run(agent, 'Fix all TypeScript errors');
```

### Pattern 2: Hybrid Tool Workflow

Use this for multi-tool orchestration:

```typescript
const codexTool = createCodexTool({
  workspace: './repo',
  runtime: new LocalRuntime()
});

const agent = new Agent({
  agentType: 'llm',
  model: 'gpt-4o',
  tools: [
    codexTool,        // Computer-use
    databaseTool,     // Database queries
    notificationTool  // Send alerts
  ]
});

const result = await run(agent, 'Complex multi-step task');
```

## Breaking Changes

### Property Names Changed

**Impact:** High - requires code updates

**Fix:** Rename all uses of:
- `codexMcpServers` → `mcpServers`
- `codexModel` → `model`
- `codexReasoningEffort` → `reasoningEffort`

### CodexModelProvider Removed

**Impact:** Low - it was never actually used for execution

**Fix:** Remove all references to `CodexModelProvider` and `setDefaultModelProvider`

### Agent Validation Stricter

**Impact:** Medium - catches misconfigurations

**Fix:** Ensure:
- Computer agents only use `codexMcpServers` (not `tools`)
- LLM agents don't have `runtime`

## Examples

Check out the updated examples:

- `examples/testbase/multi-agent-workflow.mjs` - Direct computer agents
- `examples/testbase/hybrid-workflow.mjs` - NEW: Hybrid tool approach
- `examples/testbase/APPROACHES.md` - NEW: Comparison guide

## Questions?

If you have questions about migration, please open an issue at:
https://github.com/anthropics/testbase/issues
