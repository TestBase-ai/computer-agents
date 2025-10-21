/**
 * Workspace Sync Modes Example
 *
 * Demonstrates CloudRuntime's two workspace synchronization modes:
 * 1. Default mode - Syncs local workspace to/from cloud
 * 2. Cloud-only mode - Fresh cloud workspace without local sync
 *
 * Use cases:
 * - Default mode: Local development with cloud execution
 * - Cloud-only mode: CI/CD pipelines, isolated experiments, faster execution
 */

import { Agent, run, CloudRuntime } from 'computer-agents';
import { existsSync, mkdirSync } from 'fs';

console.log('📦 Workspace Sync Modes Demo\n');

const TESTBASE_API_KEY = process.env.TESTBASE_API_KEY || 'demo-key';

// =============================================================================
// MODE 1: Default (Workspace Sync Enabled)
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 MODE 1: Default Workspace Sync');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Create local workspace
const syncedWorkspace = './synced-workspace';
if (!existsSync(syncedWorkspace)) {
  mkdirSync(syncedWorkspace);
}

// Runtime with default settings (sync enabled)
const syncRuntime = new CloudRuntime({
  apiKey: TESTBASE_API_KEY,
  // skipWorkspaceSync: false  // Default
});

const syncAgent = new Agent({
  agentType: 'computer',
  runtime: syncRuntime,
  workspace: syncedWorkspace,
  instructions: 'You are a helpful coding assistant.'
});

console.log('Configuration:');
console.log('  Workspace: ./synced-workspace');
console.log('  Sync mode: ENABLED (default)');
console.log('  Flow: Upload → Execute → Download\n');

try {
  const result = await run(
    syncAgent,
    'Create a Python script called calculator.py with add, subtract, multiply, divide functions'
  );

  console.log('\n✅ Execution completed!');
  console.log('📥 Files downloaded to local workspace');
  console.log('📂 Check: ./synced-workspace/calculator.py\n');

  console.log('💡 Benefits of workspace sync:');
  console.log('   - See results immediately in local files');
  console.log('   - Continue work locally after cloud execution');
  console.log('   - Perfect for local development workflows\n');

} catch (error) {
  console.error('❌ Failed:', error.message);
}

// =============================================================================
// MODE 2: Cloud-Only (No Workspace Sync)
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('☁️  MODE 2: Cloud-Only (No Sync)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Runtime with sync disabled
const cloudOnlyRuntime = new CloudRuntime({
  apiKey: TESTBASE_API_KEY,
  skipWorkspaceSync: true,  // NEW in v0.4.6!
});

const cloudOnlyAgent = new Agent({
  agentType: 'computer',
  runtime: cloudOnlyRuntime,
  workspace: './cloud-workspace',  // Placeholder, not created
  instructions: 'You are a helpful coding assistant.'
});

console.log('Configuration:');
console.log('  Workspace: ./cloud-workspace (placeholder)');
console.log('  Sync mode: DISABLED (cloud-only)');
console.log('  Flow: Execute in fresh cloud workspace\n');

try {
  const result = await run(
    cloudOnlyAgent,
    'Create a Node.js Express server with /health and /api endpoints'
  );

  console.log('\n✅ Execution completed!');
  console.log('☁️  Files stay in cloud workspace');
  console.log('📂 No local directory created\n');

  console.log('💡 Benefits of cloud-only mode:');
  console.log('   - No upload/download overhead = faster');
  console.log('   - Fresh environment every time');
  console.log('   - Perfect for CI/CD and isolated tasks');
  console.log('   - Ideal for parallel experiments at scale\n');

} catch (error) {
  console.error('❌ Failed:', error.message);
}

// =============================================================================
// Summary
// =============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Summary');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Default Mode (skipWorkspaceSync: false):');
console.log('  ✅ Upload local files to cloud');
console.log('  ✅ Download results to local workspace');
console.log('  ✅ Best for: Local development\n');

console.log('Cloud-Only Mode (skipWorkspaceSync: true):');
console.log('  ✅ No local sync overhead');
console.log('  ✅ Fresh isolated environment');
console.log('  ✅ Best for: CI/CD, experiments, parallel tasks\n');

console.log('💡 Choose the right mode for your use case!');
