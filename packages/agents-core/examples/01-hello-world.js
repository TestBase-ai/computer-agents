"use strict";
/**
 * Hello World - Simplest possible usage
 *
 * Execute a single task and get the result.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/01-hello-world.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
const result = await client.run('Write a Python function that checks if a number is prime', {
    onEvent: (event) => {
        if (event.type === 'response.completed') {
            console.log('Done!');
        }
    },
});
console.log(result.content);
//# sourceMappingURL=01-hello-world.js.map