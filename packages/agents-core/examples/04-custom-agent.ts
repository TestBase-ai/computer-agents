/**
 * Custom Agent Configuration
 *
 * Create agents with specific models, instructions, and settings.
 * Agents define how the AI behaves — reuse them across threads.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/04-custom-agent.ts
 */

import { ComputerAgentsClient } from 'computer-agents';

const client = new ComputerAgentsClient({
  apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});

// Create a custom agent
const agent = await client.agents.create({
  name: 'Senior Developer',
  model: 'claude-sonnet-4-5',
  instructions: `You are a senior software developer. Follow these principles:
- Write clean, well-documented code
- Include error handling
- Add type annotations
- Write tests for all functions
- Use modern best practices`,
  reasoningEffort: 'high',
});

console.log(`Agent created: ${agent.id} (${agent.name})`);

// Use the agent in a thread
const thread = await client.threads.create({
  agentId: agent.id,
});

const result = await client.threads.sendMessage(thread.id, {
  content: 'Build a TypeScript utility for parsing and validating email addresses',
  onEvent: (event) => {
    if (event.type === 'stream.completed') {
      const run = (event as any).run;
      console.log(`Tokens used: ${run?.tokens?.input + run?.tokens?.output}`);
    }
  },
});

console.log(result.content);

// List all agents
const agents = await client.agents.list();
console.log(`\nTotal agents: ${agents.length}`);
for (const a of agents) {
  console.log(`  - ${a.name} (${a.model})`);
}
