/**
 * Parallel Execution Example
 *
 * Demonstrates the power of computer-agents for parallel execution:
 * - Multiple agents running simultaneously
 * - Both local and cloud parallel execution
 * - Shared workspace collaboration
 *
 * This is what makes computer-agents unique:
 * - First framework for parallel computer-use agent orchestration
 * - Scale from 1 to 100+ agents effortlessly
 * - Perfect for experiments, A/B testing, multi-approach problem solving
 */

import { Agent, run, LocalRuntime, CloudRuntime } from 'computer-agents';

console.log('🚀 Parallel Execution Demo\n');
console.log('This example shows how computer-agents enables unprecedented scale:\n');

const TESTBASE_API_KEY = process.env.TESTBASE_API_KEY || 'demo-key';

// =============================================================================
// Example 1: Parallel Local Execution
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💻 Example 1: Parallel Local Agents');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Creating 3 agents to implement different sorting algorithms simultaneously...\n');

const localRuntime = new LocalRuntime();

// Create 3 agents for different approaches
const quicksortAgent = new Agent({
  name: "QuickSort Agent",
  agentType: 'computer',
  runtime: localRuntime,
  workspace: './workspace-quicksort',
  instructions: 'Implement sorting algorithms in Python.'
});

const mergesortAgent = new Agent({
  name: "MergeSort Agent",
  agentType: 'computer',
  runtime: localRuntime,
  workspace: './workspace-mergesort',
  instructions: 'Implement sorting algorithms in Python.'
});

const heapsortAgent = new Agent({
  name: "HeapSort Agent",
  agentType: 'computer',
  runtime: localRuntime,
  workspace: './workspace-heapsort',
  instructions: 'Implement sorting algorithms in Python.'
});

try {
  const start = Date.now();

  // Run all 3 agents in parallel!
  const [quicksort, mergesort, heapsort] = await Promise.all([
    run(quicksortAgent, 'Implement quicksort algorithm in sort.py'),
    run(mergesortAgent, 'Implement mergesort algorithm in sort.py'),
    run(heapsortAgent, 'Implement heapsort algorithm in sort.py'),
  ]);

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`✅ All 3 algorithms implemented in ${duration}s (parallel)\n`);
  console.log('Results:');
  console.log(`  QuickSort: ${quicksort.finalOutput.substring(0, 60)}...`);
  console.log(`  MergeSort: ${mergesort.finalOutput.substring(0, 60)}...`);
  console.log(`  HeapSort:  ${heapsort.finalOutput.substring(0, 60)}...\n`);

  console.log('💡 Without parallelization, this would take 3x longer!');
  console.log(`   Sequential time: ~${(duration * 3).toFixed(1)}s`);
  console.log(`   Parallel time:   ~${duration}s`);
  console.log(`   Time saved:      ~${((duration * 3) - duration).toFixed(1)}s (${Math.round(((duration * 2) / (duration * 3)) * 100)}% faster)\n`);

} catch (error) {
  console.error('❌ Failed:', error.message);
}

// =============================================================================
// Example 2: Parallel Cloud Execution
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('☁️  Example 2: Parallel Cloud Agents (Cloud-Only Mode)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Creating 5 cloud agents to test different API implementations...\n');
console.log('Using skipWorkspaceSync=true for maximum speed!\n');

const cloudRuntime = new CloudRuntime({
  apiKey: TESTBASE_API_KEY,
  skipWorkspaceSync: true,  // Fast cloud-only mode
});

// Create 5 agents to try different API frameworks
const agentConfigs = [
  { name: 'Express Agent', task: 'Create REST API with Express' },
  { name: 'Fastify Agent', task: 'Create REST API with Fastify' },
  { name: 'Koa Agent', task: 'Create REST API with Koa' },
  { name: 'Hapi Agent', task: 'Create REST API with Hapi' },
  { name: 'Restify Agent', task: 'Create REST API with Restify' },
];

const agents = agentConfigs.map(config => new Agent({
  name: config.name,
  agentType: 'computer',
  runtime: cloudRuntime,
  workspace: `./cloud-${config.name.toLowerCase().replace(' ', '-')}`,
  instructions: 'You are an expert in building REST APIs.'
}));

try {
  const start = Date.now();

  // Run all 5 agents in parallel in the cloud!
  const results = await Promise.all(
    agents.map((agent, i) => run(agent, agentConfigs[i].task))
  );

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`✅ All 5 API implementations completed in ${duration}s (parallel)\n`);

  results.forEach((result, i) => {
    console.log(`  ${agentConfigs[i].name}: ✓`);
  });

  console.log(`\n💡 Scale demonstration:`);
  console.log(`   5 agents in parallel: ${duration}s`);
  console.log(`   Sequential would take: ~${(duration * 5).toFixed(1)}s`);
  console.log(`   You could scale this to 50+ agents in the cloud!\n`);

} catch (error) {
  console.error('❌ Failed:', error.message);
}

// =============================================================================
// Example 3: Shared Workspace Collaboration
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🤝 Example 3: Shared Workspace Collaboration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Multiple agents working on the SAME workspace simultaneously...\n');

const sharedWorkspace = './shared-project';

// Create 3 agents working on different parts of the same project
const frontendAgent = new Agent({
  name: "Frontend Agent",
  agentType: 'computer',
  runtime: localRuntime,
  workspace: sharedWorkspace,
  instructions: 'You build React frontends.'
});

const backendAgent = new Agent({
  name: "Backend Agent",
  agentType: 'computer',
  runtime: localRuntime,
  workspace: sharedWorkspace,
  instructions: 'You build Express backends.'
});

const testAgent = new Agent({
  name: "Test Agent",
  agentType: 'computer',
  runtime: localRuntime,
  workspace: sharedWorkspace,
  instructions: 'You write comprehensive tests.'
});

try {
  const start = Date.now();

  // All 3 agents work on the same project in parallel!
  await Promise.all([
    run(frontendAgent, 'Create a React component in src/App.jsx'),
    run(backendAgent, 'Create an Express server in server/index.js'),
    run(testAgent, 'Create tests in tests/integration.test.js'),
  ]);

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`✅ Full-stack app created in ${duration}s by 3 parallel agents\n`);
  console.log('📂 Check ./shared-project/ for:');
  console.log('   - src/App.jsx (Frontend)');
  console.log('   - server/index.js (Backend)');
  console.log('   - tests/integration.test.js (Tests)\n');

  console.log('💡 This workflow was impossible before computer-agents!');
  console.log('   - Multiple computer-use agents collaborating');
  console.log('   - Working on the same workspace');
  console.log('   - Executing in parallel\n');

} catch (error) {
  console.error('❌ Failed:', error.message);
}

// =============================================================================
// Summary
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎯 Why This Matters');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('computer-agents is the FIRST framework that enables:');
console.log('  ✅ Parallel orchestration of computer-use agents');
console.log('  ✅ Scale from 1 to 100+ agents effortlessly');
console.log('  ✅ Local AND cloud parallel execution');
console.log('  ✅ Shared workspace collaboration\n');

console.log('Revolutionary use cases:');
console.log('  🧪 Scientific Experiments - Run 20 variations in parallel');
console.log('  🔬 A/B Testing - Test multiple implementations simultaneously');
console.log('  🚀 Multi-Approach Problem Solving - Try different solutions at once');
console.log('  ⚡️ Massive Parallelization - Scale to cloud for 100+ concurrent agents\n');

console.log('This is the future of agent orchestration. 🚀');
