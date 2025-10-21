#!/usr/bin/env node

/**
 * Final CloudRuntime Test with Checksum Fix
 */

import { CloudRuntime } from './testbase-agents/packages/agents-core/dist/runtime/CloudRuntime.js';

async function main() {
  console.log('🧪 Testing CloudRuntime with Checksum Fix...\n');

  const runtime = new CloudRuntime({ debug: false });
  const workspace = './testbase-agents/packages/agents-core/tests/tmp/cloud-test-new';

  console.log('Task 1: Create counter.txt with value 1');
  const result1 = await runtime.execute({
    agentType: 'computer',
    task: 'Create a file called counter.txt with the number "1"',
    workspace,
  });
  console.log(`✅ Task 1 done. Session: ${result1.sessionId}\n`);

  console.log('Task 2: Increment counter (session continuity test)');
  const result2 = await runtime.execute({
    agentType: 'computer',
    task: 'Read counter.txt, increment the number by 1, and save it back',
    workspace,
    sessionId: result1.sessionId,
  });
  console.log(`✅ Task 2 done. Session: ${result2.sessionId}\n`);

  console.log('Verifying local file:');
  const fs = await import('fs/promises');
  const content = await fs.readFile(`${workspace}/counter.txt`, 'utf-8');
  console.log(`Local counter.txt: ${content.trim()}`);
  
  if (content.trim() === '2') {
    console.log('\n✅ SUCCESS: File was correctly synced with checksum fix!');
  } else {
    console.log(`\n❌ FAILED: Expected "2", got "${content.trim()}"`);
  }
}

main().catch(console.error);
