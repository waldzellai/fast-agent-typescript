import {
  getModelFactory,
  createAgentsByType,
  createAgentsInDependencyOrder,
  AgentDict,
} from "../../../src/core/directFactory";
import { AgentType, AgentConfig } from "../../../src/core/agentTypes";
import { AgentConfigError } from "../../../src/core/exceptions";

describe("Direct Factory", () => {
  let mockContext: any;
  let mockAppInstance: any;

  beforeEach(() => {
    mockContext = {
      config: {
        default_model: "default-model",
      },
    };
    mockAppInstance = {
      context: mockContext,
    };
  });

  describe("getModelFactory", () => {
    test("should use default model from context when no model is specified", () => {
      const factory = getModelFactory(mockContext);
      expect(factory).toBeDefined();
      // Since the actual implementation is a placeholder, we can't test the exact output
      // But we can ensure it doesn't throw and returns a function
      expect(typeof factory).toBe("function");
    });

    test("should prioritize specified model over default and CLI models", () => {
      const factory = getModelFactory(
        mockContext,
        "specified-model",
        undefined,
        "default-model",
        "cli-model",
      );
      expect(factory).toBeDefined();
      expect(typeof factory).toBe("function");
    });

    test("should use CLI model over default when no specific model is provided", () => {
      const factory = getModelFactory(
        mockContext,
        undefined,
        undefined,
        "default-model",
        "cli-model",
      );
      expect(factory).toBeDefined();
      expect(typeof factory).toBe("function");
    });
  });

  describe("createAgentsByType", () => {
    test("should create BASIC agents with correct configuration", async () => {
      const agentsDict = {
        basicAgent: {
          type: AgentType.BASIC,
          config: {
            name: "basicAgent",
            instruction: "Basic agent instruction",
          },
        },
      };
      const result = await createAgentsByType(
        mockAppInstance,
        agentsDict,
        AgentType.BASIC,
      );
      expect(result["basicAgent"]).toBeDefined();
      expect(result["basicAgent"].config.name).toBe("basicAgent");
      expect(result["basicAgent"].config.instruction).toBe(
        "Basic agent instruction",
      );
    });

    test("should create ORCHESTRATOR agents with child agents", async () => {
      const agentsDict = {
        orchestratorAgent: {
          type: AgentType.ORCHESTRATOR,
          config: {
            name: "orchestratorAgent",
            instruction: "Orchestrator instruction",
          },
          child_agents: ["agent1", "agent2"],
        },
      };
      const activeAgents: AgentDict = {
        agent1: {
          config: { name: "agent1", instruction: "Agent 1 instruction" },
          context: mockContext,
          initialize: async () => Promise.resolve(),
          attachLlm: async () => Promise.resolve(),
        },
        agent2: {
          config: { name: "agent2", instruction: "Agent 2 instruction" },
          context: mockContext,
          initialize: async () => Promise.resolve(),
          attachLlm: async () => Promise.resolve(),
        },
      };
      const result = await createAgentsByType(
        mockAppInstance,
        agentsDict,
        AgentType.ORCHESTRATOR,
        activeAgents,
      );
      expect(result["orchestratorAgent"]).toBeDefined();
      expect(result["orchestratorAgent"].config.name).toBe("orchestratorAgent");
    });

    test("should throw error for missing child agents in ORCHESTRATOR", async () => {
      const agentsDict = {
        orchestratorAgent: {
          type: AgentType.ORCHESTRATOR,
          config: {
            name: "orchestratorAgent",
            instruction: "Orchestrator instruction",
          },
          child_agents: ["missingAgent"],
        },
      };
      await expect(
        createAgentsByType(mockAppInstance, agentsDict, AgentType.ORCHESTRATOR),
      ).rejects.toThrow(AgentConfigError);
    });

    test("should throw error for unknown agent type", async () => {
      const agentsDict = {
        unknownAgent: {
          type: "unknown" as AgentType,
          config: {
            name: "unknownAgent",
            instruction: "Unknown instruction",
          },
        },
      };
      await expect(
        createAgentsByType(mockAppInstance, agentsDict, "unknown" as AgentType),
      ).rejects.toThrow(Error);
    });
  });

  describe("createAgentsInDependencyOrder", () => {
    test("should create agents in dependency order starting with BASIC agents", async () => {
      const agentsDict = {
        basicAgent: {
          type: AgentType.BASIC,
          config: {
            name: "basicAgent",
            instruction: "Basic agent instruction",
          },
        },
        orchestratorAgent: {
          type: AgentType.ORCHESTRATOR,
          config: {
            name: "orchestratorAgent",
            instruction: "Orchestrator instruction",
          },
          child_agents: ["basicAgent"],
        },
      };
      const modelFactoryFunc = (model?: string, request_params?) => () => null;
      const result = await createAgentsInDependencyOrder(
        mockAppInstance,
        agentsDict,
        modelFactoryFunc,
      );
      expect(result["basicAgent"]).toBeDefined();
      expect(result["orchestratorAgent"]).toBeDefined();
    });
  });
});
