#!/usr/bin/env node

/**
 * Multi-Agent Workflow Example
 *
 * Demonstrates the simplified agent architecture with 'llm' and 'computer' types.
 * This example shows how to compose different agent types to create a collaborative
 * workflow where an LLM agent creates a plan and a computer-use agent executes it.
 *
 * Architecture:
 * 1. LLM Planner - Creates implementation plans using OpenAI API
 * 2. Computer Executor - Executes code changes using Codex CLI (local)
 * 3. LLM Reviewer - Reviews the implementation for quality
 *
 * Run: node ./examples/testbase/multi-agent-workflow.mjs
 */

import { Agent, run, LocalRuntime } from 'computer-agents';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  console.log('=== Multi-Agent Workflow Example ===\n');

  // Setup workspace
  const workspace = resolve('./tmp/multi-agent-demo');
  await mkdir(workspace, { recursive: true });
  console.log(`Workspace: ${workspace}\n`);

  // Define the task
  const task = 'Create a simple Python calculator with add, subtract, multiply, and divide functions. Include a main() function with examples.';
  console.log(`Task: ${task}\n`);

  // ========================================
  // Agent 1: LLM Planner
  // ========================================
  console.log('Step 1: Creating implementation plan...');
  const planner = new Agent({
    name: 'Planner',
    agentType: 'llm',
    model: 'gpt-4o',
    instructions: `You are an expert software architect. Create detailed, step-by-step implementation plans.

Your plans should include:
1. File structure
2. Function signatures
3. Implementation steps
4. Testing considerations

Format your response as a clear, structured plan.`,
  });

  const planResult = await run(planner, `Create a detailed plan for: ${task}`);
  const plan = planResult.finalOutput;
  console.log(`\nPlan created:\n${plan}\n`);

  // ========================================
  // Agent 2: Computer-Use Executor
  // ========================================
  console.log('Step 2: Executing implementation...');
  const executor = new Agent({
    name: 'Executor',
    agentType: 'computer',
    runtime: new LocalRuntime({ debug: true }),
    instructions: `You are an expert software developer. Follow implementation plans precisely and write clean, well-documented code.

Key principles:
- Write idiomatic, production-quality code
- Include docstrings and comments
- Follow best practices for the language
- Test your implementation`,
  });

  const executionResult = await run(executor, {
    input: `Execute this implementation plan in workspace ${workspace}:

${plan}

Important: Create all files in the workspace directory provided above.`,
  });

  console.log(`\nImplementation completed:\n${executionResult.finalOutput}\n`);

  // ========================================
  // Agent 3: LLM Reviewer
  // ========================================
  console.log('Step 3: Reviewing implementation...');
  const reviewer = new Agent({
    name: 'Reviewer',
    agentType: 'llm',
    model: 'gpt-4o',
    instructions: `You are a senior code reviewer. Evaluate implementations for:

1. Code quality and style
2. Correctness and completeness
3. Documentation
4. Best practices
5. Potential improvements

Provide constructive feedback with specific suggestions.`,
  });

  const reviewResult = await run(reviewer, `Review this implementation:

Original Task: ${task}

Plan:
${plan}

Implementation Output:
${executionResult.finalOutput}

Provide a detailed code review.`);

  console.log(`\nReview:\n${reviewResult.finalOutput}\n`);

  // ========================================
  // Summary
  // ========================================
  console.log('=== Workflow Complete ===');
  console.log('\nAgent Types Used:');
  console.log(`- Planner: ${planner.agentType} (OpenAI API)`);
  console.log(`- Executor: ${executor.agentType} (Codex CLI via LocalRuntime)`);
  console.log(`- Reviewer: ${reviewer.agentType} (OpenAI API)`);
  console.log(`\nWorkspace: ${workspace}`);
  console.log('\nThis example demonstrates:');
  console.log('1. Composing LLM and computer-use agents');
  console.log('2. Natural integration via simplified agent types');
  console.log('3. Runtime abstraction (LocalRuntime for computer-use)');
  console.log('4. Multi-agent collaboration without specialized types');
}

main().catch(console.error);
