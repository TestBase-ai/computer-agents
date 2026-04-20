"use strict";
/**
 * Git Operations
 *
 * View diffs, commit changes, and push to remote repositories
 * from environment workspaces.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/10-git-operations.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
const envId = process.env.ENVIRONMENT_ID || 'env_xxx';
// View uncommitted changes
const diff = await client.git.diff(envId);
console.log('Uncommitted changes:');
for (const file of diff.files) {
    console.log(`  ${file.status} ${file.path} (+${file.additions} -${file.deletions})`);
}
// Commit changes
if (diff.files.length > 0) {
    const commit = await client.git.commit(envId, {
        message: 'Add REST API with health endpoint',
    });
    console.log(`\nCommitted: ${commit.hash}`);
    // Push to remote
    const push = await client.git.push(envId);
    console.log(`Pushed to remote: ${push.branch}`);
}
//# sourceMappingURL=10-git-operations.js.map