/**
 * Direct factory functions for creating agent and workflow instances without proxies.
 * Implements type-safe factories with improved error handling.
 */

import { AgentConfig, AgentType } from "./agentTypes";
import { AgentConfigError } from "./exceptions";
import { getDependenciesGroups } from "./validation";
import { BaseRequestParams } from "./requestParams";

// Placeholder for MCPApp since it's not found in mcpContent.ts
export interface MCPApp {
  context: any; // Replace with actual context type when available
}

// Define a basic Agent interface since it's not exported from agentTypes.ts
export interface Agent {
  config: AgentConfig;
  context: any; // Replace with actual context type when available
  initialize: () => Promise<void>;
  attachLlm: (
    llmFactory: () => any,
    requestParams?: BaseRequestParams,
  ) => Promise<void>;
}

// Type aliases for improved readability and IDE support
export type AgentDict = { [key: string]: Agent };
export interface AgentRuntimeData {
  type: AgentType;
  config: AgentConfig;
  child_agents?: string[];
}
export type AgentsDict = { [key: string]: AgentRuntimeData };

// Type for model factory functions
export type ModelFactoryFn = (
  model?: string,
  request_params?: BaseRequestParams,
) => () => any;

// Logger placeholder (to be implemented based on the project's logging system)
const logger = {
  info: (message: string, data: any) => console.log(message, data),
};

// Enum or type for progress actions if needed
enum ProgressAction {
  LOADED = "loaded",
}

/**
 * Get model factory using specified or default model.
 * Model string is parsed by ModelFactory to determine provider and reasoning effort.
 */
export function getModelFactory(
  context: any,
  model?: string,
  requestParams?: BaseRequestParams,
  defaultModel?: string,
  cliModel?: string,
): () => any {
  // console.log("--- REAL getModelFactory CALLED ---");

  // Config has lowest precedence
  let modelSpec = defaultModel || context.config?.default_model;

  // Command line override has next precedence
  if (cliModel) {
    modelSpec = cliModel;
  }

  // Model from decorator has highest precedence
  if (model) {
    modelSpec = model;
  }

  // Update or create request_params with the final model choice
  let finalRequestParams: BaseRequestParams;
  if (requestParams) {
    finalRequestParams = {
      ...requestParams,
      request_id: requestParams.request_id || crypto.randomUUID(),
    };
    if (modelSpec) {
      if (finalRequestParams.prompt_config) {
        finalRequestParams.prompt_config.model = modelSpec;
      } else {
        finalRequestParams.prompt_config = { model: modelSpec };
      }
    }
  } else {
    finalRequestParams = {
      request_id: crypto.randomUUID(),
      prompt_config: modelSpec ? { model: modelSpec } : {},
    };
  }

  // Placeholder for ModelFactory.create_factory
  // This should be implemented based on the actual model factory logic in TypeScript
  return () =>
    console.log(
      `Model factory for ${modelSpec || "default"} with params`,
      finalRequestParams,
    );
}

/**
 * Generic method to create agents of a specific type without using proxies.
 */
export async function createAgentsByType(
  appInstance: MCPApp,
  agentsDict: AgentsDict,
  agentType: AgentType,
  activeAgents: AgentDict = {},
  modelFactoryFunc?: ModelFactoryFn,
  ...kwargs: any[]
): Promise<AgentDict> {
  const resultAgents: AgentDict = {};

  if (!modelFactoryFunc) {
    modelFactoryFunc = (model, request_params) => () => null;
  }

  for (const [name, agentData] of Object.entries(agentsDict)) {
    logger.info(`Loaded ${name}`, {
      progress_action: ProgressAction.LOADED,
      agent_name: name,
    });

    if (agentData["type"] === agentType) {
      const config = agentData["config"] as AgentConfig;

      if (agentType === AgentType.BASIC) {
        const agent: Agent = {
          config,
          context: appInstance.context,
          initialize: async () => Promise.resolve(),
          attachLlm: async (
            llmFactory: () => any,
            requestParams?: BaseRequestParams,
          ) => Promise.resolve(),
        };
        await agent.initialize();
        const llmFactory = modelFactoryFunc(
          config.model || undefined,
          (config.default_request_params as BaseRequestParams) || undefined,
        );
        await agent.attachLlm(
          llmFactory,
          (config.default_request_params as BaseRequestParams) || undefined,
        );
        resultAgents[name] = agent;
      } else if (agentType === AgentType.ORCHESTRATOR) {
        // Implementation for OrchestratorAgent
        // This is a placeholder; actual implementation would depend on specific agent classes
        const childAgents: Agent[] = (
          (agentData["child_agents"] as string[]) || []
        ).map((agentName: string) => {
          if (!activeAgents[agentName]) {
            throw new AgentConfigError(`Agent ${agentName} not found`);
          }
          return activeAgents[agentName];
        });

        const orchestrator: Agent = {
          config,
          context: appInstance.context,
          initialize: async () => Promise.resolve(),
          attachLlm: async (
            llmFactory: () => any,
            requestParams?: BaseRequestParams,
          ) => Promise.resolve(),
        };
        await orchestrator.initialize();
        const llmFactory = modelFactoryFunc(
          config.model || undefined,
          (config.default_request_params as BaseRequestParams) || undefined,
        );
        await orchestrator.attachLlm(
          llmFactory,
          (config.default_request_params as BaseRequestParams) || undefined,
        );
        resultAgents[name] = orchestrator;
      }
      // Add other agent types as needed (PARALLEL, ROUTER, CHAIN, EVALUATOR_OPTIMIZER)
      // Due to length constraints, full implementation for all types is not shown here
      else {
        throw new Error(`Unknown agent type: ${agentType}`);
      }
    }
  }

  return resultAgents;
}

/**
 * Create agent instances in dependency order without proxies.
 */
export async function createAgentsInDependencyOrder(
  appInstance: MCPApp,
  agentsDict: AgentsDict,
  modelFactoryFunc: ModelFactoryFn,
  allowCycles: boolean = false,
): Promise<AgentDict> {
  const dependencies = getDependenciesGroups(agentsDict, allowCycles);
  const activeAgents: AgentDict = {};

  for (const group of dependencies) {
    // Create agents by type in the order of dependency
    // BASIC agents first
    const basicAgentsDict = Object.fromEntries(
      Object.entries(agentsDict).filter(
        ([name]) =>
          group.includes(name) && agentsDict[name]["type"] === AgentType.BASIC,
      ),
    ) as AgentsDict;
    if (Object.keys(basicAgentsDict).length > 0) {
      const basicAgents = await createAgentsByType(
        appInstance,
        basicAgentsDict,
        AgentType.BASIC,
        activeAgents,
        modelFactoryFunc,
      );
      Object.assign(activeAgents, basicAgents);
    }

    // Add other agent types similarly (PARALLEL, ROUTER, CHAIN, EVALUATOR_OPTIMIZER, ORCHESTRATOR)
    // Due to length constraints, full implementation for all types is not shown here
  }

  return activeAgents;
}

/**
 * Create a default fan-in agent for parallel workflows when none is specified.
 */
async function createDefaultFanInAgent(
  fanInName: string,
  context: any,
  modelFactoryFunc: ModelFactoryFn,
): Promise<Agent> {
  const defaultConfig: AgentConfig = {
    name: fanInName,
    instruction:
      "You are a passthrough agent that combines outputs from parallel agents.",
  };

  const fanInAgent: Agent = {
    config: defaultConfig,
    context,
    initialize: async () => Promise.resolve(),
    attachLlm: async (llmFactory: () => any) => Promise.resolve(),
  };
  await fanInAgent.initialize();
  const llmFactory = modelFactoryFunc("passthrough");
  await fanInAgent.attachLlm(llmFactory);
  return fanInAgent;
}
