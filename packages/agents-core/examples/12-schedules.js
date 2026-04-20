"use strict";
/**
 * Scheduled Tasks
 *
 * Schedule agents to run automatically on a cron schedule.
 * Great for recurring tasks like daily reports, monitoring, or backups.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/12-schedules.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
async function main() {
    const client = new computer_agents_1.ComputerAgentsClient({
        apiKey: process.env.COMPUTER_AGENTS_API_KEY,
    });
    const environmentId = process.env.ENVIRONMENT_ID || 'env_xxx';
    const environmentName = process.env.ENVIRONMENT_NAME || 'primary-computer';
    const existingAgentId = process.env.AGENT_ID;
    const agent = existingAgentId
        ? await client.agents.get(existingAgentId)
        : await client.agents.create({
            name: 'Daily Code Review Agent',
            model: 'claude-haiku-4-5',
            instructions: 'Review recent code changes and produce a concise operator summary.',
        });
    // Create a recurring schedule that runs on weekdays at 9am UTC
    const schedule = await client.schedules.create({
        name: 'Daily Code Review',
        description: 'Weekday review of code changes and outstanding risks.',
        agentId: agent.id,
        agentName: agent.name,
        task: 'Review all uncommitted changes and write a summary of what changed.',
        environmentId,
        environmentName,
        scheduleType: 'recurring',
        cronExpression: '0 9 * * 1-5',
        timezone: 'UTC',
        enabled: true,
    });
    console.log(`Schedule created: ${schedule.id}`);
    console.log(`  Name: ${schedule.name}`);
    console.log(`  Cron: ${schedule.cronExpression}`);
    // List all schedules
    const schedules = await client.schedules.list();
    console.log(`\nAll schedules (${schedules.length}):`);
    for (const s of schedules) {
        console.log(`  - ${s.name} (${s.cronExpression})`);
    }
    // Trigger a schedule manually
    await client.schedules.trigger(schedule.id);
    console.log(`\nManually triggered: ${schedule.name}`);
    // Disable a schedule
    await client.schedules.disable(schedule.id);
    console.log(`Disabled: ${schedule.name}`);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=12-schedules.js.map
