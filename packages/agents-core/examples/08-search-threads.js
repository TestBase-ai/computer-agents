"use strict";
/**
 * Search Threads
 *
 * Full-text search across all your threads and messages.
 * Find past conversations by keyword.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/08-search-threads.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
// Search for threads mentioning "REST API"
const results = await client.threads.search({
    query: 'REST API',
    limit: 10,
});
console.log(`Found ${results.total} threads matching "REST API":\n`);
for (const result of results.results) {
    console.log(`  Thread: ${result.thread.id}`);
    console.log(`  Title: ${result.thread.title || '(untitled)'}`);
    console.log(`  Score: ${result.score.toFixed(2)}`);
    if (result.highlights.length > 0) {
        console.log(`  Highlights: ${result.highlights[0]}`);
    }
    console.log();
}
console.log(`Search took ${results.searchMetadata.processingTimeMs}ms`);
//# sourceMappingURL=08-search-threads.js.map