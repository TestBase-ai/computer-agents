/**
 * Computer Agents SDK
 *
 * A simple, clean SDK for the Computer Agents Cloud API.
 *
 * @example
 * ```typescript
 * import { ComputerAgentsClient } from 'computer-agents';
 *
 * const client = new ComputerAgentsClient({
 *   apiKey: process.env.COMPUTER_AGENTS_API_KEY
 * });
 *
 * // Execute a task
 * const result = await client.run('Create a REST API', {
 *   computerId: 'env_xxx',
 *   onEvent: (event) => console.log(event.type)
 * });
 *
 * console.log(result.content);
 * ```
 */

// ============================================================================
// Main Client
// ============================================================================

export {
  ComputerAgentsClient,
  // Backwards compatibility aliases
  CloudClient,
  TestbaseClient,
  // Error class
  ApiClientError,
} from './ComputerAgentsClient';

export type {
  ComputerAgentsClientConfig,
  RunOptions,
  RunResult,
  ApiClientConfig,
} from './ComputerAgentsClient';

// ============================================================================
// Resource Managers (for advanced usage)
// ============================================================================

export {
  ProjectsResource,
  EnvironmentsResource,
  ComputersResource,
  ThreadsResource,
  AgentsResource,
  ResourcesResource,
  WebAppsResource,
  FunctionsResource,
  AuthResource,
  AgentRuntimesResource,
  RuntimesResource,
  DatabasesResource,
  SkillsResource,
  BudgetResource,
  BillingResource,
  SchedulesResource,
  TriggersResource,
  OrchestrationsResource,
  GitResource,
} from './cloud/resources';

export type {
  StreamEventCallback,
  SendMessageOptions,
  SendMessageResult,
  ListEnvironmentsParams,
  ListEnvironmentChangesParams,
  ListResourcesParams,
  ResourceInvokeParams,
  ResourceFileUploadParams,
  ListDatabasesParams,
  CreateDatabaseCollectionParams,
  CreateDatabaseDocumentParams,
  UpdateDatabaseDocumentParams,
  ListSkillsParams,
} from './cloud/resources';

// ============================================================================
// API Types
// ============================================================================

export type {
  // Common
  PaginationParams,
  PaginatedResponse,
  ApiError,

  // Projects
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectStats,
  ProjectType,
  ProjectSource,

  // Environments
  Environment,
  Computer,
  CreateEnvironmentParams,
  CreateComputerParams,
  UpdateEnvironmentParams,
  UpdateComputerParams,
  EnvironmentStatus,
  EnvironmentVariable,
  EnvironmentComputeProfileId,
  EnvironmentComputeResources,
  EnvironmentPricingMetadata,
  EnvironmentMetadata,
  McpServer,
  ContainerStatus,
  BuildResult,
  BuildStatus,
  BuildStatusResult,
  BuildLogsResult,
  TestBuildResult,
  DockerfileResult,
  ValidateDockerfileResult,
  RuntimeConfig,
  PackagesConfig,
  AvailableRuntimes,
  PackageType,
  InstallPackagesResult,
  StartContainerParams,
  StartContainerResult,
  EnvironmentSnapshot,
  EnvironmentChangeKind,
  EnvironmentChangeOperation,
  EnvironmentChangeSourceKind,
  EnvironmentChangeFileRecord,
  EnvironmentChangeEntry,
  EnvironmentChangeListResponse,
  SnapshotFileEntry,
  EnvironmentSnapshotFilesResponse,
  EnvironmentSnapshotDiffResponse,
  EnvironmentSnapshotFileResponse,
  EnvironmentForkFromSnapshotResponse,

  // Threads
  Thread,
  CreateThreadParams,
  UpdateThreadParams,
  ListThreadsParams,
  SendMessageParams,
  ThreadMessage,
  ThreadStatus,
  AgentConfig,
  CopyThreadParams,
  SearchThreadsParams,
  SearchThreadResult,
  SearchThreadsResponse,
  ThreadLogEntry,
  ResearchSession,

  // Stream Events
  StreamEvent,
  MessageStreamEvent,
  ResponseStartedEvent,
  ResponseItemCompletedEvent,
  ResponseCompletedEvent,
  StreamCompletedEvent,
  StreamErrorEvent,

  // Runs
  Run,
  CreateRunParams,
  UpdateRunParams,
  ListRunsParams,
  RunStatus,
  RunLogEntry,
  RunDiff,
  TokenUsage,

  // Agents
  CloudAgent,
  CreateAgentParams,
  UpdateAgentParams,
  BuiltinAgentModel,
  AgentModel,
  ReasoningEffort,
  DeepResearchModel,
  AgentBinary,
  AgentModelCatalogEntry,
  AgentAnalyticsResponse,

  // Resources / Databases / Skills
  Resource,
  CreateResourceParams,
  UpdateResourceParams,
  ResourceKind,
  ResourceAuthMode,
  ResourceStatus,
  ResourceAnalyticsResponse,
  ResourceLogEntry,
  ResourceBinding,
  Database,
  CreateDatabaseParams,
  UpdateDatabaseParams,
  DatabaseCollection,
  DatabaseDocument,
  Skill,
  SkillFile,
  SkillCategory,
  CreateSkillParams,
  UpdateSkillParams,

  // Budget & Billing
  BudgetStatus,
  CanExecuteResult,
  IncreaseBudgetParams,
  IncreaseBudgetResult,
  BillingRecord,
  ListBillingRecordsParams,
  BillingAccount,
  UsageStats,
  UsageStatsParams,

  // Files
  FileEntry,
  ListFilesParams,
  UploadFileParams,
  CreateDirectoryParams,

  // Git
  GitDiffFile,
  GitDiffResult,
  GitCommitParams,
  GitCommitResult,
  GitPushParams,
  GitPushResult,

  // Schedules
  Schedule,
  CreateScheduleParams,
  UpdateScheduleParams,
  ScheduleType,

  // Triggers
  TriggerSource,
  Trigger,
  TriggerAction,
  CreateTriggerParams,
  UpdateTriggerParams,
  TriggerExecution,

  // Orchestrations
  OrchestrationStrategy,
  OrchestrationStep,
  Orchestration,
  CreateOrchestrationParams,
  UpdateOrchestrationParams,
  OrchestrationRun,
  OrchestrationStepResult,

  // Health
  HealthCheck,
  Metrics,
} from './cloud/types';

// ============================================================================
// Low-level API Client (for advanced usage)
// ============================================================================

export { ApiClient } from './cloud/ApiClient';
