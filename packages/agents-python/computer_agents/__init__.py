"""Computer Agents SDK - Official Python client for the Agentic Compute Platform API.

Build with threads, computers, agents, resources, databases, and automation.

Example::

    from computer_agents import ComputerAgentsClient

    client = ComputerAgentsClient(api_key="ca_...")

    # Execute a task
    result = client.run(
        "Create a REST API",
        computer_id="env_xxx",
        on_event=lambda e: print(e["type"]),
    )
    print(result.content)
"""

__version__ = "2.6.1"

# ============================================================================
# Main Client
# ============================================================================

from .client import ComputerAgentsClient, RunResult
from ._exceptions import ApiClientError
from ._api_client import ApiClient

# ============================================================================
# Resource Managers (for advanced usage)
# ============================================================================

from .resources import (
    AgentRuntimesResource,
    AgentsResource,
    AuthResource,
    BillingResource,
    BudgetResource,
    ComputersResource,
    DatabasesResource,
    EnvironmentsResource,
    FilesResource,
    FunctionsResource,
    GitResource,
    OrchestrationsResource,
    ProjectsResource,
    ResourcesResource,
    RuntimesResource,
    SchedulesResource,
    SendMessageResult,
    SkillsResource,
    ThreadsResource,
    TriggersResource,
    WebAppsResource,
)

# ============================================================================
# Types
# ============================================================================

from .types import (
    # Common
    PaginationParams,
    ApiErrorBody,

    # Projects
    Project,
    CreateProjectParams,
    UpdateProjectParams,
    ProjectStats,

    # Environments
    Environment,
    Computer,
    CreateEnvironmentParams,
    CreateComputerParams,
    UpdateEnvironmentParams,
    UpdateComputerParams,
    EnvironmentComputeProfileId,
    EnvironmentComputeResources,
    EnvironmentPricingMetadata,
    EnvironmentMetadata,
    EnvironmentVariable,
    McpServer,
    RuntimeConfig,
    PackagesConfig,
    AvailableRuntimes,
    ContainerStatus,
    BuildResult,
    BuildStatusResult,
    BuildLogsResult,
    TestBuildResult,
    DockerfileResult,
    ValidateDockerfileResult,
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

    # Threads
    Thread,
    CreateThreadParams,
    UpdateThreadParams,
    ListThreadsParams,
    SendMessageParams,
    ThreadMessage,
    AgentConfig,
    CopyThreadParams,
    SearchThreadsParams,
    SearchThreadResult,
    SearchThreadsResponse,
    ThreadLogEntry,
    ResearchSession,

    # Stream Events
    StreamEvent,
    MessageStreamEvent,
    ResponseStartedEvent,
    ResponseItemCompletedEvent,
    ResponseCompletedEvent,
    StreamCompletedEvent,
    StreamErrorEvent,

    # Runs
    Run,
    CreateRunParams,
    UpdateRunParams,
    ListRunsParams,
    RunLogEntry,
    RunDiff,
    TokenUsage,

    # Agents
    CloudAgent,
    CreateAgentParams,
    UpdateAgentParams,
    AgentBinary,
    BuiltinAgentModel,

    # Budget & Billing
    BudgetStatus,
    CanExecuteResult,
    IncreaseBudgetParams,
    IncreaseBudgetResult,
    BillingRecord,
    ListBillingRecordsParams,
    BillingAccount,
    UsageStats,
    UsageStatsParams,

    # Files
    FileEntry,
    ListFilesParams,
    UploadFileParams,
    CreateDirectoryParams,

    # Git
    GitDiffFile,
    GitDiffResult,
    GitCommitParams,
    GitCommitResult,
    GitPushParams,
    GitPushResult,

    # Schedules
    Schedule,
    CreateScheduleParams,
    UpdateScheduleParams,

    # Triggers
    Trigger,
    CreateTriggerParams,
    UpdateTriggerParams,
    TriggerAction,
    TriggerExecution,

    # Orchestrations
    Orchestration,
    CreateOrchestrationParams,
    UpdateOrchestrationParams,
    OrchestrationStep,
    OrchestrationStepResult,
    OrchestrationRun,

    # Health
    HealthCheck,
    Metrics,
)

__all__ = [
    # Version
    "__version__",

    # Client
    "ComputerAgentsClient",
    "RunResult",
    "ApiClientError",
    "ApiClient",

    # Resources
    "AgentRuntimesResource",
    "AgentsResource",
    "AuthResource",
    "BillingResource",
    "BudgetResource",
    "ComputersResource",
    "DatabasesResource",
    "EnvironmentsResource",
    "Computer",
    "FilesResource",
    "FunctionsResource",
    "GitResource",
    "OrchestrationsResource",
    "ProjectsResource",
    "ResourcesResource",
    "RuntimesResource",
    "SchedulesResource",
    "SendMessageResult",
    "SkillsResource",
    "ThreadsResource",
    "TriggersResource",
    "WebAppsResource",

    # Environment history types
    "EnvironmentSnapshot",
    "EnvironmentChangeKind",
    "EnvironmentChangeOperation",
    "EnvironmentChangeSourceKind",
    "EnvironmentChangeFileRecord",
    "EnvironmentChangeEntry",
    "EnvironmentChangeListResponse",
    "SnapshotFileEntry",
    "EnvironmentSnapshotFilesResponse",
    "EnvironmentSnapshotDiffResponse",
    "EnvironmentSnapshotFileResponse",
    "EnvironmentForkFromSnapshotResponse",
]
