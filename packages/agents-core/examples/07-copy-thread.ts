/**
 * Copy Thread
 *
 * Fork a conversation by copying a thread with all its messages.
 * Useful for experimenting with different approaches without
 * losing the original conversation.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/07-copy-thread.ts
 */

import { ComputerAgentsClient } from 'computer-agents';

const client = new ComputerAgentsClient({
  apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});

// Create a thread and have a conversation
const thread = await client.threads.create({});
console.log(`Original thread: ${thread.id}`);

await client.threads.sendMessage(thread.id, {
  content: 'Create a Python class called Calculator with add and subtract methods',
  onEvent: (event) => {
    if (event.type === 'response.completed') {
      console.log('Original conversation done');
    }
  },
});

// Copy the thread — all messages are preserved
const copy = await client.threads.copy(thread.id, {
  title: 'Calculator v2 - with more operations',
});
console.log(`Copied thread: ${copy.id}`);

// Continue the copy with a different direction
await client.threads.sendMessage(copy.id, {
  content: 'Add multiply, divide, and power methods. Also add input validation.',
  onEvent: (event) => {
    if (event.type === 'response.completed') {
      console.log('Copy conversation done');
    }
  },
});

// Both threads exist independently
const originalMessages = await client.threads.getMessages(thread.id);
const copyMessages = await client.threads.getMessages(copy.id);

console.log(`\nOriginal thread: ${originalMessages.total} messages`);
console.log(`Copied thread: ${copyMessages.total} messages`);
