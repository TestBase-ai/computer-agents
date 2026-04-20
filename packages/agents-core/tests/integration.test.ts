/**
 * Integration Tests for Computer Agents SDK
 *
 * These tests run against the real API and require a valid API key.
 * Set COMPUTER_AGENTS_API_KEY or TESTBASE_API_KEY environment variable before running.
 *
 * Run with: pnpm test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  ComputerAgentsClient,
  ApiClientError,
} from '../src';
import type {
  Thread,
  Environment,
  CloudAgent,
  BudgetStatus,
} from '../src';

// API configuration
const API_KEY = process.env.COMPUTER_AGENTS_API_KEY || process.env.TESTBASE_API_KEY;
const API_URL = process.env.COMPUTER_AGENTS_API_URL || 'http://34.170.205.13:8080';
const SKIP_INTEGRATION = !API_KEY;

describe.skipIf(SKIP_INTEGRATION)('ComputerAgentsClient Integration Tests', () => {
  let client: ComputerAgentsClient;
  let testEnvironmentId: string | undefined;
  let testThreadId: string | undefined;

  beforeAll(() => {
    client = new ComputerAgentsClient({
      apiKey: API_KEY,
      baseUrl: API_URL,
      debug: true,
    });
  });

  // =========================================================================
  // Client Initialization
  // =========================================================================

  describe('Client Initialization', () => {
    it('should create client with API key', () => {
      expect(client).toBeInstanceOf(ComputerAgentsClient);
    });

    it('should throw error without API key when no env var set', () => {
      // Temporarily clear env vars
      const origKey = process.env.COMPUTER_AGENTS_API_KEY;
      const origTestKey = process.env.TESTBASE_API_KEY;
      delete process.env.COMPUTER_AGENTS_API_KEY;
      delete process.env.TESTBASE_API_KEY;

      try {
        expect(() => new ComputerAgentsClient({})).toThrow('API key');
      } finally {
        // Restore env vars
        if (origKey) process.env.COMPUTER_AGENTS_API_KEY = origKey;
        if (origTestKey) process.env.TESTBASE_API_KEY = origTestKey;
      }
    });

    it('should have all resource managers', () => {
      expect(client.threads).toBeDefined();
      expect(client.environments).toBeDefined();
      expect(client.agents).toBeDefined();
      expect(client.files).toBeDefined();
      expect(client.schedules).toBeDefined();
      expect(client.budget).toBeDefined();
      expect(client.billing).toBeDefined();
      expect(client.git).toBeDefined();
    });
  });

  // =========================================================================
  // Health Check
  // =========================================================================

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await client.health();
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
    });
  });

  // =========================================================================
  // Budget & Billing
  // =========================================================================

  describe('Budget & Billing', () => {
    it('should get budget status', async () => {
      const status: BudgetStatus = await client.budget.getStatus();
      expect(status).toBeDefined();
      expect(typeof status.balance).toBe('number');
    });

    it('should check if can execute', async () => {
      const result = await client.budget.canExecute();
      expect(result).toBeDefined();
      expect(typeof result.canExecute).toBe('boolean');
    });

    it('should get billing records', async () => {
      const result = await client.budget.getRecords({ limit: 5 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.records)).toBe(true);
    });
  });

  // =========================================================================
  // Environments
  // =========================================================================

  describe('Environments', () => {
    it('should list environments', async () => {
      const environments = await client.environments.list();
      expect(Array.isArray(environments)).toBe(true);

      // Save first environment for later tests
      if (environments.length > 0) {
        testEnvironmentId = environments[0].id;
      }
    });

    it('should create an environment', async () => {
      const env: Environment = await client.environments.create({
        name: `test-env-${Date.now()}`,
        internetAccess: false,
      });

      expect(env).toBeDefined();
      expect(env.id).toBeDefined();
      expect(env.name).toContain('test-env-');

      // Save for later tests and cleanup
      testEnvironmentId = env.id;
    });

    it('should get an environment by ID', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      const env = await client.environments.get(testEnvironmentId);
      expect(env).toBeDefined();
      expect(env.id).toBe(testEnvironmentId);
    });

    it('should update an environment', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      const updated = await client.environments.update(testEnvironmentId, {
        internetAccess: true,
      });

      expect(updated).toBeDefined();
      expect(updated.internetAccess).toBe(true);
    });
  });

  // =========================================================================
  // Agents
  // =========================================================================

  describe('Agents', () => {
    let testAgentId: string | undefined;

    it('should list agents', async () => {
      const agents = await client.agents.list();
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should create an agent', async () => {
      const agent: CloudAgent = await client.agents.create({
        name: `test-agent-${Date.now()}`,
        model: 'gpt-4o',
        instructions: 'You are a helpful test agent.',
      });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toContain('test-agent-');

      testAgentId = agent.id;
    });

    it('should get an agent by ID', async () => {
      if (!testAgentId) {
        console.log('Skipping: no test agent');
        return;
      }

      const agent = await client.agents.get(testAgentId);
      expect(agent).toBeDefined();
      expect(agent.id).toBe(testAgentId);
    });

    it('should update an agent', async () => {
      if (!testAgentId) {
        console.log('Skipping: no test agent');
        return;
      }

      const updated = await client.agents.update(testAgentId, {
        instructions: 'Updated instructions for testing.',
      });

      expect(updated).toBeDefined();
      expect(updated.instructions).toContain('Updated');
    });

    it('should delete an agent', async () => {
      if (!testAgentId) {
        console.log('Skipping: no test agent');
        return;
      }

      await client.agents.delete(testAgentId);
      // If no error, deletion was successful
    });
  });

  // =========================================================================
  // Threads
  // =========================================================================

  describe('Threads', () => {
    it('should list threads', async () => {
      const threads = await client.threads.list();
      expect(threads).toBeDefined();
      expect(Array.isArray(threads.data)).toBe(true);
    });

    it('should create a thread', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      const thread: Thread = await client.threads.create({
        environmentId: testEnvironmentId,
      });

      expect(thread).toBeDefined();
      expect(thread.id).toBeDefined();
      expect(thread.environmentId).toBe(testEnvironmentId);

      testThreadId = thread.id;
    });

    it('should get a thread by ID', async () => {
      if (!testThreadId) {
        console.log('Skipping: no test thread');
        return;
      }

      const thread = await client.threads.get(testThreadId);
      expect(thread).toBeDefined();
      expect(thread.id).toBe(testThreadId);
    });

    it('should get thread messages', async () => {
      if (!testThreadId) {
        console.log('Skipping: no test thread');
        return;
      }

      const messages = await client.threads.getMessages(testThreadId);
      expect(messages).toBeDefined();
      expect(Array.isArray(messages.data)).toBe(true);
    });
  });

  // =========================================================================
  // Thread Execution (Streaming)
  // =========================================================================

  describe('Thread Execution', () => {
    it('should send a message and receive streaming response', async () => {
      if (!testThreadId) {
        console.log('Skipping: no test thread');
        return;
      }

      const events: string[] = [];

      const result = await client.threads.sendMessage(testThreadId, {
        content: 'Say "Hello, test!" and nothing else.',
        onEvent: (event) => {
          events.push(event.type);
          console.log(`Event: ${event.type}`);
        },
        timeout: 120000, // 2 minutes for execution
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(events.length).toBeGreaterThan(0);

      console.log('Response content:', result.content);
      console.log('Events received:', events);
    }, 180000); // 3 minute timeout for the test
  });

  // =========================================================================
  // Convenience run() Method
  // =========================================================================

  describe('Convenience run() Method', () => {
    it('should execute a task with run()', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      const events: string[] = [];

      const result = await client.run(
        'Create a simple Python script that prints "Hello from SDK test"',
        {
          environmentId: testEnvironmentId,
          onEvent: (event) => {
            events.push(event.type);
          },
          timeout: 120000,
        }
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.threadId).toBeDefined();

      console.log('Run result:', result.content);
      console.log('Thread ID:', result.threadId);
    }, 180000);

    it('should continue a conversation with run()', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      // First message
      const result1 = await client.run('Create a variable x = 5', {
        environmentId: testEnvironmentId,
        timeout: 120000,
      });

      expect(result1.threadId).toBeDefined();

      // Continue with same thread
      const result2 = await client.run('Now multiply x by 2 and print the result', {
        environmentId: testEnvironmentId,
        threadId: result1.threadId,
        timeout: 120000,
      });

      expect(result2.threadId).toBe(result1.threadId);
      console.log('Continuation result:', result2.content);
    }, 300000); // 5 minutes for multi-turn
  });

  // =========================================================================
  // Files
  // =========================================================================

  describe('Files', () => {
    it('should list files in environment', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      const files = await client.files.listFiles(testEnvironmentId);
      expect(Array.isArray(files)).toBe(true);
    });

    it('should upload, download, and delete a file', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      const testContent = `# Test file created at ${new Date().toISOString()}\nprint("Hello from SDK test")`;

      // Upload
      const uploaded = await client.files.uploadFile({
        environmentId: testEnvironmentId,
        filename: 'test-sdk-file.py',
        content: testContent,
      });

      expect(uploaded).toBeDefined();
      expect(uploaded.success).toBe(true);
      expect(uploaded.filename).toBe('test-sdk-file.py');

      // Download
      const content = await client.files.getFile(testEnvironmentId, 'test-sdk-file.py');
      expect(content).toContain('Hello from SDK test');

      // Delete
      const deleteResult = await client.files.deleteFile(testEnvironmentId, 'test-sdk-file.py');
      expect(deleteResult.success).toBe(true);
    });

    it('should move a file', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment');
        return;
      }

      // First upload a file
      await client.files.uploadFile({
        environmentId: testEnvironmentId,
        filename: 'move-test.txt',
        content: 'File to be moved',
      });

      // Move the file
      const moveResult = await client.files.moveFile({
        environmentId: testEnvironmentId,
        sourcePath: 'move-test.txt',
        destPath: 'moved-test.txt',
      });

      expect(moveResult.success).toBe(true);

      // Verify the file exists at new location
      const content = await client.files.getFile(testEnvironmentId, 'moved-test.txt');
      expect(content).toContain('File to be moved');

      // Cleanup
      await client.files.deleteFile(testEnvironmentId, 'moved-test.txt');
    });
  });

  // =========================================================================
  // Schedules
  // =========================================================================

  describe('Schedules', () => {
    it('should list schedules', async () => {
      const schedules = await client.schedules.list();
      expect(Array.isArray(schedules)).toBe(true);
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('Error Handling', () => {
    it('should throw ApiClientError for invalid resource', async () => {
      try {
        await client.threads.get('thread_nonexistent_12345');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        // Accept 401, 403, 404, or 500 depending on backend state
        expect([401, 403, 404, 500]).toContain((error as ApiClientError).status);
      }
    });

    it('should throw ApiClientError for invalid environment', async () => {
      try {
        await client.environments.get('env_nonexistent_12345');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        // Accept 401, 403, 404, or 500 depending on backend state
        expect([401, 403, 404, 500]).toContain((error as ApiClientError).status);
      }
    });
  });

  // =========================================================================
  // Cleanup
  // =========================================================================

  describe('Cleanup', () => {
    it('should delete test thread', async () => {
      if (!testThreadId) {
        console.log('Skipping: no test thread to delete');
        return;
      }

      await client.threads.delete(testThreadId);
      console.log('Deleted test thread:', testThreadId);
    });

    it('should delete test environment', async () => {
      if (!testEnvironmentId) {
        console.log('Skipping: no test environment to delete');
        return;
      }

      await client.environments.delete(testEnvironmentId);
      console.log('Deleted test environment:', testEnvironmentId);
    });
  });
});

// =========================================================================
// Quick Sanity Test (runs even without API key)
// =========================================================================

describe('SDK Sanity Tests', () => {
  it('should export ComputerAgentsClient', () => {
    expect(ComputerAgentsClient).toBeDefined();
  });

  it('should export ApiClientError', () => {
    expect(ApiClientError).toBeDefined();
  });

  it('should create error with correct properties', () => {
    const error = new ApiClientError('Test error', 400, 'TEST_CODE', { foo: 'bar' });
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ foo: 'bar' });
  });
});
