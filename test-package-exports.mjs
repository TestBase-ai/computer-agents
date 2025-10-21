#!/usr/bin/env node

/**
 * Test that the package exports work correctly
 * This tests the actual npm package behavior, not the vitest VM context
 */

console.log('Testing computer-agents package exports...\n');

try {
  // Test 1: Can we import the package?
  console.log('1. Testing package import...');
  const { Agent } = await import('./packages/agents/dist/index.js');
  console.log('✓ Package imports successfully');
  console.log('✓ Agent class available:', typeof Agent);

  // Test 2: Can we create an agent without a name?
  console.log('\n2. Testing optional name parameter...');
  const agent1 = new Agent({
    agentType: 'llm',
    instructions: 'Test agent',
  });
  console.log('✓ Agent created without name:', agent1.name);

  // Test 3: Can we create an agent with a name?
  console.log('\n3. Testing explicit name parameter...');
  const agent2 = new Agent({
    name: 'TestAgent',
    agentType: 'llm',
    instructions: 'Test agent',
  });
  console.log('✓ Agent created with name:', agent2.name);

  console.log('\n✅ All package export tests passed!');
} catch (error) {
  console.error('\n❌ Package export test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
