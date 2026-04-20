/**
 * Event-Driven Triggers
 *
 * Create triggers that automatically fire agents in response to events
 * from GitHub, Slack, email, webhooks, and more.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/14-triggers.ts
 */

import { ComputerAgentsClient } from 'computer-agents';

const client = new ComputerAgentsClient({
  apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});

const envId = process.env.ENVIRONMENT_ID || 'env_xxx';

// Create a GitHub push trigger
const trigger = await client.triggers.create({
  name: 'Run Tests on Push',
  environmentId: envId,
  source: 'github',
  event: 'push',
  filters: { branch: 'main' },
  action: {
    type: 'send_message',
    message: 'Run the test suite and report any failures',
  },
});

console.log(`Trigger created: ${trigger.id}`);
console.log(`  Name: ${trigger.name}`);
console.log(`  Source: ${trigger.source}`);
console.log(`  Event: ${trigger.event}`);

// Create a webhook trigger
const webhookTrigger = await client.triggers.create({
  name: 'Process Incoming Data',
  environmentId: envId,
  source: 'webhook',
  event: 'data.received',
  action: {
    type: 'send_message',
    template: 'Process the incoming data: {{event.payload}}',
  },
});

console.log(`\nWebhook trigger created: ${webhookTrigger.id}`);

// List all triggers
const triggers = await client.triggers.list({ environmentId: envId });
console.log(`\nAll triggers (${triggers.length}):`);
for (const t of triggers) {
  console.log(`  - ${t.name} [${t.source}:${t.event}] ${t.enabled ? 'enabled' : 'disabled'}`);
}

// Test-fire a trigger
const execution = await client.triggers.test(trigger.id, {
  ref: 'refs/heads/main',
  commits: [{ message: 'feat: add new endpoint' }],
});
console.log(`\nTest execution: ${execution.id} (${execution.status})`);

// List execution history
const executions = await client.triggers.listExecutions(trigger.id);
console.log(`\nExecution history (${executions.length}):`);
for (const e of executions) {
  console.log(`  - ${e.id}: ${e.status} (thread: ${e.threadId})`);
}

// Disable a trigger
await client.triggers.disable(trigger.id);
console.log(`\nDisabled: ${trigger.name}`);
