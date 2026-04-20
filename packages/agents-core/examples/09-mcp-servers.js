"use strict";
/**
 * MCP Server Integration
 *
 * Extend agent capabilities with Model Context Protocol servers.
 * MCP servers give agents access to external tools and data sources.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/09-mcp-servers.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
const envId = process.env.ENVIRONMENT_ID || 'env_xxx';
// Add MCP servers to an environment
await client.environments.update(envId, {
    mcpServers: [
        // Local stdio server — runs a command in the container
        {
            type: 'stdio',
            name: 'filesystem',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace'],
        },
        // Remote HTTP server — connects to an external service
        {
            type: 'http',
            name: 'notion',
            url: 'https://mcp.notion.com/mcp',
            bearerToken: process.env.NOTION_TOKEN,
        },
    ],
});
console.log('MCP servers configured');
// Now agents in this environment can use tools from both servers
const thread = await client.threads.create({
    environmentId: envId,
});
const result = await client.threads.sendMessage(thread.id, {
    content: 'List all files in the workspace using the filesystem tools',
    onEvent: (event) => {
        if (event.type === 'response.item.completed') {
            const item = event.item;
            if (item?.type === 'tool_call') {
                console.log(`MCP tool called: ${item.name}`);
            }
        }
    },
});
console.log(result.content);
//# sourceMappingURL=09-mcp-servers.js.map