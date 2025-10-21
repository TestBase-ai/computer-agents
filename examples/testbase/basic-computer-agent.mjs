#!/usr/bin/env node

/**
 * Basic Computer Agent Example
 *
 * This is the simplest possible example showing how to create and run
 * a computer-use agent that executes locally via Codex SDK.
 *
 * Run: node ./examples/testbase/basic-computer-agent.mjs
 */

import { Agent, run, LocalRuntime } from 'computer-agents';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  console.log('=== Basic Computer Agent Example ===\n');

  // Setup workspace
  const workspace = resolve('./tmp/basic-demo');
  await mkdir(workspace, { recursive: true });
  console.log(`Workspace: ${workspace}\n`);

  // Create a computer-use agent with LocalRuntime
  const agent = new Agent({
    name: 'Developer',
    agentType: 'computer',
    runtime: new LocalRuntime({
      debug: true, // Show execution details
    }),
    workspace,
    instructions: 'You are a helpful software developer. Write clean, well-documented code.',
  });

  // Execute a task
  console.log('Task: Create a simple Python script\n');
  const result = await run(
    agent,
    'Create a Python script called greet.py that prints "Hello from Testbase!" when run.'
  );

  // Show results
  console.log('\n=== Result ===');
  console.log(result.finalOutput);
  console.log(`\nSession ID: ${agent.currentThreadId}`);
  console.log(`\nFiles are in: ${workspace}`);

  console.log('\n=== Key Concepts ===');
  console.log('- agentType: "computer" uses Codex SDK for code execution');
  console.log('- LocalRuntime: Executes on your local machine');
  console.log('- Session continuity: agent.currentThreadId persists across runs');
  console.log('- Next run will continue the same conversation automatically!');
}

main().catch(console.error);
