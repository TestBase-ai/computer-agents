"use strict";
/**
 * Multi-turn Conversation
 *
 * Create a thread for persistent conversation. Each message
 * continues from where the last one left off — the agent
 * remembers the full context.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/02-multi-turn-conversation.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
// Create a thread
const thread = await client.threads.create({});
console.log(`Thread created: ${thread.id}\n`);
// First message
console.log('--- Message 1: Create a project ---');
const result1 = await client.threads.sendMessage(thread.id, {
    content: 'Create a Python Flask REST API with a /health endpoint',
    onEvent: (event) => {
        if (event.type === 'response.completed') {
            console.log('Response:', event.response?.content?.slice(0, 200));
        }
    },
});
// Follow-up — the agent remembers the Flask app
console.log('\n--- Message 2: Add a feature ---');
const result2 = await client.threads.sendMessage(thread.id, {
    content: 'Add a /users endpoint with GET and POST methods',
    onEvent: (event) => {
        if (event.type === 'response.completed') {
            console.log('Response:', event.response?.content?.slice(0, 200));
        }
    },
});
// Another follow-up
console.log('\n--- Message 3: Add tests ---');
const result3 = await client.threads.sendMessage(thread.id, {
    content: 'Write pytest tests for both endpoints',
    onEvent: (event) => {
        if (event.type === 'response.completed') {
            console.log('Response:', event.response?.content?.slice(0, 200));
        }
    },
});
// View conversation history
const messages = await client.threads.getMessages(thread.id);
console.log(`\nTotal messages in thread: ${messages.total}`);
//# sourceMappingURL=02-multi-turn-conversation.js.map