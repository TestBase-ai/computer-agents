/**
 * Budget Management
 *
 * Monitor spending, check balances, and control execution
 * with budget protection.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/11-budget-management.ts
 */

import { ComputerAgentsClient } from 'computer-agents';

const client = new ComputerAgentsClient({
  apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});

// Check budget status
const status = await client.budget.getStatus();
console.log('Budget Status:');
console.log(`  Balance: $${(status.balance / 100).toFixed(2)}`);
console.log(`  Spent: $${(status.spent / 100).toFixed(2)}`);

// Check if execution is allowed before running a task
const canRun = await client.budget.canExecute();
if (!canRun.canExecute) {
  console.log(`\nCannot execute: ${canRun.reason}`);
  process.exit(1);
}

console.log('\nBudget OK — executing task...');

const result = await client.run('Write a haiku about TypeScript', {
  onEvent: (event) => {
    if (event.type === 'stream.completed') {
      const run = (event as any).run;
      console.log(`\nTokens used: ${run?.tokens?.input + run?.tokens?.output}`);
    }
  },
});

console.log(result.content);

// Check updated balance
const updated = await client.budget.getStatus();
console.log(`\nRemaining balance: $${(updated.balance / 100).toFixed(2)}`);
