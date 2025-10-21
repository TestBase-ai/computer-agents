/**
 * Base error class for all Testbase-related errors.
 */
export class TestBaseError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'TestBaseError';
    Object.setPrototypeOf(this, TestBaseError.prototype);
  }
}

/**
 * Error thrown when API key is invalid or missing.
 */
export class AuthenticationError extends TestBaseError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid.
 */
export class ConfigurationError extends TestBaseError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error thrown when cloud API request fails.
 */
export class CloudApiError extends TestBaseError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: any
  ) {
    super(message, 'CLOUD_API_ERROR');
    this.name = 'CloudApiError';
    Object.setPrototypeOf(this, CloudApiError.prototype);
  }
}

/**
 * Error thrown when agent execution times out.
 */
export class TimeoutError extends TestBaseError {
  constructor(message: string = 'Agent execution timed out') {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when container operations fail.
 */
export class ContainerError extends TestBaseError {
  constructor(message: string, public readonly containerId?: string) {
    super(message, 'CONTAINER_ERROR');
    this.name = 'ContainerError';
    Object.setPrototypeOf(this, ContainerError.prototype);
  }
}

/**
 * Error thrown when workspace operations fail.
 */
export class WorkspaceError extends TestBaseError {
  constructor(message: string) {
    super(message, 'WORKSPACE_ERROR');
    this.name = 'WorkspaceError';
    Object.setPrototypeOf(this, WorkspaceError.prototype);
  }
}
