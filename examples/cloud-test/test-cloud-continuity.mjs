#!/usr/bin/env node

/**
 * Test CloudRuntime Session Continuity
 */

import { CloudRuntime } from './testbase-agents/packages/agents-core/dist/runtime/CloudRuntime.js';

async function main() {
  console.log('🧪 Testing CloudRuntime Session Continuity...\n');

  const runtime = new CloudRuntime({ debug: true });
  const workspace = './testbase-agents/packages/agents-core/tests/tmp/cloud-test';

  console.log('Task 1: Create initial file');
  const result1 = await runtime.execute({
    agentType: 'computer',
    task: 'Create a file called counter.txt with the number "1"',
    workspace,
  });
  console.log(`✅ Task 1 done. Session: ${result1.sessionId}\n`);

  console.log('Task 2: Increment the counter (should see previous file)');
  const result2 = await runtime.execute({
    agentType: 'computer',
    task: 'Read counter.txt, increment the number, and save it back',
    workspace,
    sessionId: result1.sessionId, // Continue same session
  });
  console.log(`✅ Task 2 done. Session: ${result2.sessionId}\n`);

  console.log('Final value:');
  console.log(result2.output);
}

main().catch(console.error);
