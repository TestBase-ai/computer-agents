#!/usr/bin/env node

/**
 * Cloud Computer Agent Example
 *
 * Shows how to execute a computer-use agent in the cloud using CloudRuntime.
 * This runs on a GCE VM with automatic workspace sync and usage billing.
 *
 * Prerequisites:
 * 1. Set TESTBASE_API_KEY environment variable
 * 2. Ensure cloud infrastructure is deployed and running
 *
 * Run: TESTBASE_API_KEY=your_key node ./examples/testbase/computer-agent-cloud.mjs
 */

import { Agent, run, CloudRuntime } from 'computer-agents';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  console.log('=== Cloud Computer Agent Example ===\n');

  // Check for API key
  if (!process.env.TESTBASE_API_KEY) {
    console.error('ERROR: TESTBASE_API_KEY environment variable not set!');
    console.error('\nTo get an API key:');
    console.error('1. Contact your admin or');
    console.error('2. Create one via: curl -X POST http://VM_IP:8080/admin/keys ...');
    console.error('\nThen run: TESTBASE_API_KEY=your_key node this-script.mjs\n');
    process.exit(1);
  }

  // Setup workspace
  const workspace = resolve('./tmp/cloud-demo');
  await mkdir(workspace, { recursive: true });
  console.log(`Local workspace: ${workspace}\n`);

  // Create a computer-use agent with CloudRuntime
  const agent = new Agent({
    name: 'Cloud Developer',
    agentType: 'computer',
    runtime: new CloudRuntime({
      apiKey: process.env.TESTBASE_API_KEY,
      debug: true, // Show execution details
    }),
    workspace,
    instructions: 'You are a helpful software developer. Write clean, well-documented code.',
  });

  // Execute a task
  console.log('Task: Create a simple Python calculator\n');
  const startTime = Date.now();

  const result = await run(
    agent,
    'Create a Python script called calculator.py with functions for add, subtract, multiply, and divide. Include a main() function with examples.'
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Show results
  console.log('\n=== Result ===');
  console.log(result.finalOutput);

  // Show billing info (if available)
  if (result.usage) {
    console.log('\n=== Usage ===');
    console.log(`Input tokens: ${result.usage.inputTokens.toLocaleString()}`);
    console.log(`Output tokens: ${result.usage.outputTokens.toLocaleString()}`);
    console.log(`Total tokens: ${result.usage.totalTokens.toLocaleString()}`);
    console.log(`Cost: $${result.usage.totalCost.toFixed(5)}`);
  }

  if (result.billing) {
    console.log('\n=== Billing ===');
    console.log(`Balance remaining: $${result.billing.balanceAfter.toFixed(2)}`);
    console.log(`Total spent: $${result.billing.totalSpent.toFixed(2)}`);
  }

  console.log(`\n=== Execution Details ===`);
  console.log(`Session ID: ${agent.currentThreadId}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Local workspace: ${workspace}`);

  console.log('\n=== Key Concepts ===');
  console.log('- CloudRuntime: Executes on GCE VM with isolated environment');
  console.log('- Workspace sync: Automatic upload before + download after execution');
  console.log('- Usage tracking: Token usage and costs automatically tracked');
  console.log('- Budget protection: Execution blocked if insufficient credits');
  console.log('- Session continuity: Next run will continue the same conversation!');
}

main().catch((error) => {
  console.error('\nExecution failed:');
  console.error(error.message);

  if (error.message.includes('Authentication failed')) {
    console.error('\nCheck your TESTBASE_API_KEY is valid and active.');
  } else if (error.message.includes('Insufficient Credits')) {
    console.error('\nYour account is out of credits. Contact your admin to add more.');
  } else if (error.message.includes('connect to CloudRuntime')) {
    console.error('\nCould not reach cloud infrastructure. Check that VM is running.');
  }

  process.exit(1);
});
