/**
 * Scale Experiments Example
 *
 * Demonstrates how computer-agents enables unprecedented experimentation scale:
 * - Run dozens of experiments in parallel
 * - Test multiple hypotheses simultaneously
 * - Compare different approaches systematically
 *
 * Real-world scenarios:
 * - Machine learning hyperparameter tuning
 * - Algorithm optimization experiments
 * - A/B testing different implementations
 * - Scientific research with multiple variables
 */

import { Agent, run, CloudRuntime } from 'computer-agents';

console.log('🔬 Scale Experiments Demo\n');
console.log('Run experiments at unprecedented scale with parallel cloud agents\n');

const TESTBASE_API_KEY = process.env.TESTBASE_API_KEY || 'demo-key';

// =============================================================================
// Experiment: ML Model Hyperparameter Tuning
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Experiment: ML Hyperparameter Tuning');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Scenario: Train 10 different model configurations in parallel');
console.log('Traditional approach: Run sequentially → 10x longer');
console.log('computer-agents approach: All 10 in parallel → 10x faster!\n');

// Define 10 different hyperparameter configurations to test
const experiments = [
  { id: 1, lr: 0.001, epochs: 50, batch: 32 },
  { id: 2, lr: 0.001, epochs: 100, batch: 32 },
  { id: 3, lr: 0.001, epochs: 50, batch: 64 },
  { id: 4, lr: 0.01, epochs: 50, batch: 32 },
  { id: 5, lr: 0.01, epochs: 100, batch: 32 },
  { id: 6, lr: 0.01, epochs: 50, batch: 64 },
  { id: 7, lr: 0.0001, epochs: 50, batch: 32 },
  { id: 8, lr: 0.0001, epochs: 100, batch: 32 },
  { id: 9, lr: 0.001, epochs: 75, batch: 48 },
  { id: 10, lr: 0.01, epochs: 75, batch: 48 },
];

console.log('Configurations to test:');
experiments.forEach(exp => {
  console.log(`  Exp ${exp.id}: lr=${exp.lr}, epochs=${exp.epochs}, batch=${exp.batch}`);
});
console.log('');

// Create cloud runtime for scalable execution
const cloudRuntime = new CloudRuntime({
  apiKey: TESTBASE_API_KEY,
  skipWorkspaceSync: true,  // Fast cloud-only mode
  timeout: 900000  // 15 minutes for training
});

// Create an agent for each experiment
const experimentAgents = experiments.map(exp => ({
  agent: new Agent({
    name: `Experiment ${exp.id}`,
    agentType: 'computer',
    runtime: cloudRuntime,
    workspace: `./exp-${exp.id}`,
    instructions: 'You are a machine learning engineer.'
  }),
  config: exp
}));

try {
  console.log('🚀 Starting all 10 experiments in parallel...\n');
  const start = Date.now();

  // Run ALL experiments in parallel!
  const results = await Promise.all(
    experimentAgents.map(({ agent, config }) =>
      run(agent, `Create a Python script that trains a neural network with learning_rate=${config.lr}, epochs=${config.epochs}, batch_size=${config.batch}. Log the final accuracy.`)
    )
  );

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`✅ All 10 experiments completed in ${duration}s!\n`);

  console.log('📊 Results Summary:');
  results.forEach((result, i) => {
    console.log(`  Exp ${experiments[i].id}: ✓ Completed`);
  });

  console.log(`\n⚡️ Performance Comparison:`);
  console.log(`   Parallel (computer-agents): ${duration}s`);
  console.log(`   Sequential (traditional):   ~${(duration * 10).toFixed(1)}s`);
  console.log(`   Time saved:                 ~${((duration * 10) - duration).toFixed(1)}s`);
  console.log(`   Speedup:                    ${Math.round(10)}x faster!\n`);

} catch (error) {
  console.error('❌ Experiment failed:', error.message);
}

// =============================================================================
// Experiment: Algorithm Comparison
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚡️ Experiment: Algorithm Performance Comparison');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Scenario: Compare 5 different pathfinding algorithms');
console.log('Test: A*, Dijkstra, BFS, DFS, Bellman-Ford\n');

const algorithms = [
  'A* (A-star)',
  'Dijkstra',
  'Breadth-First Search (BFS)',
  'Depth-First Search (DFS)',
  'Bellman-Ford'
];

const algoAgents = algorithms.map((algo, i) => new Agent({
  name: `${algo} Agent`,
  agentType: 'computer',
  runtime: cloudRuntime,
  workspace: `./algo-${i}`,
  instructions: 'You are an algorithms expert.'
}));

try {
  console.log('🚀 Implementing all 5 algorithms in parallel...\n');
  const start = Date.now();

  const algoResults = await Promise.all(
    algoAgents.map((agent, i) =>
      run(agent, `Implement ${algorithms[i]} pathfinding algorithm in Python with performance benchmarks`)
    )
  );

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`✅ All 5 algorithms implemented in ${duration}s!\n`);

  console.log('📊 Algorithms Ready:');
  algorithms.forEach((algo, i) => {
    console.log(`  ${algo}: ✓`);
  });

  console.log(`\n💡 Now you can compare performance across all implementations!`);
  console.log(`   This systematic comparison was created in ${duration}s`);
  console.log(`   Sequential approach would take ~${(duration * 5).toFixed(1)}s\n`);

} catch (error) {
  console.error('❌ Failed:', error.message);
}

// =============================================================================
// Scaling Potential
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Scaling Potential');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('What we demonstrated:');
console.log('  ✅ 10 parallel ML experiments');
console.log('  ✅ 5 parallel algorithm implementations\n');

console.log('What\'s possible with computer-agents:');
console.log('  🚀 100+ parallel experiments in the cloud');
console.log('  🚀 Grid search over thousands of configurations');
console.log('  🚀 Systematic exploration of solution spaces');
console.log('  🚀 Massive A/B testing at scale\n');

console.log('Real-world use cases:');
console.log('  🔬 Scientific Research');
console.log('     - Test 50 different experimental conditions');
console.log('     - Explore multiple hypotheses simultaneously');
console.log('     - Systematic parameter space exploration\n');

console.log('  🧪 ML/AI Development');
console.log('     - Hyperparameter grid search (100s of configs)');
console.log('     - Architecture search (try different models)');
console.log('     - Feature engineering experiments\n');

console.log('  💻 Software Engineering');
console.log('     - A/B test different implementations');
console.log('     - Performance optimization experiments');
console.log('     - Systematic code refactoring approaches\n');

console.log('  🏗️  Infrastructure Testing');
console.log('     - Load testing different configurations');
console.log('     - Deployment strategy validation');
console.log('     - Multi-environment testing\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💡 Key Insight');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('computer-agents transforms how we approach experimentation:');
console.log('  ❌ Before: Sequential experiments → Hours/days');
console.log('  ✅ After:  Parallel experiments → Minutes\n');

console.log('This is a paradigm shift in:');
console.log('  • Scientific research methodology');
console.log('  • ML model development workflows');
console.log('  • Software engineering experimentation');
console.log('  • Systematic problem-solving at scale\n');

console.log('The future of experimentation is parallel. 🚀');
