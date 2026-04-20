/**
 * Agent-to-Agent Orchestration
 *
 * Create multi-agent workflows where agents collaborate in parallel,
 * sequential, conditional, or map-reduce patterns.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/15-orchestration.ts
 */

import { ComputerAgentsClient } from 'computer-agents';

const client = new ComputerAgentsClient({
  apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});

const envId = process.env.ENVIRONMENT_ID || 'env_xxx';

// Create agents for each step
const linter = await client.agents.create({
  name: 'Linter',
  model: 'claude-haiku-4-5',
  instructions: 'Run linting on the codebase and report issues.',
});

const tester = await client.agents.create({
  name: 'Tester',
  model: 'claude-sonnet-4-5',
  instructions: 'Run the test suite and report results.',
});

const reviewer = await client.agents.create({
  name: 'Reviewer',
  model: 'claude-sonnet-4-5',
  instructions: 'Review lint and test results, then write a summary report.',
});

// Create a sequential orchestration (pipeline)
const pipeline = await client.orchestrations.create({
  name: 'Code Review Pipeline',
  environmentId: envId,
  strategy: 'sequential',
  steps: [
    { agentId: linter.id, name: 'Lint', instructions: 'Lint all TypeScript files' },
    { agentId: tester.id, name: 'Test', instructions: 'Run pytest on all test files' },
    {
      agentId: reviewer.id,
      name: 'Review',
      instructions: 'Summarize the lint and test results',
      dependsOn: ['Lint', 'Test'],
    },
  ],
});

console.log(`Orchestration created: ${pipeline.id}`);
console.log(`  Name: ${pipeline.name}`);
console.log(`  Strategy: ${pipeline.strategy}`);
console.log(`  Steps: ${pipeline.steps.map(s => s.name).join(' → ')}`);

// Run the orchestration
const run = await client.orchestrations.run(pipeline.id);
console.log(`\nRun started: ${run.id} (${run.status})`);

// Poll for completion
let currentRun = run;
while (currentRun.status === 'pending' || currentRun.status === 'running') {
  await new Promise(resolve => setTimeout(resolve, 5000));
  currentRun = await client.orchestrations.getRun(pipeline.id, run.id);
  console.log(`  Status: ${currentRun.status}`);
  for (const step of currentRun.stepResults) {
    console.log(`    ${step.stepId}: ${step.status}${step.durationMs ? ` (${step.durationMs}ms)` : ''}`);
  }
}

console.log(`\nOrchestration ${currentRun.status}!`);

// Create a parallel orchestration
const parallel = await client.orchestrations.create({
  name: 'Parallel Analysis',
  environmentId: envId,
  strategy: 'parallel',
  steps: [
    { agentId: linter.id, name: 'Security Scan' },
    { agentId: tester.id, name: 'Performance Test' },
    { agentId: reviewer.id, name: 'Dependency Audit' },
  ],
});

console.log(`\nParallel orchestration created: ${parallel.id}`);

// List all orchestrations
const orchs = await client.orchestrations.list({ environmentId: envId });
console.log(`\nAll orchestrations (${orchs.length}):`);
for (const o of orchs) {
  console.log(`  - ${o.name} [${o.strategy}] (${o.steps.length} steps)`);
}

// List runs for an orchestration
const runs = await client.orchestrations.listRuns(pipeline.id);
console.log(`\nPipeline runs (${runs.length}):`);
for (const r of runs) {
  console.log(`  - ${r.id}: ${r.status}`);
}
