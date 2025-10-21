#!/usr/bin/env node

/**
 * Simple CloudRuntime Test
 *
 * This tests the CloudRuntime by creating a simple file in a test workspace.
 */

import { CloudRuntime } from './testbase-agents/packages/agents-core/dist/runtime/CloudRuntime.js';

async function main() {
  console.log('🧪 Testing CloudRuntime...\n');

  const runtime = new CloudRuntime({ debug: true });
  const workspace = './testbase-agents/packages/agents-core/tests/tmp/cloud-test';

  console.log(`Workspace: ${workspace}`);
  console.log(`API URL: http://34.170.205.13:8080\n`);

  try {
    console.log('📤 Executing task via CloudRuntime...\n');

    const result = await runtime.execute({
      agentType: 'computer',
      task: 'Create a file called hello.txt with the content "Hello from CloudRuntime!"',
      workspace,
      sessionId: undefined,
    });

    console.log('\n✅ Task completed!');
    console.log('\n📋 Result:');
    console.log('─'.repeat(60));
    console.log(result.output);
    console.log('─'.repeat(60));
    console.log(`\nSession ID: ${result.sessionId}`);
    console.log(`Workspace ID: ${result.metadata?.workspaceId}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
