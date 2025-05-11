import { AgentConfig } from "./agentTypes";

/**
 * Generic exception type for MCP operations
 */
export class MCPException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MCPException";
  }
}

/**
 * Prompt configuration interface
 */
export interface PromptConfig {
  // Add minimal properties based on context
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Content interface with minimal properties
 */
export interface MCPContent {
  [key: string]: any;
}

/**
 * Validation function types
 */
export type ValidationOptions = {
  min?: number;
  max?: number;
};

/**
 * Validate string input
 * @param value String to validate
 * @param name Name of the parameter for error messaging
 * @throws {MCPException} If validation fails
 */
export function validateString(value: any, name: string): string {
  if (typeof value !== "string") {
    throw new MCPException(`${name} must be a string`);
  }
  return value;
}

/**
 * Validate number input
 * @param value Number to validate
 * @param name Name of the parameter for error messaging
 * @param options Optional validation options
 * @throws {MCPException} If validation fails
 */
export function validateNumber(
  value: any,
  name: string,
  options: ValidationOptions = {},
): number {
  if (typeof value !== "number" || isNaN(value)) {
    throw new MCPException(`${name} must be a number`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new MCPException(`${name} must be at least ${options.min}`);
  }

  if (options.max !== undefined && value > options.max) {
    throw new MCPException(`${name} must be at most ${options.max}`);
  }

  return value;
}

/**
 * Validate boolean input
 * @param value Boolean to validate
 * @param name Name of the parameter for error messaging
 * @throws {MCPException} If validation fails
 */
export function validateBoolean(value: any, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new MCPException(`${name} must be a boolean`);
  }
  return value;
}

/**
 * Validate object input
 * @param value Object to validate
 * @param name Name of the parameter for error messaging
 * @throws {MCPException} If validation fails
 */
export function validateObject(value: any, name: string): object {
  if (value === null || typeof value !== "object") {
    throw new MCPException(`${name} must be an object`);
  }
  return value;
}

/**
 * Validate array input
 * @param value Array to validate
 * @param name Name of the parameter for error messaging
 * @throws {MCPException} If validation fails
 */
export function validateArray(value: any, name: string): any[] {
  if (!Array.isArray(value)) {
    throw new MCPException(`${name} must be an array`);
  }
  return value;
}

/**
 * Base interface for request parameters
 */
export interface BaseRequestParams {
  /**
   * Unique identifier for the request
   */
  request_id?: string;

  /**
   * Configuration for the agent processing the request
   */
  agent_config?: AgentConfig;

  /**
   * Prompt configuration for the request
   */
  prompt_config?: PromptConfig;
}

// Back-compatibility: Provide a **runtime** class so callers can use `new RequestParams()`
// while still retaining the shape of `BaseRequestParams`. It accepts a partial object and
// copies the supplied fields onto `this`.
export class RequestParams implements BaseRequestParams {
  request_id?: string;
  agent_config?: AgentConfig;
  prompt_config?: PromptConfig;
  // Allow any extra properties (e.g. response_format) so tests/examples can extend freely.
  [key: string]: any;

  constructor(params: Partial<BaseRequestParams & Record<string, any>> = {}) {
    Object.assign(this, params);
  }
}

/**
 * Interface for content-based request parameters
 */
export interface ContentRequestParams extends BaseRequestParams {
  /**
   * Content associated with the request
   */
  content?: MCPContent;
}

/**
 * Interface for workflow-related request parameters
 */
export interface WorkflowRequestParams extends BaseRequestParams {
  /**
   * Flag to indicate if the workflow should be executed
   */
  execute?: boolean;

  /**
   * Maximum number of workflow iterations
   */
  max_iterations?: number;

  /**
   * Timeout for the workflow execution in seconds
   */
  timeout?: number;
}

/**
 * Validate base request parameters
 * @param params Request parameters to validate
 * @returns Validated request parameters
 * @throws {MCPException} If validation fails
 */
export function validateBaseRequestParams(
  params: BaseRequestParams,
): BaseRequestParams {
  if (params.request_id !== undefined) {
    validateString(params.request_id, "request_id");
  }

  if (params.agent_config !== undefined) {
    validateObject(params.agent_config, "agent_config");
  }

  if (params.prompt_config !== undefined) {
    validateObject(params.prompt_config, "prompt_config");
  }

  return params;
}

/**
 * Validate content-based request parameters
 * @param params Content request parameters to validate
 * @returns Validated content request parameters
 * @throws {MCPException} If validation fails
 */
export function validateContentRequestParams(
  params: ContentRequestParams,
): ContentRequestParams {
  validateBaseRequestParams(params);

  if (params.content !== undefined) {
    validateObject(params.content, "content");
  }

  return params;
}

/**
 * Validate workflow-related request parameters
 * @param params Workflow request parameters to validate
 * @returns Validated workflow request parameters
 * @throws {MCPException} If validation fails
 */
export function validateWorkflowRequestParams(
  params: WorkflowRequestParams,
): WorkflowRequestParams {
  validateBaseRequestParams(params);

  if (params.execute !== undefined) {
    validateBoolean(params.execute, "execute");
  }

  if (params.max_iterations !== undefined) {
    validateNumber(params.max_iterations, "max_iterations", { min: 1 });
  }

  if (params.timeout !== undefined) {
    validateNumber(params.timeout, "timeout", { min: 0 });
  }

  return params;
}

/**
 * Create a default base request parameters object
 * @returns Default base request parameters
 */
export function createDefaultBaseRequestParams(): BaseRequestParams {
  return {
    request_id: crypto.randomUUID(),
  };
}

/**
 * Create a default content request parameters object
 * @returns Default content request parameters
 */
export function createDefaultContentRequestParams(): ContentRequestParams {
  return {
    ...createDefaultBaseRequestParams(),
    content: {},
  };
}

/**
 * Create a default workflow request parameters object
 * @returns Default workflow request parameters
 */
export function createDefaultWorkflowRequestParams(): WorkflowRequestParams {
  return {
    ...createDefaultBaseRequestParams(),
    execute: true,
    max_iterations: 10,
    timeout: 300, // 5 minutes
  };
}
