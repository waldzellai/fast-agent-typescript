/**
 * Type definitions for agents and agent configurations.
 */

// Assuming RequestParams type is defined elsewhere, e.g.:
// import { RequestParams } from './requestParams';
// For now, we'll use a placeholder type.
type RequestParams = {
  use_history?: boolean;
  systemPrompt?: string;
  // Add other properties as needed based on the actual RequestParams definition
};

/**
 * Enumeration of supported agent types.
 */
export enum AgentType {
  BASIC = "agent",
  ORCHESTRATOR = "orchestrator",
  PARALLEL = "parallel",
  EVALUATOR_OPTIMIZER = "evaluator_optimizer",
  ROUTER = "router",
  CHAIN = "chain",
}

/**
 * Configuration for an Agent instance.
 * Note: The __post_init__ logic from the Python dataclass needs to be handled
 * by the consuming code in TypeScript. Specifically, ensure default_request_params
 * is initialized correctly based on use_history and instruction if not provided.
 */
export interface AgentConfig {
  name: string;
  instruction?: string; // Default: "You are a helpful agent."
  servers?: string[]; // Default: []
  model?: string | null; // Default: null
  use_history?: boolean; // Default: true
  default_request_params?: RequestParams | null; // Default: null, but initialized based on use_history and instruction
  human_input?: boolean; // Default: false
  agent_type?: string; // Default: AgentType.BASIC
}

// Example of how consuming code might handle default initialization:
/*
function createAgentWithDefaults(config: AgentConfig): AgentConfig {
  const defaults = {
    instruction: "You are a helpful agent.",
    servers: [],
    model: null,
    use_history: true,
    default_request_params: null,
    human_input: false,
    agent_type: AgentType.BASIC,
  };

  const mergedConfig = { ...defaults, ...config };

  if (mergedConfig.default_request_params === null) {
    mergedConfig.default_request_params = {
      use_history: mergedConfig.use_history,
      systemPrompt: mergedConfig.instruction,
    };
  } else {
    // Override the request params history setting if explicitly configured
     mergedConfig.default_request_params.use_history = mergedConfig.use_history;
  }


  return mergedConfig;
}
*/
