#!/usr/bin/env node

/**
 * Runtime Comparison Example
 *
 * Demonstrates how to switch between LocalRuntime and CloudRuntime
 * for the same computer-use agent without changing agent code.
 *
 * This showcases the runtime abstraction layer that enables:
 * - Local development with LocalRuntime
 * - Production deployment with CloudRuntime
 * - Runtime selection via environment variables
 *
 * Run: node ./examples/testbase/runtime-comparison.mjs [local|cloud]
 */

import { Agent, run, LocalRuntime, CloudRuntime } from 'computer-agents';
import { resolve } from 'node:path';

async function main() {
  const runtimeType = process.argv[2] || 'local';

  console.log('=== Runtime Comparison Example ===\n');
  console.log(`Selected runtime: ${runtimeType}\n`);

  // Workspace setup
  const workspace = resolve('./tmp/runtime-demo');

  // Task to execute
  const task = 'Create a file called hello.txt with the content "Hello from computer-use agent!"';

  // ========================================
  // Runtime Selection
  // ========================================
  let runtime;
  if (runtimeType === 'cloud') {
    // Cloud runtime configuration
    // Note: API URL is configured via TESTBASE_API_URL env var or uses default
    const apiUrl = process.env.TESTBASE_API_URL || 'http://34.170.205.13:8080';

    runtime = new CloudRuntime({
      debug: true,
      timeout: 600000, // 10 minutes
    });

    console.log('Using CloudRuntime:');
    console.log(`- API URL: ${apiUrl}`);
    console.log('- GCE VM execution with GCS workspace sync');
    console.log('- Workspace will be uploaded and synced automatically\n');
  } else {
    // Local runtime configuration
    runtime = new LocalRuntime({ debug: true });

    console.log('Using LocalRuntime:');
    console.log('- Execution: Local Codex CLI');
    console.log(`- Workspace: ${workspace}\n`);
  }

  // ========================================
  // Agent Creation
  // ========================================
  // Notice: Same agent definition works with both runtimes!
  const agent = new Agent({
    name: 'FileCreator',
    agentType: 'computer',
    runtime, // Runtime abstraction in action
    workspace, // Workspace path (used by LocalRuntime, synced by CloudRuntime)
    instructions: 'You are a helpful assistant that creates files as requested.',
  });

  console.log(`Agent Type: ${agent.agentType}`);
  console.log(`Runtime: ${runtime.type}`);
  console.log('\nExecuting task...\n');

  // ========================================
  // Execution
  // ========================================
  const startTime = Date.now();

  const result = await run(agent, {
    input: `${task}\n\nWorkspace: ${workspace}`,
  });

  const duration = Date.now() - startTime;

  // ========================================
  // Results
  // ========================================
  console.log('\n=== Execution Complete ===');
  console.log(`Duration: ${duration}ms`);
  console.log(`\nOutput:\n${result.finalOutput}\n`);

  // ========================================
  // Summary
  // ========================================
  console.log('\n=== Key Insights ===');
  console.log('1. Same agent code works with both runtimes');
  console.log('2. Runtime selection is a configuration choice');
  console.log('3. Local development → Cloud deployment is seamless');
  console.log('4. Workspace sync is handled automatically for CloudRuntime');
  console.log('\nTry running with different runtimes:');
  console.log('  node runtime-comparison.mjs local');
  console.log('  node runtime-comparison.mjs cloud');
  console.log('\nFor custom cloud API URL:');
  console.log('  TESTBASE_API_URL=http://your-vm:8080 node runtime-comparison.mjs cloud');
}

main().catch(console.error);
