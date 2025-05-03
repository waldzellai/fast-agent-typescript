/**
 * Type-safe decorators for DirectFastAgent applications.
 * These decorators provide type-safe function signatures and IDE support
 * for creating agents in the DirectFastAgent framework.
 */

import { AgentType, AgentConfig } from "./agentTypes";
import { AgentConfigError } from "./exceptions";

// Type for agent functions - can be either async or sync
type AgentCallable<P extends any[], R> = (...args: P) => R | Promise<R>;

// Type for request parameters, matching the structure expected by AgentConfig
type RequestParams = {
  use_history?: boolean;
  systemPrompt?: string;
  // Add other properties as needed based on the actual RequestParams definition
};

// Interface for decorated agent functions
interface DecoratedAgentProtocol<P extends any[], R> {
  _agent_type: AgentType;
  _agent_config: AgentConfig;
  (...args: P): R | Promise<R>;
}

// Interface for orchestrator functions
interface DecoratedOrchestratorProtocol<P extends any[], R>
  extends DecoratedAgentProtocol<P, R> {
  _child_agents: string[];
  _plan_type: "full" | "iterative";
}

// Interface for router functions
interface DecoratedRouterProtocol<P extends any[], R>
  extends DecoratedAgentProtocol<P, R> {
  _router_agents: string[];
}

// Interface for chain functions
interface DecoratedChainProtocol<P extends any[], R>
  extends DecoratedAgentProtocol<P, R> {
  _chain_agents: string[];
}

// Interface for parallel functions
interface DecoratedParallelProtocol<P extends any[], R>
  extends DecoratedAgentProtocol<P, R> {
  _fan_out: string[];
  _fan_in: string;
}

// Interface for evaluator-optimizer functions
interface DecoratedEvaluatorOptimizerProtocol<P extends any[], R>
  extends DecoratedAgentProtocol<P, R> {
  _generator: string;
  _evaluator: string;
}

// Core implementation for agent decorators with common behavior and type safety
function _decoratorImpl<P extends any[], R>(
  self: any,
  agentType: AgentType,
  name: string,
  instruction: string,
  options: {
    servers?: string[];
    model?: string | null;
    use_history?: boolean;
    request_params?: RequestParams | null;
    human_input?: boolean;
    [key: string]: any;
  } = {},
): (func: AgentCallable<P, R>) => DecoratedAgentProtocol<P, R> {
  const {
    servers = [],
    model = null,
    use_history = true,
    request_params = null,
    human_input = false,
    ...extraKwargs
  } = options;

  return function decorator(
    func: AgentCallable<P, R>,
  ): DecoratedAgentProtocol<P, R> {
    const isAsync = func.constructor.name === "AsyncFunction";

    // Handle both async and sync functions consistently
    const wrapper = isAsync
      ? async function (...args: P): Promise<R> {
          return await func(...args);
        }
      : function (...args: P): R | Promise<R> {
          return func(...args);
        };

    // Create agent configuration
    const config: AgentConfig = {
      name,
      instruction,
      servers,
      model: model ?? undefined,
      use_history,
      human_input,
    };

    // Update request params if provided
    if (request_params) {
      config.default_request_params = request_params;
    }

    // Store metadata on the wrapper function
    const agentData: { [key: string]: any } = {
      config,
      type: agentType,
      func,
    };

    // Add extra parameters specific to this agent type
    for (const [key, value] of Object.entries(extraKwargs)) {
      agentData[key] = value;
    }

    // Store the configuration in the FastAgent instance
    self.agents[name] = agentData;

    // Store type information for IDE support
    Object.defineProperty(wrapper, "_agent_type", {
      value: agentType,
      writable: false,
    });
    Object.defineProperty(wrapper, "_agent_config", {
      value: config,
      writable: false,
    });
    for (const [key, value] of Object.entries(extraKwargs)) {
      Object.defineProperty(wrapper, `_${key}`, { value, writable: false });
    }

    return wrapper as DecoratedAgentProtocol<P, R>;
  };
}

// Decorator to create and register a standard agent with type-safe signature
export function agent<P extends any[], R>(
  self: any,
  name: string = "default",
  instructionOrKwarg: string | null = null,
  options: {
    instruction?: string;
    servers?: string[];
    model?: string | null;
    use_history?: boolean;
    request_params?: RequestParams | null;
    human_input?: boolean;
  } = {},
): (func: AgentCallable<P, R>) => DecoratedAgentProtocol<P, R> {
  const { instruction = "You are a helpful agent.", ...rest } = options;
  const finalInstruction = instructionOrKwarg ?? instruction;

  return _decoratorImpl(self, AgentType.BASIC, name, finalInstruction, rest);
}

// Decorator to create and register an orchestrator agent with type-safe signature
export function orchestrator<P extends any[], R>(
  self: any,
  name: string,
  options: {
    agents: string[];
    instruction?: string | null;
    model?: string | null;
    use_history?: boolean;
    request_params?: RequestParams | null;
    human_input?: boolean;
    plan_type?: "full" | "iterative";
    max_iterations?: number;
  },
): (func: AgentCallable<P, R>) => DecoratedOrchestratorProtocol<P, R> {
  const {
    agents,
    instruction = null,
    model = null,
    use_history = false,
    request_params = null,
    human_input = false,
    plan_type = "full",
    max_iterations = 30,
  } = options;

  const defaultInstruction = `
    You are an expert planner. Given an objective task and a list of Agents 
    (which are collections of capabilities), your job is to break down the objective 
    into a series of steps, which can be performed by these agents.
  `;

  return _decoratorImpl(
    self,
    AgentType.ORCHESTRATOR,
    name,
    instruction ?? defaultInstruction,
    {
      model,
      use_history,
      request_params,
      human_input,
      child_agents: agents,
      plan_type,
      max_iterations,
    },
  ) as (func: AgentCallable<P, R>) => DecoratedOrchestratorProtocol<P, R>;
}

// Decorator to create and register a router agent with type-safe signature
export function router<P extends any[], R>(
  self: any,
  name: string,
  options: {
    agents: string[];
    instruction?: string | null;
    servers?: string[];
    model?: string | null;
    use_history?: boolean;
    request_params?: RequestParams | null;
    human_input?: boolean;
  },
): (func: AgentCallable<P, R>) => DecoratedRouterProtocol<P, R> {
  const {
    agents,
    instruction = null,
    servers = [],
    model = null,
    use_history = false,
    request_params = null,
    human_input = false,
  } = options;

  const defaultInstruction = `
    You are a router that determines which specialized agent should handle a given query.
    Analyze the query and select the most appropriate agent to handle it.
  `;

  return _decoratorImpl(
    self,
    AgentType.ROUTER,
    name,
    instruction ?? defaultInstruction,
    {
      servers,
      model,
      use_history,
      request_params,
      human_input,
      router_agents: agents,
    },
  ) as (func: AgentCallable<P, R>) => DecoratedRouterProtocol<P, R>;
}

// Decorator to create and register a chain agent with type-safe signature
export function chain<P extends any[], R>(
  self: any,
  name: string,
  options: {
    sequence: string[];
    instruction?: string | null;
    cumulative?: boolean;
  },
): (func: AgentCallable<P, R>) => DecoratedChainProtocol<P, R> {
  const { sequence, instruction = null, cumulative = false } = options;

  if (sequence.length === 0) {
    throw new AgentConfigError(
      `Chain '${name}' requires at least one agent in the sequence`,
    );
  }

  const defaultInstruction = `
    You are a chain that processes requests through a series of specialized agents in sequence.
    Pass the output of each agent to the next agent in the chain.
  `;

  return _decoratorImpl(
    self,
    AgentType.CHAIN,
    name,
    instruction ?? defaultInstruction,
    {
      sequence,
      cumulative,
    },
  ) as (func: AgentCallable<P, R>) => DecoratedChainProtocol<P, R>;
}

// Decorator to create and register a parallel agent with type-safe signature
export function parallel<P extends any[], R>(
  self: any,
  name: string,
  options: {
    fan_out: string[];
    fan_in?: string | null;
    instruction?: string | null;
    include_request?: boolean;
  },
): (func: AgentCallable<P, R>) => DecoratedParallelProtocol<P, R> {
  const {
    fan_out,
    fan_in = null,
    instruction = null,
    include_request = true,
  } = options;

  const defaultInstruction = `
    You are a parallel processor that executes multiple agents simultaneously 
    and aggregates their results.
  `;

  return _decoratorImpl(
    self,
    AgentType.PARALLEL,
    name,
    instruction ?? defaultInstruction,
    {
      fan_out,
      fan_in: fan_in ?? "",
      include_request,
    },
  ) as (func: AgentCallable<P, R>) => DecoratedParallelProtocol<P, R>;
}

// Decorator to create and register an evaluator-optimizer agent with type-safe signature
export function evaluatorOptimizer<P extends any[], R>(
  self: any,
  name: string,
  options: {
    generator: string;
    evaluator: string;
    instruction?: string | null;
    min_rating?: string;
    max_refinements?: number;
  },
): (func: AgentCallable<P, R>) => DecoratedEvaluatorOptimizerProtocol<P, R> {
  const {
    generator,
    evaluator,
    instruction = null,
    min_rating = "GOOD",
    max_refinements = 3,
  } = options;

  const defaultInstruction = `
    You implement an iterative refinement process where content is generated,
    evaluated for quality, and then refined based on specific feedback until
    it reaches an acceptable quality standard.
  `;

  return _decoratorImpl(
    self,
    AgentType.EVALUATOR_OPTIMIZER,
    name,
    instruction ?? defaultInstruction,
    {
      generator,
      evaluator,
      min_rating,
      max_refinements,
    },
  ) as (func: AgentCallable<P, R>) => DecoratedEvaluatorOptimizerProtocol<P, R>;
}
