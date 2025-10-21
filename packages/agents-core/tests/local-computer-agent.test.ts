import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Agent } from '../src/agent';
import { LocalRuntime } from '../src/runtime/localRuntime';
import { run } from '../src/run';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

describe('Local Computer Agent', () => {
  const testWorkspace = path.join(process.cwd(), 'tests', 'tmp', 'workspace');

  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(testWorkspace, { recursive: true });
    console.log(`Created test workspace: ${testWorkspace}`);
  });

  afterAll(async () => {
    // Clean up test workspace
    /*if (existsSync(testWorkspace)) {
      await fs.rm(testWorkspace, { recursive: true, force: true });
      console.log(`Cleaned up test workspace: ${testWorkspace}`);
    }*/
  });

  it('should create and execute a computer agent with LocalRuntime', async () => {
    const agent = new Agent({
      name: 'TestAgent',
      agentType: 'computer',
      runtime: new LocalRuntime({ debug: true }),
      workspace: testWorkspace,
      instructions: 'You are a helpful coding assistant for testing purposes.',
    });

    expect(agent).toBeDefined();
    expect(agent.agentType).toBe('computer');
    expect(agent.runtime).toBeDefined();
  });

  it('should execute a simple file creation task', async () => {
    const agent = new Agent({
      name: 'FileCreatorAgent',
      agentType: 'computer',
      runtime: new LocalRuntime({ debug: true }),
      workspace: testWorkspace,
      instructions: 'You are a helpful assistant that creates files as requested.',
    });

    const task = 'Create a file called hello.txt with the content "Hello from computer agent test!"';

    console.log(`Running task: ${task}`);
    const result = await run(agent, task);

    console.log('Task result:', {
      finalOutput: result.finalOutput?.substring(0, 200),
      threadId: agent.currentThreadId,
    });

    // Verify the file was created
    const filePath = path.join(testWorkspace, 'hello.txt');
    const fileExists = existsSync(filePath);

    expect(fileExists).toBe(true);

    if (fileExists) {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`File content: "${content}"`);
      expect(content.trim()).toBe('Hello from computer agent test!');
    }
  });

  it('should handle multi-step file operations', async () => {
    const agent = new Agent({
      name: 'MultiStepAgent',
      agentType: 'computer',
      runtime: new LocalRuntime({ debug: true }),
      workspace: testWorkspace,
      instructions: 'You are a helpful coding assistant.',
    });

    const task = `
      Create a simple JavaScript file called calculator.js with the following functions:
      - add(a, b) that returns a + b
      - subtract(a, b) that returns a - b

      Export these functions.
    `;

    console.log(`Running multi-step task...`);
    const result = await run(agent, task);

    console.log('Multi-step task result:', {
      finalOutput: result.finalOutput?.substring(0, 200),
    });

    // Verify the file was created
    const filePath = path.join(testWorkspace, 'calculator.js');
    const fileExists = existsSync(filePath);

    expect(fileExists).toBe(true);

    if (fileExists) {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`Calculator.js content:\n${content}`);

      // Basic validation that the file contains the expected functions
      expect(content).toContain('add');
      expect(content).toContain('subtract');
      expect(content).toMatch(/export|module\.exports/);
    }
  });

  it('should maintain session continuity across multiple tasks', async () => {
    const agent = new Agent({
      name: 'SessionAgent',
      agentType: 'computer',
      runtime: new LocalRuntime({ debug: true }),
      workspace: testWorkspace,
      instructions: 'You are a helpful coding assistant.',
    });

    // First task - create a file
    const task1 = 'Create a file called counter.txt with the number 0';
    console.log(`Task 1: ${task1}`);
    const result1 = await run(agent, task1);

    const threadId1 = agent.currentThreadId;
    console.log(`Thread ID after task 1: ${threadId1}`);
    expect(threadId1).toBeDefined();

    // Verify first file
    const filePath = path.join(testWorkspace, 'counter.txt');
    expect(existsSync(filePath)).toBe(true);

    // Second task - should remember the session
    const task2 = 'Now update counter.txt to contain the number 1';
    console.log(`Task 2: ${task2}`);
    const result2 = await run(agent, task2);

    const threadId2 = agent.currentThreadId;
    console.log(`Thread ID after task 2: ${threadId2}`);

    // Session should continue (same thread ID)
    expect(threadId2).toBeDefined();
    expect(threadId2).toBe(threadId1);

    // Verify the file was updated
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`Counter content: "${content.trim()}"`);
    expect(content.trim()).toBe('1');
  });
});
