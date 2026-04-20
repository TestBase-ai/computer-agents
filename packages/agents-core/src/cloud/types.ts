/**
 * Cloud API Types
 *
 * These types mirror the cloud infrastructure API exactly.
 * Base URL: https://api.computer-agents.com
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Project Types
// ============================================================================

export type ProjectType = 'cloud' | 'local' | 'synced';

export interface ProjectSource {
  type: 'github' | 'gitlab' | 'local';
  url?: string;
  branch?: string;
  path?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  sources?: ProjectSource[];
  userId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateProjectParams {
  id?: string;
  name: string;
  description?: string;
  type?: ProjectType;
  sources?: ProjectSource[];
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface ProjectStats {
  threadCount: number;
  runCount: number;
  totalTokens: number;
  totalCost: number;
  storageBytes: number;
}

// ============================================================================
// Environment Types
// ============================================================================

export type EnvironmentStatus = 'stopped' | 'building' | 'running' | 'error';
export type BuildStatus = 'pending' | 'building' | 'ready' | 'failed';

export interface EnvironmentVariable {
  key: string;
  value: string;
}

export interface McpServer {
  type: 'stdio' | 'http';
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  bearerToken?: string;
  env?: Record<string, string>;
  enabled?: boolean;
}

/**
 * Runtime version configuration
 * Keys are runtime names (python, nodejs, go, etc.)
 * Values are version strings
 */
export interface RuntimeConfig {
  python?: string;
  nodejs?: string;
  go?: string;
  php?: string;
  java?: string;
  ruby?: string;
  rust?: string;
}

/**
 * Package configuration by type
 */
export interface PackagesConfig {
  system?: string[];  // apt packages
  python?: string[];  // pip packages
  node?: string[];    // npm packages
}

/**
 * Available runtimes with their supported versions
 */
export interface AvailableRuntimes {
  python: string[];
  nodejs: string[];
  go: string[];
  php: string[];
  java: string[];
  ruby: string[];
  rust: string[];
}

export type EnvironmentComputeProfileId = 'lite' | 'standard' | 'power' | 'desktop';

export interface EnvironmentComputeResources {
  cpuCores: number;
  memoryMb: number;
}

export interface EnvironmentPricingMetadata {
  minutePrice?: number;
  [key: string]: unknown;
}

export interface EnvironmentMetadata {
  computeProfile?: EnvironmentComputeProfileId;
  computeResources?: EnvironmentComputeResources;
  pricing?: EnvironmentPricingMetadata;
  guiEnabled?: boolean;
  officeAppsEnabled?: boolean;
  [key: string]: unknown;
}

export interface Environment {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: EnvironmentStatus;

  // Runtime & Package Configuration
  baseImage?: string;
  dockerfileExtensions?: string;
  runtimes?: RuntimeConfig;
  packages?: PackagesConfig;

  // Environment Configuration
  environmentVariables?: EnvironmentVariable[];
  secrets?: EnvironmentVariable[];
  setupScripts?: string[];
  mcpServers?: McpServer[];
  documentation?: string[];
  internetAccess?: boolean;

  // Build Status
  buildStatus?: BuildStatus;
  buildHash?: string;
  buildError?: string;
  buildLogs?: string;
  lastBuildAt?: string;
  imageTag?: string;
  metadata?: EnvironmentMetadata | null;

  // Metadata
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  /** @deprecated Use userId instead */
  projectId?: string;
}

/**
 * ACP product surfaces refer to environments as computers.
 * The underlying API still uses `environment` in route names.
 */
export type Computer = Environment;

export interface CreateEnvironmentParams {
  name: string;
  projectId?: string | null;
  description?: string;
  runtimes?: RuntimeConfig;
  packages?: PackagesConfig;
  dockerfileExtensions?: string;
  environmentVariables?: EnvironmentVariable[];
  secrets?: EnvironmentVariable[];
  setupScripts?: string[];
  mcpServers?: McpServer[];
  documentation?: string[];
  internetAccess?: boolean;
  isDefault?: boolean;
  computeProfile?: EnvironmentComputeProfileId;
  guiEnabled?: boolean;
  officeAppsEnabled?: boolean;
  metadata?: EnvironmentMetadata;
}

export interface UpdateEnvironmentParams {
  name?: string;
  projectId?: string | null;
  description?: string;
  runtimes?: RuntimeConfig;
  packages?: PackagesConfig;
  dockerfileExtensions?: string;
  environmentVariables?: EnvironmentVariable[];
  secrets?: EnvironmentVariable[];
  setupScripts?: string[];
  mcpServers?: McpServer[];
  internetAccess?: boolean;
  isDefault?: boolean;
  computeProfile?: EnvironmentComputeProfileId;
  guiEnabled?: boolean;
  officeAppsEnabled?: boolean;
  metadata?: EnvironmentMetadata;
}

export type CreateComputerParams = CreateEnvironmentParams;
export type UpdateComputerParams = UpdateEnvironmentParams;

export interface ContainerStatus {
  status: EnvironmentStatus;
  uptime?: number;
  memory?: {
    used: number;
    limit: number;
  };
  cpu?: {
    usage: number;
  };
  containerId?: string;
  startedAt?: string;
  lastUsedAt?: string;
  executionCount?: number;
  message?: string;
}

export interface BuildResult {
  success: boolean;
  imageTag: string;
  buildHash?: string;
  logs?: string;
  error?: string;
  duration?: number;
  environmentId?: string;
  environmentName?: string;
}

export interface BuildStatusResult {
  buildStatus: BuildStatus;
  buildHash?: string;
  imageTag?: string;
  lastBuildAt?: string;
  buildError?: string;
}

export interface BuildLogsResult {
  logs: string;
  buildStatus: BuildStatus;
}

export interface TestBuildResult {
  success: boolean;
  logs: string;
  duration: number;
  imageTag?: string;
}

export interface DockerfileResult {
  baseImage: string;
  dockerfileExtensions?: string;
  effectiveDockerfile: string;
}

export interface ValidateDockerfileResult {
  valid: boolean;
  warnings: string[];
  effectiveDockerfile: string;
}

export interface InstallPackagesResult {
  environment: Environment;
  installed: string[];
}

export type PackageType = 'system' | 'python' | 'node';

export interface StartContainerParams {
  workspaceId?: string;
  cpus?: number;
  memory?: string;
}

export interface StartContainerResult {
  success: boolean;
  containerName: string;
  containerId: string;
  imageTag: string;
  workspacePath: string;
}

export interface EnvironmentSnapshot {
  id: string;
  environmentId: string;
  sourceThreadId?: string | null;
  sourceStepId?: string | null;
  parentSnapshotId?: string | null;
  ledgerCommitSha?: string;
  changedPaths?: string[];
  additions?: number;
  deletions?: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

export type EnvironmentChangeKind = 'created' | 'modified' | 'deleted';
export type EnvironmentChangeOperation = 'created' | 'uploaded' | 'modified' | 'deleted';
export type EnvironmentChangeSourceKind = 'thread' | 'manual';

export interface EnvironmentChangeFileRecord {
  path: string;
  name: string;
  changeKind: EnvironmentChangeKind;
  operation: EnvironmentChangeOperation;
  entryType: 'file' | 'directory';
  previousPath?: string | null;
  additions: number;
  deletions: number;
  diff?: string | null;
  fileContent?: string | null;
}

export interface EnvironmentChangeEntry {
  id: string;
  snapshotId: string;
  environmentId: string;
  createdAt: string;
  title: string;
  routeSource?: string | null;
  sourceKind: EnvironmentChangeSourceKind;
  sourceThreadId?: string | null;
  sourceStepId?: string | null;
  threadTitle?: string | null;
  stepTitle?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  additions: number;
  deletions: number;
  files: EnvironmentChangeFileRecord[];
}

export interface EnvironmentChangeListResponse {
  object: 'list';
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
  data: EnvironmentChangeEntry[];
}

export interface SnapshotFileEntry {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number | null;
}

export interface EnvironmentSnapshotFilesResponse {
  object: 'list';
  environmentId: string;
  snapshotId: string;
  prefix?: string | null;
  data: SnapshotFileEntry[];
}

export interface EnvironmentSnapshotDiffResponse {
  environmentId: string;
  snapshotId: string;
  parentSnapshotId?: string | null;
  fromCommitSha?: string | null;
  toCommitSha: string;
  path?: string | null;
  diff: string;
  changedPaths: string[];
  additions: number;
  deletions: number;
}

export interface EnvironmentSnapshotFileResponse {
  path: string;
  snapshotId: string | null;
  content: string;
}

export interface EnvironmentForkFromSnapshotResponse {
  environment: Environment;
  snapshot: EnvironmentSnapshot | null;
  sourceSnapshotId: string;
}

// ============================================================================
// Thread Types
// ============================================================================

export type ThreadStatus = 'active' | 'running' | 'completed' | 'failed' | 'archived' | 'cancelled' | 'deleted';

export interface ThreadMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Thread {
  id: string;
  projectId: string;
  environmentId: string;
  agentId?: string;
  title?: string;
  status: ThreadStatus;
  messages?: ThreadMessage[];
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateThreadParams {
  environmentId: string;
  agentId?: string;
  title?: string;
}

export interface UpdateThreadParams {
  title?: string;
  status?: ThreadStatus;
}

export interface ListThreadsParams extends PaginationParams {
  environmentId?: string;
  status?: ThreadStatus;
}

export interface CopyThreadParams {
  /**
   * Custom title for the copied thread.
   * If not provided, defaults to "[Original Title] Copy"
   */
  title?: string;
}

export interface SearchThreadsParams {
  /** Search query (required) */
  query: string;
  /** Filter by environment */
  environmentId?: string;
  /** Filter by status */
  status?: ThreadStatus | 'all';
  /** Max results to return (default: 20, max: 100) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Include matching messages in results */
  includeMessages?: boolean;
}

export interface SearchThreadResult {
  thread: Thread & {
    environmentName?: string;
    agentName?: string | null;
  };
  score: number;
  highlights: string[];
  matchingMessages?: ThreadMessage[];
}

export interface SearchThreadsResponse {
  results: SearchThreadResult[];
  total: number;
  hasMore: boolean;
  searchMetadata: {
    query: string;
    queryType: string;
    processingTimeMs: number;
  };
}

export interface ThreadLogEntry {
  role: 'user' | 'assistant' | 'execution_log';
  content: string;
  timestamp?: string;
  relativeTime?: string;
}

export interface ResearchSession {
  id: string;
  threadId: string;
  status: string;
  progress?: number;
  query?: string;
  results?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageParams {
  content: string;
  mcpServers?: McpServer[];
  envVars?: Record<string, string>;
  secrets?: EnvironmentVariable[];
  setupScripts?: string[];
  agentConfig?: AgentConfig;
  internetAccess?: boolean;
  attachments?: unknown[];
  runId?: string;
}

export interface AgentConfig {
  model?: AgentModel;
  instructions?: string;
  reasoningEffort?: ReasoningEffort;
}

// SSE Event Types
export interface StreamEvent {
  type: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ResponseStartedEvent extends StreamEvent {
  type: 'response.started';
}

export interface ResponseItemCompletedEvent extends StreamEvent {
  type: 'response.item.completed';
  item: {
    type: 'text' | 'tool_call' | 'reasoning' | 'file_change';
    content?: string;
    [key: string]: unknown;
  };
}

export interface ResponseCompletedEvent extends StreamEvent {
  type: 'response.completed';
  response: {
    content: string;
    [key: string]: unknown;
  };
}

export interface StreamCompletedEvent extends StreamEvent {
  type: 'stream.completed';
  run: {
    id: string;
    status: string;
    tokens?: {
      input: number;
      output: number;
    };
    [key: string]: unknown;
  };
}

export interface StreamErrorEvent extends StreamEvent {
  type: 'stream.error';
  error: string;
  message?: string;
}

export type MessageStreamEvent =
  | ResponseStartedEvent
  | ResponseItemCompletedEvent
  | ResponseCompletedEvent
  | StreamCompletedEvent
  | StreamErrorEvent;

// ============================================================================
// Run Types
// ============================================================================

export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

export interface Run {
  id: string;
  projectId: string;
  threadId?: string;
  environmentId?: string;
  agentId?: string;
  agentName?: string;
  name: string;
  task: string;
  prompt?: string;
  status: RunStatus;
  duration?: number;
  cost?: number;
  tokenUsage?: TokenUsage;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
}

export interface CreateRunParams {
  agentId?: string;
  agentName: string;
  name: string;
  task: string;
  prompt?: string;
  title?: string;
  workspaceName?: string;
  workspaceId?: string;
  contextId?: string;
  environmentId?: string;
  environmentName?: string;
  attachments?: unknown[];
  metadata?: Record<string, unknown>;
  threadId?: string;
}

export interface UpdateRunParams {
  name?: string;
  status?: RunStatus;
  duration?: number;
  cost?: number;
  logs?: unknown[];
  metadata?: Record<string, unknown>;
  tokenUsage?: TokenUsage;
  title?: string;
}

export interface ListRunsParams extends PaginationParams {
  threadId?: string;
  status?: RunStatus;
  since?: string;
}

export interface RunLogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface RunDiff {
  path: string;
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  diff: string;
  additions?: number;
  deletions?: number;
}

// ============================================================================
// Agent Types
// ============================================================================

export type BuiltinAgentModel =
  | 'claude-opus-4-7'
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'
  | 'gemini-3-flash'
  | 'gemini-3-1-pro';

export type ExternalAgentModel = `external:${string}`;

/**
 * Agent model identifiers can refer to built-in managed models or
 * workspace-connected external inference endpoints.
 */
export type AgentModel = BuiltinAgentModel | ExternalAgentModel | (string & {});

/**
 * Reasoning effort level for extended thinking.
 */
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Deep research model options (for research skill).
 */
export type DeepResearchModel = 'gemini-3-flash-preview' | 'gemini-3-pro-preview';

export interface AgentBinary {
  path: string;
  args?: string[];
}

export interface CloudAgent {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  model: AgentModel;
  instructions?: string;
  binary?: AgentBinary;
  reasoningEffort?: ReasoningEffort;
  enabledSkills?: string[];
  deepResearchModel?: DeepResearchModel;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateAgentParams {
  name: string;
  description?: string;
  model: AgentModel;
  instructions?: string;
  binary?: AgentBinary;
  reasoningEffort?: ReasoningEffort;
  enabledSkills?: string[];
  deepResearchModel?: DeepResearchModel;
  metadata?: Record<string, unknown>;
}

export interface UpdateAgentParams {
  name?: string;
  description?: string;
  model?: AgentModel;
  instructions?: string;
  binary?: AgentBinary;
  reasoningEffort?: ReasoningEffort;
  enabledSkills?: string[];
  deepResearchModel?: DeepResearchModel;
  metadata?: Record<string, unknown>;
}

export interface AgentModelCatalogEntry {
  id: string;
  label?: string;
  description?: string;
  intelligence?: string;
  contextWindow?: string;
  speed?: string;
  source?: 'managed' | 'external' | string;
  providerType?: string | null;
  requiredTier?: string;
  locked?: boolean;
}

export interface AgentAnalyticsBucket {
  label: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  p95RuntimeMs?: number;
}

export interface AgentAnalyticsResponse {
  agentId: string;
  summary?: Record<string, unknown>;
  charts?: {
    activity24h?: AgentAnalyticsBucket[];
    [key: string]: unknown;
  };
}

// ============================================================================
// Resources, Databases, and Skills
// ============================================================================

export type ResourceKind = 'web_app' | 'function' | 'auth' | 'agent_runtime';
export type ResourceAuthMode = 'public' | 'private';
export type ResourceStatus = 'draft' | 'deploying' | 'deployed' | 'failed' | 'inactive';

export interface Resource {
  id: string;
  userId?: string;
  projectId?: string | null;
  name: string;
  description?: string;
  kind: ResourceKind;
  sourceType?: string | null;
  sourceEnvironmentId?: string | null;
  sourcePath?: string | null;
  region?: string | null;
  runtime?: string | null;
  authMode?: ResourceAuthMode | null;
  serviceUrl?: string | null;
  customDomain?: string | null;
  cloudRunServiceName?: string | null;
  imageUrl?: string | null;
  status?: ResourceStatus | null;
  lastDeployedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateResourceParams {
  projectId?: string | null;
  name: string;
  description?: string;
  kind: ResourceKind;
  sourceType?: string;
  sourceEnvironmentId?: string | null;
  sourcePath?: string | null;
  region?: string;
  runtime?: string;
  authMode?: ResourceAuthMode;
  serviceUrl?: string | null;
  customDomain?: string | null;
  cloudRunServiceName?: string | null;
  imageUrl?: string | null;
  status?: ResourceStatus;
  lastDeployedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateResourceParams extends Partial<CreateResourceParams> {}

export interface ResourceAnalyticsResponse {
  serverId: string;
  serviceName?: string | null;
  available?: boolean;
  summary?: Record<string, unknown>;
  charts?: Record<string, unknown>;
  recentRequests?: Array<Record<string, unknown>>;
  deployment?: Record<string, unknown> | null;
}

export interface ResourceLogEntry {
  timestamp?: string | null;
  severity?: string | null;
  stream?: string | null;
  message?: string | null;
  method?: string | null;
  path?: string | null;
  status?: number | null;
}

export interface ResourceBinding {
  id?: string;
  targetType?: 'database' | 'auth' | 'agent_runtime' | string;
  targetId?: string;
  alias?: string;
  accessMode?: string;
  metadata?: Record<string, unknown> | null;
}

export interface Database {
  id: string;
  userId?: string;
  projectId?: string | null;
  name: string;
  description?: string;
  location?: string;
  status?: 'active' | 'provisioning' | 'error' | string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDatabaseParams {
  projectId?: string | null;
  name: string;
  description?: string;
  location?: string;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateDatabaseParams extends Partial<CreateDatabaseParams> {
  status?: 'active' | 'provisioning' | 'error' | string;
}

export interface DatabaseCollection {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseDocument {
  id: string;
  data: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export type SkillCategory = 'research' | 'creative' | 'productivity' | 'development' | 'custom';

export interface SkillFile {
  name: string;
  content: string;
  language?: string;
}

export interface Skill {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  markdown?: string;
  files?: SkillFile[];
  icon?: string;
  category?: SkillCategory;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSkillParams {
  name: string;
  description?: string;
  markdown?: string;
  files?: SkillFile[];
  icon?: string;
  category?: SkillCategory;
  isActive?: boolean;
}

export interface UpdateSkillParams extends Partial<CreateSkillParams> {}

// ============================================================================
// Budget & Billing Types
// ============================================================================

export interface BudgetStatus {
  balance: number;
  spent: number;
  limit: number;
  remaining: number;
}

export interface CanExecuteResult {
  canExecute: boolean;
  reason?: string;
}

export interface IncreaseBudgetParams {
  amount: number;
  description?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paymentMethod?: string;
}

export interface IncreaseBudgetResult {
  success: boolean;
  budget: {
    previousBalance: number;
    addedAmount: number;
    newBalance: number;
  };
}

export interface BillingRecord {
  id: string;
  type: 'execution' | 'credit' | 'mcp_usage' | 'adjustment';
  amount: number;
  runId?: string;
  description?: string;
  createdAt: string;
}

export interface ListBillingRecordsParams extends PaginationParams {
  since?: string;
  until?: string;
  type?: BillingRecord['type'];
}

export interface BillingAccount {
  apiKeyId: string;
  type: 'standard' | 'internal';
  status: 'active' | 'suspended';
  monthlyBudget?: number;
  currentBalance: number;
  billingEmail?: string;
  createdAt: string;
}

export interface UsageStats {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  totalCost: number;
  totalTokens: number;
  totalRuns: number;
  breakdown?: Record<string, {
    cost: number;
    tokens: number;
    runs: number;
  }>;
}

export interface UsageStatsParams {
  period?: 'day' | 'week' | 'month' | 'year';
  breakdown?: 'project' | 'model' | 'agent';
}

// ============================================================================
// File Types
// ============================================================================

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  mimeType?: string;
  modifiedAt: string;
}

export interface ListFilesParams {
  path?: string;
  environmentId?: string;
  recursive?: boolean;
}

export interface UploadFileParams {
  path: string;
  content: string | Buffer;
  contentType?: string;
  environmentId?: string;
}

export interface CreateDirectoryParams {
  path: string;
  environmentId?: string;
}

// ============================================================================
// Git Types
// ============================================================================

export interface GitDiffFile {
  path: string;
  additions: number;
  deletions: number;
  changes: string;
}

export interface GitDiffResult {
  diffs: GitDiffFile[];
  stats?: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

export interface GitCommitParams {
  message: string;
  author?: {
    name: string;
    email: string;
  };
  files?: string[];
}

export interface GitCommitResult {
  success: boolean;
  commit: {
    sha: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    timestamp: string;
    filesChanged: number;
  };
}

export interface GitPushParams {
  remote?: string;
  branch?: string;
  force?: boolean;
}

export interface GitPushResult {
  success: boolean;
  push: {
    remote: string;
    branch: string;
    commits: number;
    url?: string;
  };
}

// ============================================================================
// Schedule Types
// ============================================================================

export type ScheduleType = 'one-time' | 'recurring';

export interface Schedule {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  agentId: string;
  agentName: string;
  task: string;
  workspaceId?: string;
  workspaceName?: string;
  contextId?: string;
  contextName?: string;
  environmentId?: string;
  environmentName?: string;
  scheduleType: ScheduleType;
  cronExpression?: string;
  scheduledTime?: string;
  timezone?: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateScheduleParams {
  name: string;
  description?: string;
  agentId: string;
  agentName: string;
  task: string;
  workspaceId?: string;
  workspaceName?: string;
  contextId?: string;
  contextName?: string;
  environmentId?: string;
  environmentName?: string;
  scheduleType: ScheduleType;
  cronExpression?: string;
  scheduledTime?: string;
  timezone?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateScheduleParams {
  name?: string;
  description?: string;
  task?: string;
  cronExpression?: string;
  scheduledTime?: string;
  timezone?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Trigger Types
// ============================================================================

export type TriggerSource = 'github' | 'gitlab' | 'slack' | 'email' | 'webhook' | 'cron' | 'custom';

export interface SendMessageTriggerAction {
  type: 'send_message';
  prompt?: string;
  message?: string;
  template?: string;
}

export interface CommentPullRequestTriggerAction {
  type: 'comment_pull_request';
  prompt?: string;
  message?: string;
  template?: string;
}

export interface CommentMergeRequestTriggerAction {
  type: 'comment_merge_request';
  prompt?: string;
  message?: string;
  template?: string;
}

export type TriggerAction =
  | SendMessageTriggerAction
  | CommentPullRequestTriggerAction
  | CommentMergeRequestTriggerAction;

export interface Trigger {
  id: string;
  name: string;
  environmentId: string;
  agentId?: string;
  source: TriggerSource;
  event: string;
  filters?: Record<string, unknown>;
  action: TriggerAction;
  enabled: boolean;
  lastTriggeredAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTriggerParams {
  name: string;
  environmentId: string;
  agentId?: string;
  source: TriggerSource;
  event: string;
  filters?: Record<string, unknown>;
  action: TriggerAction;
  enabled?: boolean;
}

export interface UpdateTriggerParams {
  name?: string;
  agentId?: string;
  event?: string;
  filters?: Record<string, unknown>;
  action?: TriggerAction;
  enabled?: boolean;
}

export interface TriggerExecution {
  id: string;
  triggerId: string;
  threadId: string;
  event: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
}

// ============================================================================
// Orchestration Types
// ============================================================================

export type OrchestrationStrategy = 'parallel' | 'sequential' | 'conditional' | 'map_reduce';

export interface OrchestrationStep {
  id: string;
  agentId: string;
  name: string;
  instructions?: string;
  inputs?: Record<string, unknown>;
  dependsOn?: string[];
  condition?: string;
}

export interface Orchestration {
  id: string;
  name: string;
  environmentId: string;
  strategy: OrchestrationStrategy;
  coordinatorAgentId?: string;
  steps: OrchestrationStep[];
  status: 'draft' | 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface CreateOrchestrationParams {
  name: string;
  environmentId: string;
  strategy: OrchestrationStrategy;
  coordinatorAgentId?: string;
  steps: Omit<OrchestrationStep, 'id'>[];
}

export interface UpdateOrchestrationParams {
  name?: string;
  strategy?: OrchestrationStrategy;
  coordinatorAgentId?: string;
  steps?: Omit<OrchestrationStep, 'id'>[];
}

export interface OrchestrationStepResult {
  stepId: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  durationMs?: number;
}

export interface OrchestrationRun {
  id: string;
  orchestrationId: string;
  threadId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stepResults: OrchestrationStepResult[];
  createdAt: number;
  completedAt?: number;
}

// ============================================================================
// Health Types
// ============================================================================

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    gcsfuseMount: boolean;
    anthropicApiKey: boolean;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      used: string;
      available: string;
      percentage: string;
    };
  };
  metrics?: {
    activeSessions: number;
    recentErrors: number;
    successRate: number;
  };
}

export interface Metrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  totalTokensUsed: number;
  totalCost: number;
}
