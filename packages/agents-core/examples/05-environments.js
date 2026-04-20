"use strict";
/**
 * Environment Management
 *
 * Environments are isolated containers where agents execute code.
 * Configure runtimes, packages, secrets, and MCP servers.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/05-environments.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
// Create an environment
const env = await client.environments.create({
    name: 'python-dev',
    internetAccess: true,
});
console.log(`Environment created: ${env.id}`);
// Configure runtimes
await client.environments.setRuntimes(env.id, {
    python: '3.12',
    nodejs: '20',
});
console.log('Runtimes configured');
// Install packages
const installResult = await client.environments.installPackages(env.id, {
    packages: [
        { type: 'python', name: 'flask' },
        { type: 'python', name: 'pytest' },
        { type: 'system', name: 'curl' },
    ],
});
console.log('Packages installed:', installResult);
// Add environment secrets
await client.environments.update(env.id, {
    secrets: [
        { key: 'DATABASE_URL', value: 'postgresql://localhost/mydb' },
        { key: 'API_SECRET', value: 'my-secret-key' },
    ],
});
console.log('Secrets configured');
// Trigger a container image build
const build = await client.environments.build(env.id);
console.log('Build started:', build);
// Check build status
const status = await client.environments.getBuildStatus(env.id);
console.log('Build status:', status);
// List all environments
const envs = await client.environments.list();
console.log(`\nAll environments (${envs.length}):`);
for (const e of envs) {
    console.log(`  - ${e.name} (${e.id})`);
}
//# sourceMappingURL=05-environments.js.map