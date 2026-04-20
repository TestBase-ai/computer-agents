/**
 * ComputerAgentsClient - The Official Computer Agents SDK
 *
 * A clean, simple SDK for interacting with the Computer Agents Cloud API.
 * This SDK provides typed access to all API resources with streaming support.
 *
 * @example
 * ```typescript
 * import { ComputerAgentsClient } from 'computer-agents';
 *
 * const client = new ComputerAgentsClient();
 *
 * // Execute a task — that's it. No setup needed.
 * const result = await client.run('Create a REST API with Flask');
 * console.log(result.content);
 *
 * // With streaming events
 * const result2 = await client.run('Build a web scraper', {
 *   onEvent: (event) => console.log(event.type)
 * });
 *
 * // Continue the conversation
 * const followUp = await client.run('Add error handling', {
 *   threadId: result2.threadId
 * });
 * ```
 */

import { ApiClient, ApiClientError } from './cloud/ApiClient';
import type { ApiClientConfig } from './cloud/ApiClient';
import {
  ProjectsResource,
  EnvironmentsResource,
  ThreadsResource,
  AgentsResource,
  ResourcesResource,
  WebAppsResource,
  FunctionsResource,
  AuthResource,
  AgentRuntimesResource,
  DatabasesResource,
  SkillsResource,
  BudgetResource,
  BillingResource,
  SchedulesResource,
  TriggersResource,
  OrchestrationsResource,
  GitResource,
  FilesResource,
} from './cloud/resources';
import type {
  HealthCheck,
  Metrics,
  Project,
  Environment,
  MessageStreamEvent,
  AgentModel,
} from './cloud/types';

// Re-export types
export { ApiClientError };
export type { ApiClientConfig };

/**
 * Configuration for ComputerAgentsClient
 */
export interface ComputerAgentsClientConfig {
  /**
   * API key for authentication (required)
   * Can also be set via COMPUTER_AGENTS_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Base URL for the API
   * @default 'https://api.computer-agents.com'
   */
  baseUrl?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Request timeout in milliseconds
   * @default 60000 (1 minute)
   */
  timeout?: number;
}

/**
 * Options for the run() convenience method
 */
export interface RunOptions {
  /**
   * Computer ID to execute in.
   * The raw API route still uses `environmentId`.
   */
  environmentId?: string;

  /**
   * Product-level alias for `environmentId`.
   */
  computerId?: string;

  /**
   * Thread ID to continue (optional - creates new thread if not provided)
   */
  threadId?: string;

  /**
   * Agent configuration override
   */
  agentConfig?: {
    model?: AgentModel;
    instructions?: string;
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  };

  /**
   * Callback for streaming events
   */
  onEvent?: (event: MessageStreamEvent) => void;

  /**
   * Execution timeout in milliseconds
   * @default 600000 (10 minutes)
   */
  timeout?: number;
}

/**
 * Result from the run() method
 */
export interface RunResult {
  /**
   * The final response content
   */
  content: string;

  /**
   * The thread ID (for continuing conversations)
   */
  threadId: string;

  /**
   * Run details if available
   */
  run?: {
    id: string;
    status: string;
    tokens?: {
      input: number;
      output: number;
    };
  };
}

/**
 * ComputerAgentsClient - Complete SDK for Computer Agents Cloud API
 *
 * This is the main entry point for the SDK. It provides access to all API
 * resources through typed methods:
 *
 * - `threads` - Conversation management with SSE streaming
 * - `environments` / `computers` - Computer configuration and lifecycle
 * - `resources` - Deployable apps, functions, auth modules, and runtimes
 * - `webApps` / `functions` / `auth` / `runtimes` - Product-shaped resource managers
 * - `databases` - Managed database surfaces
 * - `skills` - Custom ACP skills
 * - `agents` - Agent configuration
 * - `files` - File management in computer workspaces
 * - `schedules` - Scheduled task management
 * - `billing` - Budget and usage tracking
 * - `git` - Git operations on computers (compatibility helper)
 *
 * For simple use cases, use the `run()` method which handles thread
 * creation and streaming automatically.
 */
export class ComputerAgentsClient {
  /**
   * Low-level API client (for advanced usage)
   * @internal
   */
  readonly api: ApiClient;

  /**
   * Thread (conversation) management
   *
   * Create threads for multi-turn conversations with agents.
   * Use sendMessage() for SSE streaming execution.
   *
   * @example
   * ```typescript
   * const thread = await client.threads.create({
   *   environmentId: 'env_xxx'
   * });
   *
   * const result = await client.threads.sendMessage(thread.id, {
   *   content: 'Fix the TypeScript errors',
   *   onEvent: (event) => console.log(event)
   * });
   * ```
   */
  readonly threads: ThreadsResource;

  /**
   * Environment management
   *
   * Create and manage isolated execution environments.
   * Environments define variables, secrets, MCP servers, and setup scripts.
   *
   * @example
   * ```typescript
   * const env = await client.environments.create({
   *   name: 'production',
   *   computeProfile: 'standard',
   *   internetAccess: true
   * });
   * ```
   */
  readonly environments: EnvironmentsResource;

  /**
   * Product-level alias for `environments`.
   */
  readonly computers: EnvironmentsResource;

  /**
   * Agent configuration
   *
   * Create and manage agent configurations with built-in or external models,
   * instructions, and enabled skills.
   *
   * @example
   * ```typescript
   * const agent = await client.agents.create({
   *   name: 'Code Assistant',
   *   model: 'claude-sonnet-4-5',
   *   instructions: 'You are a helpful coding assistant.'
   * });
   * ```
   */
  readonly agents: AgentsResource;

  /**
   * Managed resource surfaces such as web apps, functions, auth modules, and agent runtimes.
   */
  readonly resources: ResourcesResource;

  /**
   * First-class web app resource management.
   */
  readonly webApps: WebAppsResource;

  /**
   * First-class function resource management.
   */
  readonly functions: FunctionsResource;

  /**
   * First-class auth resource management.
   */
  readonly auth: AuthResource;

  /**
   * First-class agent runtime management.
   */
  readonly runtimes: AgentRuntimesResource;

  /**
   * Explicit alias for `runtimes`.
   */
  readonly agentRuntimes: AgentRuntimesResource;

  /**
   * Managed database surfaces and document operations.
   */
  readonly databases: DatabasesResource;

  /**
   * Custom skill management.
   */
  readonly skills: SkillsResource;

  /**
   * File operations
   *
   * Upload, download, and manage files in environment workspaces.
   * Files are scoped to environments.
   *
   * @example
   * ```typescript
   * // List files in an environment
   * const files = await client.files.listFiles('env_xxx');
   *
   * // Upload a file
   * await client.files.uploadFile({
   *   environmentId: 'env_xxx',
   *   filename: 'app.py',
   *   path: 'src',
   *   content: 'print("hello")'
   * });
   *
   * // Download a file
   * const content = await client.files.getFile('env_xxx', 'src/app.py');
   *
   * // Delete a file
   * await client.files.deleteFile('env_xxx', 'src/app.py');
   *
   * // Move/rename a file
   * await client.files.moveFile({
   *   environmentId: 'env_xxx',
   *   sourcePath: 'old.py',
   *   destPath: 'new.py'
   * });
   * ```
   */
  readonly files: FilesResource;

  /**
   * Scheduled tasks
   *
   * Create and manage scheduled task execution.
   *
   * @example
   * ```typescript
   * const schedule = await client.schedules.create({
   *   name: 'Daily Report',
   *   agentId: 'agent_xxx',
   *   agentName: 'Reporter',
   *   task: 'Generate daily report',
   *   scheduleType: 'recurring',
   *   cronExpression: '0 9 * * *'
   * });
   * ```
   */
  readonly schedules: SchedulesResource;

  /**
   * Event-driven triggers
   *
   * Create triggers that fire agents in response to events from
   * GitHub, Slack, email, webhooks, and more.
   *
   * @example
   * ```typescript
   * const trigger = await client.triggers.create({
   *   name: 'On Push to Main',
   *   environmentId: 'env_xxx',
   *   source: 'github',
   *   event: 'push',
   *   filters: { branch: 'main' },
   *   action: { type: 'send_message', message: 'Run tests and report results' }
   * });
   * ```
   */
  readonly triggers: TriggersResource;

  /**
   * Agent-to-agent orchestration
   *
   * Create multi-agent workflows where agents collaborate in parallel,
   * sequential, conditional, or map-reduce patterns.
   *
   * @example
   * ```typescript
   * const orch = await client.orchestrations.create({
   *   name: 'Code Review Pipeline',
   *   environmentId: 'env_xxx',
   *   strategy: 'sequential',
   *   steps: [
   *     { agentId: 'agent_lint', name: 'Lint' },
   *     { agentId: 'agent_test', name: 'Test' },
   *     { agentId: 'agent_review', name: 'Review' }
   *   ]
   * });
   * ```
   */
  readonly orchestrations: OrchestrationsResource;

  /**
   * Budget management
   *
   * Check and manage execution budgets.
   *
   * @example
   * ```typescript
   * const status = await client.budget.getStatus();
   * const canRun = await client.budget.canExecute();
   * ```
   */
  readonly budget: BudgetResource;

  /**
   * Billing and usage
   *
   * Access billing records and usage statistics.
   *
   * @example
   * ```typescript
   * const stats = await client.billing.getStats({ period: 'month' });
   * const records = await client.billing.listRecords({ limit: 10 });
   * ```
   */
  readonly billing: BillingResource;

  /**
   * Git operations
   *
   * Perform git operations on cloud workspaces.
   *
   * @example
   * ```typescript
   * const diff = await client.git.diff('env_xxx');
   * await client.git.commit('env_xxx', { message: 'Add feature' });
   * await client.git.push('env_xxx');
   * ```
   */
  readonly git: GitResource;

  /**
   * Project access (internal - use files/resources/databases for data operations)
   * @internal
   */
  readonly projects: ProjectsResource;

  /**
   * Cached default environment ID (populated on first run without environmentId)
   * @internal
   */
  private _defaultEnvironmentId: string | null = null;

  constructor(config: ComputerAgentsClientConfig = {}) {
    // Get API key from config or environment variable
    const apiKey = config.apiKey
      || process.env.COMPUTER_AGENTS_API_KEY
      || process.env.TESTBASE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ComputerAgentsClient requires an API key. Provide it via:\n' +
        '1. Constructor: new ComputerAgentsClient({ apiKey: "..." })\n' +
        '2. Environment variable: COMPUTER_AGENTS_API_KEY'
      );
    }

    // Create low-level API client
    this.api = new ApiClient({
      apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      debug: config.debug,
    });

    // Initialize all resource managers
    this.threads = new ThreadsResource(this.api);
    this.environments = new EnvironmentsResource(this.api);
    this.computers = this.environments;
    this.agents = new AgentsResource(this.api);
    this.resources = new ResourcesResource(this.api);
    this.webApps = new WebAppsResource(this.api);
    this.functions = new FunctionsResource(this.api);
    this.auth = new AuthResource(this.api);
    this.runtimes = new AgentRuntimesResource(this.api);
    this.agentRuntimes = this.runtimes;
    this.databases = new DatabasesResource(this.api);
    this.skills = new SkillsResource(this.api);
    this.files = new FilesResource(this.api);
    this.schedules = new SchedulesResource(this.api);
    this.triggers = new TriggersResource(this.api);
    this.orchestrations = new OrchestrationsResource(this.api);
    this.budget = new BudgetResource(this.api);
    this.billing = new BillingResource(this.api);
    this.git = new GitResource(this.api);
    this.projects = new ProjectsResource(this.api);
  }

  // =========================================================================
  // High-Level Convenience Methods
  // =========================================================================

  /**
   * Execute a task with automatic thread management
   *
   * This is the simplest way to run an agent task. It handles:
   * - Auto-creating a default computer (if no computer/environment ID is provided)
   * - Creating a thread (if threadId not provided)
   * - Sending the message with SSE streaming
   * - Returning the result with thread ID for follow-ups
   *
   * @param task - The task to execute (e.g., "Create a REST API with Flask")
   * @param options - Execution options (all optional)
   * @returns The execution result with content and thread ID
   *
   * @example
   * ```typescript
   * // Simplest usage — no setup needed
   * const result = await client.run('Create hello.py');
   * console.log(result.content);
   *
   * // With streaming progress
   * const result = await client.run('Build a REST API', {
   *   onEvent: (event) => {
   *     if (event.type === 'response.item.completed') {
   *       console.log(event.item);
   *     }
   *   }
   * });
   *
   * // Continue the conversation
   * const followUp = await client.run('Add authentication', {
   *   threadId: result.threadId
   * });
   *
   * // Explicit computer
   * const result = await client.run('Deploy', {
   *   computerId: 'env_xxx'
   * });
   * ```
   */
  async run(task: string, options: RunOptions = {}): Promise<RunResult> {
    // Auto-resolve environment if not provided
    const environmentId = options.computerId || options.environmentId || await this._ensureDefaultEnvironment();

    // Create or reuse thread
    let threadId = options.threadId;
    if (!threadId) {
      const thread = await this.threads.create({
        environmentId,
      });
      threadId = thread.id;
    }

    // Send message and stream response
    const result = await this.threads.sendMessage(threadId, {
      content: task,
      agentConfig: options.agentConfig,
      onEvent: options.onEvent,
      timeout: options.timeout,
    });

    return {
      content: result.content,
      threadId,
      run: result.run,
    };
  }

  /**
   * Return the cached default environment ID, creating one if needed.
   * @internal
   */
  private async _ensureDefaultEnvironment(): Promise<string> {
    if (this._defaultEnvironmentId) {
      return this._defaultEnvironmentId;
    }

    const environments = await this.environments.list();
    let environment = environments.find(e => e.isDefault);

    if (!environment) {
      environment = await this.environments.create({
        name: 'default',
        internetAccess: true,
        isDefault: true,
      });
    }

    this._defaultEnvironmentId = environment.id;
    return this._defaultEnvironmentId;
  }

  /**
   * Quick setup with default computer
   *
   * Creates a default computer if none exists, returning both
   * the project and computer ready for execution.
   *
   * Note: You usually don't need to call this directly. `run()` auto-creates
   * a default environment when `environmentId` is omitted.
   *
   * @example
   * ```typescript
   * const { project, computer } = await client.quickSetup({
   *   internetAccess: true
   * });
   * ```
   */
  async quickSetup(options: {
    internetAccess?: boolean;
    environmentName?: string;
    computerName?: string;
  } = {}): Promise<{
    project: Project;
    environment: Environment;
    computer: Environment;
  }> {
    // Get the project (bound to API key)
    const project = await this.projects.get();

    // Check for existing default environment
    const environments = await this.environments.list();
    let environment = environments.find(e => e.isDefault);

    // Create default environment if none exists
    if (!environment) {
      environment = await this.environments.create({
        name: options.computerName || options.environmentName || 'default',
        internetAccess: options.internetAccess ?? true,
        isDefault: true,
      });
    }

    return { project, environment, computer: environment };
  }

  // =========================================================================
  // Health & Monitoring
  // =========================================================================

  /**
   * Check API health status
   */
  async health(): Promise<HealthCheck> {
    return this.api.get<HealthCheck>('/health');
  }

  /**
   * Get API metrics
   */
  async metrics(): Promise<Metrics> {
    return this.api.get<Metrics>('/metrics');
  }

  /**
   * Get API base URL
   */
  getBaseUrl(): string {
    return this.api.getBaseUrl();
  }
}

// ============================================================================
// Backwards Compatibility Aliases
// ============================================================================

/**
 * @deprecated Use ComputerAgentsClient instead
 */
export { ComputerAgentsClient as CloudClient };

/**
 * @deprecated Use ComputerAgentsClient instead
 */
export { ComputerAgentsClient as TestbaseClient };
