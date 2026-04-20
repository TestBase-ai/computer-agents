"use strict";
/**
 * Streaming Events
 *
 * Real-time SSE streaming lets you monitor execution as it
 * happens — see tool calls, partial responses, and token usage.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/03-streaming.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
const thread = await client.threads.create({});
const result = await client.threads.sendMessage(thread.id, {
    content: 'Create a simple Node.js HTTP server that responds with JSON',
    onEvent: (event) => {
        switch (event.type) {
            case 'response.started':
                console.log('[started] Execution began');
                break;
            case 'response.item.completed':
                const item = event.item;
                if (item?.type === 'tool_call') {
                    console.log(`[tool] ${item.name}: ${item.arguments?.slice(0, 80)}...`);
                }
                else if (item?.type === 'text') {
                    console.log(`[text] ${item.content?.slice(0, 100)}...`);
                }
                break;
            case 'response.completed':
                console.log('[completed] Response finished');
                break;
            case 'stream.completed':
                const run = event.run;
                console.log(`[done] Tokens: ${run?.tokens?.input} in / ${run?.tokens?.output} out`);
                break;
            case 'stream.error':
                console.error('[error]', event.message);
                break;
        }
    },
});
console.log('\nFinal response:', result.content.slice(0, 300));
console.log(`\nTotal events received: ${result.events.length}`);
//# sourceMappingURL=03-streaming.js.map