"use strict";
/**
 * Execution Logs & Deep Research
 *
 * Access detailed execution logs and manage deep research sessions.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/13-execution-logs.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
// Run a task first
const thread = await client.threads.create({});
await client.threads.sendMessage(thread.id, {
    content: 'Create a simple Python calculator module',
    onEvent: () => { },
});
// Get execution logs with role separation and timestamps
const logs = await client.threads.getLogs(thread.id);
console.log(`Execution logs (${logs.length} entries):\n`);
for (const log of logs) {
    const time = log.relativeTime || '';
    const prefix = {
        user: '[USER]',
        assistant: '[AGENT]',
        execution_log: '[EXEC]',
    }[log.role];
    console.log(`${time} ${prefix} ${log.content.slice(0, 120)}`);
}
// List deep research sessions (if any)
const sessions = await client.threads.listResearch(thread.id);
if (sessions.length > 0) {
    console.log(`\nResearch sessions: ${sessions.length}`);
    for (const session of sessions) {
        console.log(`  - ${session.id}: ${session.status} (${session.query})`);
    }
}
//# sourceMappingURL=13-execution-logs.js.map