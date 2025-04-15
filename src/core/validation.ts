import { z } from "zod";
import { AgentType, AgentConfig } from "./agentTypes"; // Assuming these types exist based on Python code
import {
  AgentConfigError,
  CircularDependencyError,
  ServerConfigError,
} from "./exceptions"; // Assuming these custom errors exist
// Assuming AugmentedLLM might be defined elsewhere or we use a placeholder/any
// import { AugmentedLLM } from './llm';

// Placeholder for context type - adjust based on actual structure
interface AppContext {
  config: {
    mcp?: {
      servers?: Record<string, any>; // Define server config structure if known
    };
    // other context properties...
  };
  // other context properties...
}

// Represents the runtime data associated with an agent, including its config and workflow details
interface AgentRuntimeData {
  type: AgentType;
  config?: AgentConfig; // Optional as not all validation paths check it directly
  func?: any; // Placeholder for the agent's function or LLM instance
  // Workflow specific properties (use 'any' or refine further if needed)
  fan_in?: string;
  fan_out?: string[];
  child_agents?: string[];
  router_agents?: string[];
  evaluator?: string;
  generator?: string;
  sequence?: string[];
  agents?: string[]; // Legacy support for 'agents' in CHAIN
  parallel_agents?: string[]; // Used in dependency calculation
  eval_optimizer_agents?: string[]; // Used in dependency calculation
  // Add other potential properties if known
  [key: string]: any; // Allow other properties
}

// Dictionary mapping agent names to their runtime data
type AgentsDict = Record<string, AgentRuntimeData>;

/**
 * Validate that all server references in agent configurations exist in config.
 * Throws ServerConfigError if any referenced servers are not defined.
 *
 * @param context - Application context
 * @param agents - Dictionary of agent configurations
 */
export function validateServerReferences(
  context: AppContext,
  agents: AgentsDict,
): void {
  const availableServers = new Set(
    Object.keys(context.config?.mcp?.servers ?? {}),
  );

  for (const [name, agentData] of Object.entries(agents)) {
    // Assuming agentData.config exists and has an optional 'servers' array
    const config = agentData.config as AgentConfig | undefined; // Cast or validate structure
    if (config?.servers) {
      const missing = config.servers.filter((s) => !availableServers.has(s));
      if (missing.length > 0) {
        throw new ServerConfigError(
          `Missing server configuration for agent '${name}'`,
          `The following servers are referenced but not defined in config: ${missing.join(", ")}`,
        );
      }
    }
  }
}

/**
 * Validate that all workflow references point to valid agents/workflows.
 * Also validates that referenced agents have required configuration.
 * Throws AgentConfigError if any validation fails.
 *
 * @param agents - Dictionary of agent configurations
 */
export function validateWorkflowReferences(agents: AgentsDict): void {
  const availableComponents = new Set(Object.keys(agents));

  for (const [name, agentData] of Object.entries(agents)) {
    const agentType = agentData.type as AgentType; // Assuming type is AgentType enum/string literal

    switch (agentType) {
      case AgentType.PARALLEL: {
        const fanIn = agentData.fan_in as string | undefined;
        if (fanIn && !availableComponents.has(fanIn)) {
          throw new AgentConfigError(
            `Parallel workflow '${name}' references non-existent fan_in component: ${fanIn}`,
          );
        }
        const fanOut = (agentData.fan_out as string[]) ?? [];
        const missingFanOut = fanOut.filter((a) => !availableComponents.has(a));
        if (missingFanOut.length > 0) {
          throw new AgentConfigError(
            `Parallel workflow '${name}' references non-existent fan_out components: ${missingFanOut.join(", ")}`,
          );
        }
        break;
      }
      case AgentType.ORCHESTRATOR: {
        const childAgents = (agentData.child_agents as string[]) ?? [];
        const missingChildren = childAgents.filter(
          (a) => !availableComponents.has(a),
        );
        if (missingChildren.length > 0) {
          throw new AgentConfigError(
            `Orchestrator '${name}' references non-existent agents: ${missingChildren.join(", ")}`,
          );
        }
        // Validate child agent LLM capabilities (simplified check)
        for (const agentName of childAgents) {
          const childData = agents[agentName];
          if (!childData) continue; // Should have been caught by missingChildren check

          const func = childData.func as any; // Use 'any' or a more specific type if available
          const childType = childData.type as AgentType;

          const workflowTypesWithLLMImplicit = [
            AgentType.EVALUATOR_OPTIMIZER,
            AgentType.PARALLEL, // Fan-in might need LLM
            AgentType.ROUTER,
            AgentType.CHAIN, // Steps might need LLM
            AgentType.ORCHESTRATOR, // The orchestrator itself needs LLM
          ];

          // Basic agents need explicit LLM check later during instantiation
          if (childType === AgentType.BASIC) {
            continue;
          }

          // Check if it's a known workflow type or has LLM properties
          // This check is simplified; Python's isinstance/hasattr is complex to replicate perfectly without knowing AugmentedLLM structure
          const hasLlmCapability =
            workflowTypesWithLLMImplicit.includes(childType) ||
            (typeof func === "object" &&
              func !== null &&
              (func._llm !== undefined ||
                func.constructor?.name === "AugmentedLLM")); // Simplified check

          if (!hasLlmCapability) {
            throw new AgentConfigError(
              `Agent '${agentName}' used by orchestrator '${name}' lacks required LLM capability or is not a recognized workflow type.`,
              "Agents used by orchestrators must typically be LLM-capable or specific workflow types.",
            );
          }
        }
        break;
      }
      case AgentType.ROUTER: {
        const routerAgents = (agentData.router_agents as string[]) ?? [];
        const missingAgents = routerAgents.filter(
          (a) => !availableComponents.has(a),
        );
        if (missingAgents.length > 0) {
          throw new AgentConfigError(
            `Router '${name}' references non-existent agents: ${missingAgents.join(", ")}`,
          );
        }
        break;
      }
      case AgentType.EVALUATOR_OPTIMIZER: {
        const evaluator = agentData.evaluator as string | undefined;
        const generator = agentData.generator as string | undefined;
        const missing: string[] = [];
        if (!evaluator || !availableComponents.has(evaluator)) {
          missing.push(`evaluator: ${evaluator ?? "undefined"}`);
        }
        if (!generator || !availableComponents.has(generator)) {
          missing.push(`generator: ${generator ?? "undefined"}`);
        }
        if (missing.length > 0) {
          throw new AgentConfigError(
            `Evaluator-Optimizer '${name}' references non-existent components: ${missing.join(", ")}`,
          );
        }
        break;
      }
      case AgentType.CHAIN: {
        // Handle potential legacy 'agents' key or new 'sequence' key
        const sequence = (agentData.sequence ??
          agentData.agents ??
          []) as string[];
        const missing = sequence.filter((a) => !availableComponents.has(a));
        if (missing.length > 0) {
          throw new AgentConfigError(
            `Chain '${name}' references non-existent agents: ${missing.join(", ")}`,
          );
        }
        break;
      }
      // Add cases for other AgentTypes if needed
    }
  }
}

/**
 * Recursive helper for getDependenciesGroups to detect cycles.
 */
function detectCycleUtil(
  node: string,
  dependencies: Record<string, Set<string>>,
  agentNames: Set<string>,
  visited: Set<string>,
  recursionStack: Set<string>,
): void {
  visited.add(node);
  recursionStack.add(node);

  const nodeDeps = dependencies[node] || new Set<string>();

  for (const neighbour of nodeDeps) {
    if (!agentNames.has(neighbour)) {
      // Skip dependencies to non-existent agents
      continue;
    }
    if (!visited.has(neighbour)) {
      detectCycleUtil(
        neighbour,
        dependencies,
        agentNames,
        visited,
        recursionStack,
      );
    } else if (recursionStack.has(neighbour)) {
      // Cycle detected - reconstruct path (approximation)
      const path = Array.from(recursionStack).join(" -> ") + ` -> ${neighbour}`;
      throw new CircularDependencyError(
        `Circular dependency detected: ${path}`,
      );
    }
  }

  recursionStack.delete(node);
}

/**
 * Get dependencies between agents and group them into dependency layers.
 * Each layer can be initialized in parallel.
 *
 * @param agentsDict - Dictionary of agent configurations
 * @param allowCycles - Whether to allow cyclic dependencies (default: false)
 * @returns List of lists, where each inner list is a group of agents that can be initialized together
 * @throws CircularDependencyError - If circular dependency detected and allowCycles is false
 */
export function getDependenciesGroups(
  agentsDict: AgentsDict,
  allowCycles: boolean = false,
): string[][] {
  const agentNames = new Set(Object.keys(agentsDict));
  const dependencies: Record<string, Set<string>> = {};
  const reverseDependencies: Record<string, Set<string>> = {}; // Tracks which agents depend on a given agent

  // Initialize dependency structures
  for (const name of agentNames) {
    dependencies[name] = new Set<string>();
    reverseDependencies[name] = new Set<string>();
  }

  // Build the dependency graph
  for (const [name, agentData] of Object.entries(agentsDict)) {
    const agentType = agentData.type as AgentType;
    let currentDeps: string[] = [];

    switch (agentType) {
      case AgentType.PARALLEL:
        // Parallel depends on fan_out and fan_in
        currentDeps = [
          ...((agentData.fan_out as string[]) ?? []),
          ...(agentData.fan_in ? [agentData.fan_in as string] : []),
        ];
        break;
      case AgentType.CHAIN:
        // Handle potential legacy 'agents' key or new 'sequence' key
        currentDeps = (agentData.sequence ??
          agentData.agents ??
          []) as string[];
        break;
      case AgentType.ROUTER:
        currentDeps = (agentData.router_agents as string[]) ?? [];
        break;
      case AgentType.ORCHESTRATOR:
        currentDeps = (agentData.child_agents as string[]) ?? [];
        break;
      case AgentType.EVALUATOR_OPTIMIZER:
        currentDeps = [
          ...(agentData.evaluator ? [agentData.evaluator as string] : []),
          ...(agentData.generator ? [agentData.generator as string] : []),
        ];
        break;
      // Add other agent types if they have dependencies
    }

    for (const depName of currentDeps) {
      if (agentNames.has(depName)) {
        // Only add valid dependencies
        dependencies[name].add(depName);
        reverseDependencies[depName].add(name);
      }
      // Optionally warn about dependencies on non-existent agents
      // console.warn(`Agent '${name}' has dependency on non-existent agent '${depName}'`);
    }
  }

  // Check for cycles if not allowed
  if (!allowCycles) {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    for (const name of agentNames) {
      if (!visited.has(name)) {
        detectCycleUtil(
          name,
          dependencies,
          agentNames,
          visited,
          recursionStack,
        );
      }
    }
  }

  // Group agents by dependency level (Topological Sort variant)
  const result: string[][] = [];
  const inDegree: Record<string, number> = {};
  const queue: string[] = [];

  for (const name of agentNames) {
    inDegree[name] = dependencies[name].size;
    if (inDegree[name] === 0) {
      queue.push(name);
    }
  }

  while (queue.length > 0) {
    const currentLevel = [...queue]; // Agents in the current level
    result.push(currentLevel);
    queue.length = 0; // Clear the queue for the next level

    for (const u of currentLevel) {
      for (const v of reverseDependencies[u] || new Set<string>()) {
        if (agentNames.has(v)) {
          // Ensure the dependent agent exists
          inDegree[v]--;
          if (inDegree[v] === 0) {
            queue.push(v);
          }
        }
      }
    }
  }

  // Check if all agents were processed (handles cycles if allowCycles=true)
  const processedCount = result.flat().length;
  if (processedCount !== agentNames.size) {
    if (allowCycles) {
      // If cycles are allowed and some nodes remain, group them (simplistic approach)
      const remaining = new Set(agentNames);
      result.flat().forEach((name) => remaining.delete(name));
      if (remaining.size > 0) {
        console.warn(
          "Dependency cycles detected. Grouping remaining agents.",
          Array.from(remaining),
        );
        result.push(Array.from(remaining));
      }
    } else {
      // This should have been caught by cycle detection if allowCycles=false
      throw new CircularDependencyError(
        "Could not process all agents due to unresolvable dependencies (likely a cycle).",
      );
    }
  }

  return result;
}

// Note: The get_dependencies function from Python seems less used or potentially
// superseded by get_dependencies_groups. If needed, it could be translated similarly,
// focusing on traversing the specific dependency types (fan_out for PARALLEL, sequence for CHAIN).
// However, get_dependencies_groups provides a more robust way to handle general dependencies and cycles.
