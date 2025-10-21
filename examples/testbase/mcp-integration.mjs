#!/usr/bin/env node

/**
 * MCP Integration Example
 *
 * Demonstrates how to use Model Context Protocol (MCP) servers with Testbase agents.
 * Shows the unified MCP configuration that works for both LLM and computer agents.
 *
 * Key Features:
 * - Unified McpServerConfig type for all agent types
 * - Automatic conversion for LLM agents (→ function tools)
 * - Automatic conversion for computer agents (→ Codex SDK format)
 * - Supports both stdio and HTTP MCP servers
 *
 * Prerequisites:
 * 1. OPENAI_API_KEY environment variable set
 * 2. Install filesystem MCP server:
 *    npm install -g @modelcontextprotocol/server-filesystem
 *
 * Run: node ./examples/testbase/mcp-integration.mjs
 */

import { Agent, run, LocalRuntime } from 'computer-agents';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

/**
 * MCP Server Configuration Examples
 *
 * The unified McpServerConfig type works for both LLM and computer agents.
 * The SDK automatically converts the config to the appropriate format.
 */

/**
 * Demo 1: Filesystem MCP Server (stdio)
 *
 * Shows how to use the standard filesystem MCP server with both agent types.
 */
async function demo1_filesystemMcp() {
  console.log('=== Demo 1: Filesystem MCP Server ===\n');

  // Setup workspace
  const workspace = resolve('./tmp/mcp-demo');
  await mkdir(workspace, { recursive: true });

  console.log(`Workspace: ${workspace}\n`);

  // ========================================
  // Unified MCP Server Configuration
  // ========================================
  const mcpServers = [
    {
      type: 'stdio',
      name: 'filesystem',
      command: 'npx',
      args: [
        '@modelcontextprotocol/server-filesystem',
        workspace, // Allow access to our workspace
      ],
    },
  ];

  console.log('MCP Server Configuration:');
  console.log(JSON.stringify(mcpServers, null, 2));
  console.log();

  // ========================================
  // Example 1a: Computer Agent with MCP
  // ========================================
  console.log('Example 1a: Computer Agent with Filesystem MCP\n');

  const computerAgent = new Agent({
    name: 'ComputerWithMCP',
    agentType: 'computer',
    runtime: new LocalRuntime({ debug: false }),
    workspace,
    mcpServers, // ← Same config works for computer agents!
    instructions: 'You are a file management assistant with filesystem tools.',
  });

  console.log('Task: Create a project structure with multiple files\n');

  const result1 = await run(computerAgent, {
    input: `Create a basic Node.js project structure:
    - package.json with name "mcp-demo-project"
    - src/index.js with a hello world function
    - src/utils.js with a helper function
    - README.md with project description`,
  });

  console.log('✓ Computer agent completed\n');
  console.log(`Output: ${result1.finalOutput.substring(0, 200)}...\n`);
  console.log(`Thread ID: ${computerAgent.currentThreadId}\n`);

  // ========================================
  // Example 1b: LLM Agent with MCP
  // ========================================
  console.log('Example 1b: LLM Agent with Filesystem MCP\n');

  const llmAgent = new Agent({
    name: 'LLMWithMCP',
    agentType: 'llm',
    model: 'gpt-4o',
    mcpServers, // ← Same config works for LLM agents!
    instructions: `You are a code reviewer. When asked to review files, use the filesystem tools available to you to read the files and provide detailed feedback.`,
  });

  console.log('Task: Review the files created by the computer agent\n');

  const result2 = await run(llmAgent, {
    input: `Please review the package.json and src/index.js files in ${workspace}. Check for:
    1. Proper package.json structure
    2. Code quality in index.js
    3. Any improvements that could be made`,
  });

  console.log('✓ LLM agent completed\n');
  console.log(`Review:\n${result2.finalOutput}\n`);
}

/**
 * Demo 2: HTTP MCP Server
 *
 * Shows how to configure and use HTTP-based MCP servers.
 */
async function demo2_httpMcp() {
  console.log('=== Demo 2: HTTP MCP Server (Example Config) ===\n');

  // This is a configuration example - actual HTTP MCP server would need to be running
  const httpMcpConfig = [
    {
      type: 'http',
      name: 'notion',
      url: 'https://notion-mcp.example.com/mcp',
      bearerToken: process.env.NOTION_TOKEN, // Optional auth
    },
    {
      type: 'http',
      name: 'github',
      url: 'https://github-mcp.example.com/mcp',
      bearerToken: process.env.GITHUB_TOKEN,
    },
  ];

  console.log('HTTP MCP Server Configuration:');
  console.log(JSON.stringify(httpMcpConfig, null, 2));
  console.log();

  console.log('Key Points:');
  console.log('• type: "http" for remote MCP servers');
  console.log('• url: HTTP endpoint for the MCP server');
  console.log('• bearerToken: Optional authentication token');
  console.log('• Same config works for both LLM and computer agents\n');

  console.log('Example usage:\n');
  console.log('const agent = new Agent({');
  console.log('  agentType: "llm",  // or "computer"');
  console.log('  mcpServers: httpMcpConfig,');
  console.log('  // ... other config');
  console.log('});\n');
}

/**
 * Demo 3: Mixed MCP Servers
 *
 * Shows how to use both stdio and HTTP MCP servers together.
 */
async function demo3_mixedMcp() {
  console.log('=== Demo 3: Mixed MCP Servers (stdio + HTTP) ===\n');

  const workspace = resolve('./tmp/mixed-mcp-demo');
  await mkdir(workspace, { recursive: true });

  // Combine stdio and HTTP MCP servers
  const mixedMcpConfig = [
    // Local stdio server
    {
      type: 'stdio',
      name: 'filesystem',
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', workspace],
    },
    // Remote HTTP server (example - would need to be running)
    {
      type: 'http',
      name: 'api-docs',
      url: 'https://api-docs-mcp.example.com/mcp',
    },
  ];

  console.log('Mixed MCP Configuration:');
  console.log(JSON.stringify(mixedMcpConfig, null, 2));
  console.log();

  const agent = new Agent({
    name: 'MixedMCPAgent',
    agentType: 'computer',
    runtime: new LocalRuntime(),
    workspace,
    mcpServers: mixedMcpConfig,
    instructions: 'You have access to both local filesystem and remote API documentation.',
  });

  console.log('✓ Agent configured with multiple MCP servers');
  console.log(`✓ Workspace: ${workspace}`);
  console.log(`✓ Available tools: filesystem (local), api-docs (remote)\n`);

  console.log('This agent can:');
  console.log('• Read/write local files via filesystem MCP server');
  console.log('• Query remote API documentation via HTTP MCP server');
  console.log('• Combine information from both sources\n');
}

/**
 * Demo 4: MCP Server Validation
 *
 * Shows how the SDK validates MCP server configurations.
 */
async function demo4_validation() {
  console.log('=== Demo 4: MCP Configuration Validation ===\n');

  console.log('Valid Configurations:\n');

  // Valid stdio MCP
  const validStdio = {
    type: 'stdio',
    name: 'my-server',
    command: 'npx',
    args: ['@scope/mcp-server', 'arg1'],
  };

  // Valid HTTP MCP
  const validHttp = {
    type: 'http',
    name: 'my-http-server',
    url: 'https://example.com/mcp',
    bearerToken: 'optional-token',
  };

  console.log('✓ Stdio MCP:', JSON.stringify(validStdio, null, 2));
  console.log();
  console.log('✓ HTTP MCP:', JSON.stringify(validHttp, null, 2));
  console.log();

  console.log('Invalid Configurations (will fail):\n');
  console.log('✗ Missing name:');
  console.log('  { type: "stdio", command: "npx" }');
  console.log();
  console.log('✗ Wrong type:');
  console.log('  { type: "invalid", name: "server" }');
  console.log();
  console.log('✗ Stdio missing command:');
  console.log('  { type: "stdio", name: "server", args: [...] }');
  console.log();
  console.log('✗ HTTP missing url:');
  console.log('  { type: "http", name: "server" }');
  console.log();

  console.log('The SDK validates all MCP configurations at agent creation time.\n');
}

/**
 * Demo 5: How MCP Conversion Works
 *
 * Explains how the SDK converts MCP configs for different agent types.
 */
async function demo5_conversionDetails() {
  console.log('=== Demo 5: MCP Conversion Details ===\n');

  console.log('Unified Configuration (what you provide):');
  console.log(`
  const mcpServers = [{
    type: 'stdio',
    name: 'filesystem',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/workspace']
  }];
  `);

  console.log('For LLM Agents (agentType: "llm"):');
  console.log('  SDK converts to → MCPServer instance (OpenAI Agents SDK format)');
  console.log('  Tools become → Function tools available to the LLM');
  console.log('  Example: read_file(), write_file(), list_directory()');
  console.log();

  console.log('For Computer Agents (agentType: "computer"):');
  console.log('  SDK passes to → Codex SDK in its native format');
  console.log('  Tools available → Via Codex CLI MCP integration');
  console.log('  Example: same filesystem tools, executed via Codex');
  console.log();

  console.log('Key Insight:');
  console.log('  You write ONE config, the SDK handles the conversion!');
  console.log('  No duplicate configs, no manual conversion needed.\n');
}

/**
 * Main demo runner
 */
async function main() {
  console.log('=== MCP Integration Examples ===\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY required');
    console.log('\nSet your OpenAI API key:');
    console.log('  export OPENAI_API_KEY=sk-...\n');
    process.exit(1);
  }

  try {
    // Run filesystem MCP demo (actual working example)
    await demo1_filesystemMcp();

    console.log('─'.repeat(60) + '\n');

    // Show HTTP MCP configuration example
    await demo2_httpMcp();

    console.log('─'.repeat(60) + '\n');

    // Show mixed MCP configuration
    await demo3_mixedMcp();

    console.log('─'.repeat(60) + '\n');

    // Show validation rules
    await demo4_validation();

    console.log('─'.repeat(60) + '\n');

    // Explain conversion details
    await demo5_conversionDetails();

    console.log('=== Summary ===\n');
    console.log('✓ Demonstrated unified MCP configuration');
    console.log('✓ Showed stdio and HTTP MCP server types');
    console.log('✓ Tested with both LLM and computer agents');
    console.log('✓ Explained automatic conversion process');
    console.log('✓ Validated configuration requirements\n');

    console.log('Key Takeaways:');
    console.log('1. One McpServerConfig type for all agents');
    console.log('2. Supports stdio (local) and HTTP (remote) servers');
    console.log('3. Automatic conversion for each agent type');
    console.log('4. Configuration validated at agent creation');
    console.log('5. Same config works for LLM and computer agents\n');

    console.log('Next Steps:');
    console.log('• Install MCP servers: npm install -g @modelcontextprotocol/server-*');
    console.log('• Try custom MCP servers for your use case');
    console.log('• Combine multiple MCP servers for richer tooling');
    console.log('• Build HTTP MCP servers for remote capabilities\n');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);

    if (error.message?.includes('Cannot find module')) {
      console.log('\nMissing dependency. Install the filesystem MCP server:');
      console.log('  npm install -g @modelcontextprotocol/server-filesystem\n');
    } else if (error.message?.includes('OPENAI_API_KEY')) {
      console.log('\nSet your OpenAI API key:');
      console.log('  export OPENAI_API_KEY=sk-...\n');
    } else {
      console.error('\nFull error:', error);
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
