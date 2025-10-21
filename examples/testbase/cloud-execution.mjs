#!/usr/bin/env node

/**
 * Cloud Execution Example
 *
 * Demonstrates how to execute computer agents in the cloud using CloudRuntime.
 * Shows workspace synchronization, session continuity, and error handling.
 *
 * Prerequisites:
 * 1. GCE VM running with testbase-cloud-infrastructure
 * 2. OPENAI_API_KEY environment variable set
 * 3. Optional: TESTBASE_API_URL (defaults to production VM)
 *
 * Run: node ./examples/testbase/cloud-execution.mjs
 */

import { Agent, run, CloudRuntime } from 'computer-agents';
import { resolve } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

/**
 * Cloud Execution Demo
 *
 * Flow:
 * 1. Create local workspace with initial files
 * 2. Create agent with CloudRuntime
 * 3. Execute tasks (workspace auto-syncs to cloud)
 * 4. Results sync back automatically
 * 5. Session continuity maintained across cloud executions
 */
async function main() {
  console.log('=== Cloud Execution Example ===\n');

  // ========================================
  // Step 1: Environment Setup
  // ========================================
  console.log('Step 1: Checking environment...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable required');
    console.log('\nSet your OpenAI API key:');
    console.log('  export OPENAI_API_KEY=sk-...\n');
    process.exit(1);
  }

  if (!process.env.TESTBASE_API_KEY) {
    console.error('❌ Error: TESTBASE_API_KEY environment variable required');
    console.log('\nSet your Testbase API key:');
    console.log('  export TESTBASE_API_KEY=your-testbase-key\n');
    process.exit(1);
  }

  console.log(`✓ OpenAI API key configured`);
  console.log(`✓ Testbase API key configured`);
  console.log(`✓ Cloud infrastructure: GCE VM + GCS storage\n`);

  // ========================================
  // Step 2: Workspace Setup
  // ========================================
  console.log('Step 2: Setting up local workspace...\n');

  const workspace = resolve('./tmp/cloud-demo');
  await mkdir(workspace, { recursive: true });

  // Create initial files that will be synced to cloud
  await writeFile(
    resolve(workspace, 'README.md'),
    '# Cloud Execution Demo\n\nThis file was created locally and synced to the cloud.'
  );

  console.log(`✓ Workspace created: ${workspace}`);
  console.log('✓ Initial files created\n');

  // ========================================
  // Step 3: Create CloudRuntime Agent
  // ========================================
  console.log('Step 3: Creating agent with CloudRuntime...\n');

  const runtime = new CloudRuntime({
    apiKey: process.env.TESTBASE_API_KEY,  // Required for authentication
    debug: true,      // Show detailed logs
    timeout: 600000,  // 10 minutes (for long-running tasks)
  });

  const agent = new Agent({
    name: 'CloudDeveloper',
    agentType: 'computer',
    runtime,
    workspace,
    instructions: 'You are a helpful coding assistant running in the cloud.',
  });

  console.log('✓ CloudRuntime configured');
  console.log(`✓ Agent created: ${agent.name}`);
  console.log(`✓ Workspace: ${workspace}\n`);

  // ========================================
  // Step 4: Execute First Task (Cloud)
  // ========================================
  console.log('Step 4: Executing first task in the cloud...\n');
  console.log('Task: Create a Python calculator module\n');

  const startTime1 = Date.now();

  try {
    const result1 = await run(agent, {
      input: `Create a file called calculator.py with the following functions:
- add(a, b) - returns sum
- subtract(a, b) - returns difference
- multiply(a, b) - returns product
- divide(a, b) - returns quotient (handle division by zero)

Include docstrings and type hints.`,
    });

    const duration1 = Date.now() - startTime1;

    console.log('✓ Task completed!\n');
    console.log(`Duration: ${Math.round(duration1 / 1000)}s`);
    console.log(`Thread ID: ${agent.currentThreadId}`);
    console.log(`\nOutput:\n${result1.finalOutput}\n`);

    // ========================================
    // Step 5: Verify File Sync
    // ========================================
    console.log('Step 5: Verifying workspace sync...\n');

    try {
      const calculatorContent = await readFile(resolve(workspace, 'calculator.py'), 'utf-8');
      console.log('✓ File synced from cloud to local workspace');
      console.log(`✓ File size: ${calculatorContent.length} bytes\n`);
      console.log('File preview (first 300 chars):');
      console.log(calculatorContent.substring(0, 300) + '...\n');
    } catch (error) {
      console.warn('⚠️  Warning: File not synced yet (may still be in progress)');
      console.log('   Check workspace manually:', workspace, '\n');
    }

    // ========================================
    // Step 6: Session Continuity Test
    // ========================================
    console.log('Step 6: Testing session continuity...\n');
    console.log('Task: Add unit tests to calculator.py\n');

    const threadIdBefore = agent.currentThreadId;
    console.log(`Thread ID before: ${threadIdBefore}`);

    const startTime2 = Date.now();

    const result2 = await run(agent, {
      input: `Now create a file called test_calculator.py with pytest unit tests for all functions in calculator.py. Test edge cases like division by zero.`,
    });

    const duration2 = Date.now() - startTime2;
    const threadIdAfter = agent.currentThreadId;

    console.log('✓ Second task completed!\n');
    console.log(`Duration: ${Math.round(duration2 / 1000)}s`);
    console.log(`Thread ID after: ${threadIdAfter}`);
    console.log(`Session continuity: ${threadIdBefore === threadIdAfter ? '✓ WORKING' : '✗ FAILED'}\n`);
    console.log(`Output:\n${result2.finalOutput}\n`);

    // ========================================
    // Step 7: Performance Summary
    // ========================================
    console.log('Step 7: Performance Summary\n');
    console.log(`Total execution time: ${Math.round((duration1 + duration2) / 1000)}s`);
    console.log(`Average task time: ${Math.round((duration1 + duration2) / 2 / 1000)}s`);
    console.log(`Workspace syncs: 2 (automatic)`);
    console.log(`Session maintained: ${threadIdBefore === threadIdAfter ? 'Yes' : 'No'}\n`);

  } catch (error) {
    console.error('\n❌ Execution failed!\n');

    // Detailed error handling for common issues
    if (error.message?.includes('ECONNREFUSED')) {
      console.error('Error: Cannot connect to cloud infrastructure');
      console.log('\nTroubleshooting:');
      console.log('1. Verify the GCE VM is running');
      console.log('2. Check network connectivity to cloud infrastructure');
      console.log('3. Ensure firewall rules allow connections on port 8080\n');
    } else if (error.message?.includes('Authentication failed') ||
               error.message?.includes('401') ||
               error.message?.includes('403')) {
      console.error('Error: Authentication failed');
      console.log('\nTroubleshooting:');
      console.log('1. Verify TESTBASE_API_KEY is set correctly');
      console.log('2. Check the API key is valid and not expired');
      console.log('\nSet your API key:');
      console.log('  export TESTBASE_API_KEY=your-testbase-key\n');
    } else if (error.message?.includes('CloudRuntime requires an API key')) {
      console.error('Error: Missing API key');
      console.log('\nThe CloudRuntime requires authentication.');
      console.log('Set your API key:');
      console.log('  export TESTBASE_API_KEY=your-testbase-key\n');
    } else if (error.message?.includes('timeout')) {
      console.error('Error: Task execution timeout');
      console.log('\nThe task took longer than the configured timeout.');
      console.log('Increase timeout in CloudRuntime config:\n');
      console.log('  new CloudRuntime({');
      console.log('    apiKey: process.env.TESTBASE_API_KEY,');
      console.log('    timeout: 900000  // 15 minutes');
      console.log('  })\n');
    } else {
      console.error('Error:', error.message);
      console.error('\nFull error:', error);
    }

    process.exit(1);
  }

  // ========================================
  // Summary
  // ========================================
  console.log('=== Cloud Execution Summary ===\n');
  console.log('✓ Workspace synced to cloud automatically');
  console.log('✓ Tasks executed on remote GCE VM');
  console.log('✓ Results synced back to local workspace');
  console.log('✓ Session continuity maintained across tasks');
  console.log(`✓ Final workspace: ${workspace}\n`);

  console.log('Key Features Demonstrated:');
  console.log('1. CloudRuntime configuration');
  console.log('2. Automatic workspace upload/download');
  console.log('3. Session continuity in cloud environment');
  console.log('4. Error handling for network issues');
  console.log('5. Performance metrics\n');

  console.log('Next Steps:');
  console.log('• Check the workspace directory for synced files');
  console.log('• Try running with different timeout values');
  console.log('• Test with larger workspaces');
  console.log('• Compare performance with LocalRuntime\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
