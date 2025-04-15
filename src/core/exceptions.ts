/**
 * Custom errors for the FastAgent framework.
 * Enables user-friendly error handling for common issues.
 */

/**
 * Base error class for FastAgent errors.
 */
export class FastAgentError extends Error {
  public details?: string;

  constructor(message: string, details?: string) {
    const fullMessage = details ? `${message}\n\nDetails: ${details}` : message;
    super(fullMessage);
    this.name = this.constructor.name; // Set the error name to the class name
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Raised when there are issues with MCP server configuration.
 * Example: Server name referenced in agent.servers[] but not defined in config.
 */
export class ServerConfigError extends FastAgentError {
  constructor(message: string, details?: string) {
    super(message, details);
  }
}

/**
 * Raised when there are issues with Agent or Workflow configuration.
 * Example: Parallel fan-in references unknown agent.
 */
export class AgentConfigError extends FastAgentError {
  constructor(message: string, details?: string) {
    super(message, details);
  }
}

/**
 * Raised when there are issues with LLM provider API keys.
 * Example: OpenAI/Anthropic key not configured but model requires it.
 */
export class ProviderKeyError extends FastAgentError {
  constructor(message: string, details?: string) {
    super(message, details);
  }
}

/**
 * Raised when a server fails to initialize properly.
 */
export class ServerInitializationError extends FastAgentError {
  constructor(message: string, details?: string) {
    super(message, details);
  }
}

/**
 * Raised when there are issues with LLM model configuration.
 * Example: Unknown model name in model specification string.
 */
export class ModelConfigError extends FastAgentError {
  constructor(message: string, details?: string) {
    super(message, details);
  }
}

/**
 * Raised when we detect a Circular Dependency in the workflow.
 */
export class CircularDependencyError extends FastAgentError {
  constructor(message: string, details?: string) {
    super(message, details);
  }
}

/**
 * Raised from enhanced_prompt when the user requests hard exits.
 * TODO: Using an exception for flow control might need review.
 */
export class PromptExitError extends FastAgentError {
  constructor(message: string, details?: string) {
    super(message, details);
  }
}
