import { addTraceProcessor } from './tracing';
import { defaultProcessor } from './tracing/processor';

export { RuntimeEventEmitter } from '@testbase/agents-core/_shims';
export {
  Agent,
  AgentConfiguration,
  AgentConfigWithHandoffs,
  AgentOptions,
  AgentOutputType,
  ToolsToFinalOutputResult,
  ToolToFinalOutputFunction,
  ToolUseBehavior,
  ToolUseBehaviorFlags,
} from './agent';
export { Computer } from './computer';
export {
  AgentsError,
  GuardrailExecutionError,
  InputGuardrailTripwireTriggered,
  MaxTurnsExceededError,
  ModelBehaviorError,
  OutputGuardrailTripwireTriggered,
  ToolCallError,
  UserError,
  SystemError,
} from './errors';
export {
  RunAgentUpdatedStreamEvent,
  RunRawModelStreamEvent,
  RunItemStreamEvent,
  RunStreamEvent,
} from './events';
export {
  defineOutputGuardrail,
  GuardrailFunctionOutput,
  InputGuardrail,
  InputGuardrailFunction,
  InputGuardrailFunctionArgs,
  InputGuardrailMetadata,
  InputGuardrailResult,
  OutputGuardrail,
  OutputGuardrailDefinition,
  OutputGuardrailFunction,
  OutputGuardrailFunctionArgs,
  OutputGuardrailMetadata,
  OutputGuardrailResult,
} from './guardrail';
export {
  getHandoff,
  getTransferMessage,
  Handoff,
  handoff,
  HandoffInputData,
  HandoffEnabledFunction,
} from './handoff';
export { assistant, system, user } from './helpers/message';
export {
  extractAllTextOutput,
  RunHandoffCallItem,
  RunHandoffOutputItem,
  RunItem,
  RunMessageOutputItem,
  RunReasoningItem,
  RunToolApprovalItem,
  RunToolCallItem,
  RunToolCallOutputItem,
} from './items';
export { AgentHooks } from './lifecycle';
export { getLogger } from './logger';
export {
  getAllMcpTools,
  invalidateServerToolsCache,
  mcpToFunctionTool,
  MCPServer,
  MCPServerStdio,
  MCPServerStreamableHttp,
  MCPServerSSE,
  GetAllMcpToolsOptions,
} from './mcp';
export {
  MCPToolFilterCallable,
  MCPToolFilterContext,
  MCPToolFilterStatic,
  createMCPToolStaticFilter,
} from './mcpUtil';
export {
  Model,
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelSettings,
  ModelSettingsToolChoice,
  SerializedHandoff,
  SerializedTool,
  SerializedOutputType,
} from './model';
export {
  OPENAI_DEFAULT_MODEL_ENV_VARIABLE_NAME,
  gpt5ReasoningSettingsRequired,
  getDefaultModel,
  getDefaultModelSettings,
  isGpt5Default,
} from './defaultModel';
export { setDefaultModelProvider } from './providers';
export {
  AgentType,
  codexModelNameFor,
  parseCodexAgentType,
  isAgentType,
} from './extensions';
export { runCodexAgent } from './codex/codexRunners';
// Unified MCP Server types (replaces CodexMcpServerConfig)
export type {
  McpServerConfig,
  StdioMcpServerConfig,
  HttpMcpServerConfig,
  BaseMcpServerConfig,
} from './mcpConfig';
export {
  isStdioMcpServer,
  isHttpMcpServer,
} from './mcpConfig';
export { runCloudAgent } from './cloud/cloudRunners';
export type { CloudRunOptions, CloudRunResult, CloudClientInterface } from './cloud/cloudRunners';
export { CloudApiClient } from './cloud/cloudClient';
export type { CloudApiClientConfig, CreateContainerOptions, InstallMcpPackageOptions } from './cloud/cloudClient';
export type {
  ContainerInfo,
  // NOTE: McpServerConfig is now exported from mcpConfig.ts (unified type)
  FileInfo,
  UpdateContainerOptions,
  ContainerHealth,
  WorkspaceInfo,
  CreateWorkspaceOptions,
  CloudAgentOptions,
  CloudAgent,
  AddMcpServerOptions,
  TestbaseCloudConfig,
} from './cloud/cloudTypes';
export {
  CloudApiError,
  TimeoutError,
  ContainerError,
} from './cloud/cloudErrors';
export {
  Runtime,
  RuntimeExecutionConfig,
  RuntimeExecutionResult,
  LocalRuntime,
  CloudRuntime,
} from './runtime';
export type { LocalRuntimeConfig } from './runtime/localRuntime';
export type { CloudRuntimeConfig } from './runtime/cloudRuntime';
export type {
  Storage,
  SessionStorage,
  WorkspaceStorage,
  StorageMetadata,
  StorageFileInfo,
  ReadFileOptions,
  WriteFileOptions,
  ListFilesOptions,
  SyncResult,
  SyncConflict,
  LocalStorageConfig,
  GCSStorageConfig,
  S3StorageConfig,
} from './storage';
export { LocalSessionStorage } from './storage';
export type { LocalSessionStorageConfig } from './storage';
export { GCSSessionStorage } from './storage';
export { WorkspaceSync } from './storage';
export type { WorkspaceSyncConfig } from './storage';
export { RunResult, StreamedRunResult } from './result';
export {
  IndividualRunOptions,
  NonStreamRunOptions,
  run,
  RunConfig,
  Runner,
  StreamRunOptions,
} from './run';
export { RunContext } from './runContext';
export { RunState } from './runState';
export {
  HostedTool,
  ComputerTool,
  computerTool,
  HostedMCPTool,
  hostedMcpTool,
  FunctionTool,
  FunctionToolResult,
  Tool,
  tool,
  ToolExecuteArgument,
  ToolEnabledFunction,
} from './tool';
export * from './tracing';
export { getGlobalTraceProvider, TraceProvider } from './tracing/provider';
/* only export the types not the parsers */
export type {
  AgentInputItem,
  AgentOutputItem,
  AssistantMessageItem,
  HostedToolCallItem,
  ComputerCallResultItem,
  ComputerUseCallItem,
  FunctionCallItem,
  FunctionCallResultItem,
  JsonSchemaDefinition,
  ReasoningItem,
  ResponseStreamEvent,
  SystemMessageItem,
  TextOutput,
  UnknownContext,
  UnknownItem,
  UserMessageItem,
  StreamEvent,
  StreamEventTextStream,
  StreamEventResponseCompleted,
  StreamEventResponseStarted,
  StreamEventGenericItem,
} from './types';
export { Usage } from './usage';

/**
 * Utility functions for error handling, retry logic, and logging
 */
export {
  // Error utilities
  TestbaseError,
  ConfigurationError,
  RuntimeError,
  StorageError,
  CloudError,
  ContainerError as TestbaseContainerError,
  isRetryableError,
  wrapError,
  formatErrorForLogging,
  type ErrorContext,
  type ErrorSuggestion,
  // Retry utilities
  withRetry,
  withCustomBackoff,
  makeRetryable,
  RetryPresets,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  // Logger utilities
  Logger,
  getLogger as getStructuredLogger,
  setGlobalLogLevel,
  LogLevel,
  jsonFormatter,
  prettyFormatter,
  type LogContext,
  type LogEntry,
  type LogFormatter,
  type LoggerConfig,
} from './utils';

/**
 * Exporting the whole protocol as an object here. This contains both the types
 * and the zod schemas for parsing the protocol.
 */
export * as protocol from './types/protocol';

/**
 * Add the default processor, which exports traces and spans to the backend in batches. You can
 * change the default behavior by either:
 * 1. calling addTraceProcessor, which adds additional processors, or
 * 2. calling setTraceProcessors, which sets the processors and discards the default one
 */
addTraceProcessor(defaultProcessor());
