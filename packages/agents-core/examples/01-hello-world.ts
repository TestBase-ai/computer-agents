/**
 * Hello World - Simplest possible usage
 *
 * Execute a single task and get the result.
 * No setup needed — the SDK auto-creates a default environment.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/01-hello-world.ts
 */

import { ComputerAgentsClient } from 'computer-agents';

const client = new ComputerAgentsClient();

// Just run — no environment setup needed
const result = await client.run('Write a Python function that checks if a number is prime', {
  onEvent: (event) => {
    if (event.type === 'response.completed') {
      console.log('Done!');
    }
  },
});

console.log(result.content);

// Continue the conversation
const followUp = await client.run('Add type hints and a docstring', {
  threadId: result.threadId,
});

console.log(followUp.content);
