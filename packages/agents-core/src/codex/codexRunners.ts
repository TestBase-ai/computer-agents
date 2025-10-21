/**
 * Codex Agent Runners
 *
 * Executes computer-use agents via Codex CLI.
 * Self-contained with no external orchestration dependencies.
 */

import process from 'node:process';
import { spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  rm,
} from 'node:fs/promises';
import { resolve, isAbsolute, join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const DEFAULT_CODEX_CONFIG = join(homedir(), '.codex', 'config.toml');

function normalizeWorkspace(path: string): string {
  return isAbsolute(path) ? path : resolve(path);
}

function createSessionId(sessionId?: string): string {
  return sessionId ?? `session-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

/**
 * Run computer-use agent via Codex CLI.
 */
async function runComputerAgent({
  repo,
  sessionId,
  task,
}: RunOptions): Promise<RunResultPayload> {
  const resolvedSessionId = createSessionId(sessionId);
  const workingDirectory = normalizeWorkspace(repo);
  await mkdir(workingDirectory, { recursive: true });

  // Execute Codex CLI using 'codex exec' subcommand
  const codexArgs = [
    'exec',
    '-C', workingDirectory,  // Set working directory
    '-c', 'mcp.servers=[]',  // Disable MCP servers to avoid connection errors during tests
    '--dangerously-bypass-approvals-and-sandbox',  // Auto-execute for tests
    task,
  ];

  const output = await new Promise<string>((resolve, reject) => {
    const codex = spawn('codex', codexArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    codex.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    codex.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    codex.on('close', (code) => {
      // Accept exit code 1 if the error is only about MCP servers failing to connect
      // This happens when user has MCP servers in global config that aren't available
      const isMcpError = stderr.includes('MCP client') && stderr.includes('failed to start');

      if (code !== 0 && !isMcpError) {
        reject(new Error(`Codex CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    codex.on('error', (error) => {
      reject(new Error(`Failed to spawn Codex CLI: ${error.message}`));
    });
  });

  return { output, sessionId: resolvedSessionId };
}

type RunOptions = {
  repo: string;
  sessionId?: string;
  task: string;
};

type RunResultPayload = {
  output: string;
  sessionId: string;
};

/**
 * Run a computer-use agent via Codex CLI with optional MCP server injection.
 */
export async function runCodexAgent({
  repo,
  task,
  sessionId,
  mcpServers,
  model,
  reasoningEffort,
}: {
  repo: string;
  task: string;
  sessionId?: string;
  mcpServers?: CodexMcpServerConfig[];
  model?: string;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}): Promise<RunResultPayload> {
  return withInjectedCodexConfig(
    { servers: mcpServers ?? [], model, reasoningEffort },
    async () => runComputerAgent({ repo, task, sessionId })
  );
}

/**
 * Execute function with temporarily injected Codex configuration.
 */
async function withInjectedCodexConfig<T>(
  {
    servers,
    model,
    reasoningEffort,
  }: {
    servers: CodexMcpServerConfig[];
    model?: string;
    reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  },
  fn: () => Promise<T>
): Promise<T> {
  if (!servers.length && !model && !reasoningEffort) {
    return fn();
  }

  const basePath = process.env.CODEX_CONFIG ?? DEFAULT_CODEX_CONFIG;
  let baseContent = '';
  try {
    baseContent = await readFile(basePath, 'utf8');
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'testbase-codex-config-'));
  const tempConfigPath = join(tmpDir, 'config.toml');
  let finalContent = baseContent;

  if (finalContent.length) {
    if (!finalContent.endsWith('\n')) {
      finalContent += '\n';
    }
    finalContent += '\n# Injected by testbase-agents\n';
  } else {
    finalContent = '# Injected by testbase-agents\n';
  }

  if (model) {
    finalContent += `model = ${tomlString(model)}\n`;
  }
  if (reasoningEffort) {
    finalContent += `model_reasoning_effort = ${tomlString(reasoningEffort)}\n`;
  }
  if (servers.length) {
    finalContent += renderMcpServers(servers);
  }

  await writeFile(tempConfigPath, finalContent, 'utf8');

  const previousConfig = process.env.CODEX_CONFIG;
  process.env.CODEX_CONFIG = tempConfigPath;
  try {
    return await fn();
  } finally {
    if (previousConfig === undefined) {
      delete process.env.CODEX_CONFIG;
    } else {
      process.env.CODEX_CONFIG = previousConfig;
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Render MCP servers as TOML configuration.
 */
function renderMcpServers(servers: CodexMcpServerConfig[]): string {
  const used = new Set<string>();
  return servers
    .map((server, index) => renderSingleMcpServer(server, index, used))
    .join('\n');
}

function renderSingleMcpServer(
  server: CodexMcpServerConfig,
  index: number,
  used: Set<string>
): string {
  const label = ensureUniqueName(
    sanitizeName(server.name ?? `codex_server_${index}`),
    used
  );
  const lines: string[] = [`[mcp_servers.${label}]`];

  if (isStdioServer(server)) {
    lines.push(`command = ${tomlString(server.command)}`);
    if (server.args?.length) {
      lines.push(`args = [${server.args.map(tomlString).join(', ')}]`);
    }
    if (server.startupTimeoutSec !== undefined) {
      lines.push(`startup_timeout_sec = ${server.startupTimeoutSec}`);
    }
    if (server.toolTimeoutSec !== undefined) {
      lines.push(`tool_timeout_sec = ${server.toolTimeoutSec}`);
    }
    if (server.env && Object.keys(server.env).length) {
      lines.push('', `[mcp_servers.${label}.env]`);
      for (const [key, value] of Object.entries(server.env)) {
        lines.push(`${key} = ${tomlString(value)}`);
      }
    }
  } else {
    lines.push(`url = ${tomlString(server.url)}`);
    if (server.bearerToken) {
      lines.push(`bearer_token = ${tomlString(server.bearerToken)}`);
    }
    if (server.startupTimeoutSec !== undefined) {
      lines.push(`startup_timeout_sec = ${server.startupTimeoutSec}`);
    }
    if (server.toolTimeoutSec !== undefined) {
      lines.push(`tool_timeout_sec = ${server.toolTimeoutSec}`);
    }
    if (server.experimentalUseRmcpClient !== undefined) {
      lines.push(
        `experimental_use_rmcp_client = ${server.experimentalUseRmcpClient ? 'true' : 'false'}`
      );
    }
    if (server.headers && Object.keys(server.headers).length) {
      lines.push('', `[mcp_servers.${label}.headers]`);
      for (const [key, value] of Object.entries(server.headers)) {
        lines.push(`${key} = ${tomlString(value)}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function isStdioServer(
  server: CodexMcpServerConfig
): server is StdIoMcpServerConfig {
  return 'command' in server;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function ensureUniqueName(name: string, used: Set<string>): string {
  let candidate = name || 'codex_server';
  let counter = 1;
  while (used.has(candidate)) {
    candidate = `${name}_${counter++}`;
  }
  used.add(candidate);
  return candidate;
}

type StdIoMcpServerConfig = {
  name?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  startupTimeoutSec?: number;
  toolTimeoutSec?: number;
};

type HttpMcpServerConfig = {
  name?: string;
  url: string;
  bearerToken?: string;
  headers?: Record<string, string>;
  startupTimeoutSec?: number;
  toolTimeoutSec?: number;
  experimentalUseRmcpClient?: boolean;
};

export type CodexMcpServerConfig = StdIoMcpServerConfig | HttpMcpServerConfig;
