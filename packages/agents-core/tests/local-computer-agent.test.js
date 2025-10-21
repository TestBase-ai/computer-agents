"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const agent_1 = require("../src/agent");
const localRuntime_1 = require("../src/runtime/localRuntime");
const run_1 = require("../src/run");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
(0, vitest_1.describe)('Local Computer Agent', () => {
    const testWorkspace = path.join(process.cwd(), 'tests', 'tmp', 'workspace');
    (0, vitest_1.beforeAll)(async () => {
        // Create test workspace
        await fs.mkdir(testWorkspace, { recursive: true });
        console.log(`Created test workspace: ${testWorkspace}`);
    });
    (0, vitest_1.afterAll)(async () => {
        // Clean up test workspace
        if ((0, fs_1.existsSync)(testWorkspace)) {
            await fs.rm(testWorkspace, { recursive: true, force: true });
            console.log(`Cleaned up test workspace: ${testWorkspace}`);
        }
    });
    (0, vitest_1.it)('should create and execute a computer agent with LocalRuntime', async () => {
        const agent = new agent_1.Agent({
            name: 'TestAgent',
            agentType: 'computer',
            runtime: new localRuntime_1.LocalRuntime({ debug: true }),
            workspace: testWorkspace,
            instructions: 'You are a helpful coding assistant for testing purposes.',
        });
        (0, vitest_1.expect)(agent).toBeDefined();
        (0, vitest_1.expect)(agent.agentType).toBe('computer');
        (0, vitest_1.expect)(agent.runtime).toBeDefined();
    });
    (0, vitest_1.it)('should execute a simple file creation task', async () => {
        const agent = new agent_1.Agent({
            name: 'FileCreatorAgent',
            agentType: 'computer',
            runtime: new localRuntime_1.LocalRuntime({ debug: true }),
            workspace: testWorkspace,
            instructions: 'You are a helpful assistant that creates files as requested.',
        });
        const task = 'Create a file called hello.txt with the content "Hello from computer agent test!"';
        console.log(`Running task: ${task}`);
        const result = await (0, run_1.run)(agent, task);
        console.log('Task result:', {
            finalOutput: result.finalOutput?.substring(0, 200),
            sessionId: agent.sessionId,
        });
        // Verify the file was created
        const filePath = path.join(testWorkspace, 'hello.txt');
        const fileExists = (0, fs_1.existsSync)(filePath);
        (0, vitest_1.expect)(fileExists).toBe(true);
        if (fileExists) {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`File content: "${content}"`);
            (0, vitest_1.expect)(content.trim()).toBe('Hello from computer agent test!');
        }
    });
    (0, vitest_1.it)('should handle multi-step file operations', async () => {
        const agent = new agent_1.Agent({
            name: 'MultiStepAgent',
            agentType: 'computer',
            runtime: new localRuntime_1.LocalRuntime({ debug: true }),
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
        const result = await (0, run_1.run)(agent, task);
        console.log('Multi-step task result:', {
            finalOutput: result.finalOutput?.substring(0, 200),
        });
        // Verify the file was created
        const filePath = path.join(testWorkspace, 'calculator.js');
        const fileExists = (0, fs_1.existsSync)(filePath);
        (0, vitest_1.expect)(fileExists).toBe(true);
        if (fileExists) {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`Calculator.js content:\n${content}`);
            // Basic validation that the file contains the expected functions
            (0, vitest_1.expect)(content).toContain('add');
            (0, vitest_1.expect)(content).toContain('subtract');
            (0, vitest_1.expect)(content).toMatch(/export|module\.exports/);
        }
    });
    (0, vitest_1.it)('should maintain session continuity across multiple tasks', async () => {
        const agent = new agent_1.Agent({
            name: 'SessionAgent',
            agentType: 'computer',
            runtime: new localRuntime_1.LocalRuntime({ debug: true }),
            workspace: testWorkspace,
            instructions: 'You are a helpful coding assistant.',
        });
        // First task - create a file
        const task1 = 'Create a file called counter.txt with the number 0';
        console.log(`Task 1: ${task1}`);
        const result1 = await (0, run_1.run)(agent, task1);
        const sessionId1 = agent.sessionId;
        console.log(`Session ID after task 1: ${sessionId1}`);
        (0, vitest_1.expect)(sessionId1).toBeDefined();
        // Verify first file
        const filePath = path.join(testWorkspace, 'counter.txt');
        (0, vitest_1.expect)((0, fs_1.existsSync)(filePath)).toBe(true);
        // Second task - should remember the session
        const task2 = 'Now update counter.txt to contain the number 1';
        console.log(`Task 2: ${task2}`);
        const result2 = await (0, run_1.run)(agent, task2);
        const sessionId2 = agent.sessionId;
        console.log(`Session ID after task 2: ${sessionId2}`);
        // Session should continue (same ID or new ID but task completed)
        (0, vitest_1.expect)(sessionId2).toBeDefined();
        // Verify the file was updated
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`Counter content: "${content.trim()}"`);
        (0, vitest_1.expect)(content.trim()).toBe('1');
    });
});
//# sourceMappingURL=local-computer-agent.test.js.map