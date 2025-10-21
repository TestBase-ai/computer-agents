/**
 * Cloud runners for executing computer-use agents in Testbase Cloud containers.
 *
 * This module provides cloud execution capabilities that delegate to remote
 * Cloud Run containers via Codex CLI.
 */

export type CloudRunOptions = {
  /**
   * Task to execute
   */
  task: string;

  /**
   * Cloud client instance for making API calls.
   * The client contains the container ID and URL internally.
   */
  client: CloudClientInterface;

  /**
   * Workspace path (optional, will be determined by container config)
   */
  workspace?: string;

  /**
   * Session ID for continuing previous sessions
   */
  sessionId?: string;
};

export type CloudRunResult = {
  /**
   * Final output from the agent execution
   */
  output: string;

  /**
   * Session ID (for potential future use in multi-turn cloud execution)
   */
  sessionId?: string;
};

/**
 * Minimal interface for the cloud client to avoid circular dependencies.
 * This is satisfied by the CloudApiClient from @testbase/cloud.
 *
 * The client encapsulates the container ID and URL, so they don't need
 * to be passed separately.
 */
export interface CloudClientInterface {
  /**
   * The container ID this client is connected to
   */
  readonly containerId: string;

  /**
   * The container URL this client is connected to
   */
  readonly containerUrl: string;

  /**
   * Execute a task on the container
   */
  executeTask(
    task: string,
    workspace?: string
  ): Promise<{ executionId: string; status: string; message: string }>;

  /**
   * Wait for the current execution to complete
   */
  waitForExecution(
    pollIntervalMs?: number
  ): Promise<{ completed: boolean; output?: string }>;
}

/**
 * Runs a computer-use agent in a cloud container via Codex CLI.
 *
 * This function delegates task execution to a remote Cloud Run container,
 * polling for completion and returning the final output.
 *
 * @param options - Cloud execution options
 * @returns The agent output and session information
 */
export async function runCloudAgent(options: CloudRunOptions): Promise<CloudRunResult> {
  const {
    task,
    client,
    workspace,
    sessionId,
  } = options;

  if (!client.containerUrl) {
    throw new Error(
      `Container ${client.containerId} does not have a valid URL. ` +
      `Container may still be deploying or failed to deploy.`
    );
  }

  // Submit the task for execution
  await client.executeTask(task, workspace);

  // Wait for execution to complete
  const result = await client.waitForExecution();

  if (!result.completed) {
    throw new Error(
      `Execution did not complete successfully for container ${client.containerId}`
    );
  }

  return {
    output: result.output || '',
    sessionId: sessionId, // Cloud containers don't currently support multi-turn sessions
  };
}
