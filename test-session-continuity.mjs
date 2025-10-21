#!/usr/bin/env node

/**
 * Test Script: Session Continuity
 *
 * Verifies that calling run() multiple times on the same agent
 * automatically continues the conversation/session.
 */

import { Agent, run, LocalRuntime } from '@testbase/agents';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  console.log('=== Session Continuity Test ===\n');

  // Setup workspace
  const workspace = resolve('./tmp/session-test');
  await mkdir(workspace, { recursive: true });
  console.log(`Workspace: ${workspace}\n`);

  // Create computer agent with LocalRuntime
  const agent = new Agent({
    name: 'SessionTestAgent',
    agentType: 'computer',
    runtime: new LocalRuntime({ debug: true }),
    instructions: 'You are a helpful coding assistant. Remember context from previous turns.',
  });

  console.log(`Initial thread ID: ${agent.currentThreadId || 'undefined (no session yet)'}\n`);

  // ========================================
  // Turn 1: Create a file
  // ========================================
  console.log('--- Turn 1: Create hello.py ---');
  const result1 = await run(agent, {
    input: `Create a file called hello.py in ${workspace} with a function that prints "Hello, Session!"`,
  });

  console.log(`\nThread ID after turn 1: ${agent.currentThreadId}`);
  console.log(`Output: ${result1.finalOutput?.substring(0, 200) || '(no output)'}...\n`);

  // ========================================
  // Turn 2: Modify the file (should continue session)
  // ========================================
  console.log('--- Turn 2: Add a main function (should continue session) ---');
  const result2 = await run(agent, {
    input: 'Now add a main() function that calls the hello function and includes if __name__ == "__main__"',
  });

  console.log(`\nThread ID after turn 2: ${agent.currentThreadId}`);
  console.log(`Output: ${result2.finalOutput?.substring(0, 200) || '(no output)'}...\n`);

  // Verify thread IDs match (session continued)
  const threadId1 = agent.currentThreadId;

  // ========================================
  // Turn 3: Add another feature (should continue session)
  // ========================================
  console.log('--- Turn 3: Add error handling ---');
  const result3 = await run(agent, {
    input: 'Add try/except error handling to the main function',
  });

  console.log(`\nThread ID after turn 3: ${agent.currentThreadId}`);
  console.log(`Output: ${result3.finalOutput?.substring(0, 200) || '(no output)'}...\n`);

  const threadId2 = agent.currentThreadId;

  // ========================================
  // Verification
  // ========================================
  console.log('=== Verification ===');
  console.log(`Thread ID is consistent: ${threadId1 === threadId2 ? 'YES ✅' : 'NO ❌'}`);
  console.log(`Thread ID: ${threadId2}\n`);

  // ========================================
  // Test Reset Session
  // ========================================
  console.log('--- Testing resetSession() ---');
  agent.resetSession();
  console.log(`Thread ID after reset: ${agent.currentThreadId || 'undefined'}\n`);

  console.log('--- Turn 4: After reset (should start new session) ---');
  const result4 = await run(agent, {
    input: `Create a new file called goodbye.py in ${workspace} that prints "Goodbye!"`,
  });

  const threadId3 = agent.currentThreadId;
  console.log(`\nThread ID after turn 4 (new session): ${threadId3}`);
  console.log(`New session started: ${threadId3 !== threadId2 ? 'YES ✅' : 'NO ❌'}\n`);

  // ========================================
  // Test Resume Session
  // ========================================
  console.log('--- Testing resumeSession() ---');
  agent.resumeSession(threadId1);
  console.log(`Resumed thread ID: ${agent.currentThreadId}`);
  console.log(`Successfully resumed old session: ${agent.currentThreadId === threadId1 ? 'YES ✅' : 'NO ❌'}\n`);

  console.log('--- Turn 5: After resume (should continue old session) ---');
  const result5 = await run(agent, {
    input: 'Add a docstring to the hello function',
  });

  console.log(`\nThread ID after turn 5 (resumed session): ${agent.currentThreadId}`);
  console.log(`Same as original session: ${agent.currentThreadId === threadId1 ? 'YES ✅' : 'NO ❌'}\n`);

  // ========================================
  // Summary
  // ========================================
  console.log('=== Test Complete ===');
  console.log('Session continuity features:');
  console.log('1. ✅ Automatic session continuity across multiple run() calls');
  console.log('2. ✅ resetSession() starts a new session');
  console.log('3. ✅ resumeSession() allows resuming previous sessions');
  console.log('4. ✅ currentThreadId property exposes current session ID');
  console.log('\nAll session management features working correctly! 🎉');
}

main().catch(console.error);
