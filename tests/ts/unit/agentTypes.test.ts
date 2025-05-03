import { AgentType, AgentConfig } from "../../../src/core/agentTypes";

describe("Agent Types", () => {
  describe("AgentType Enum", () => {
    test("should have correct values for AgentType enum", () => {
      expect(AgentType.BASIC).toBe("agent");
      expect(AgentType.ORCHESTRATOR).toBe("orchestrator");
      expect(AgentType.PARALLEL).toBe("parallel");
      expect(AgentType.EVALUATOR_OPTIMIZER).toBe("evaluator_optimizer");
      expect(AgentType.ROUTER).toBe("router");
      expect(AgentType.CHAIN).toBe("chain");
    });
  });

  describe("AgentConfig Interface", () => {
    test("should allow creation of AgentConfig with required and optional properties", () => {
      const config: AgentConfig = {
        name: "TestAgent",
      };

      expect(config.name).toBe("TestAgent");
      expect(config.instruction).toBeUndefined();
      expect(config.servers).toBeUndefined();
      expect(config.model).toBeUndefined();
      expect(config.use_history).toBeUndefined();
      expect(config.default_request_params).toBeUndefined();
      expect(config.human_input).toBeUndefined();
      expect(config.agent_type).toBeUndefined();
    });

    test("should allow full configuration of AgentConfig", () => {
      const config: AgentConfig = {
        name: "FullConfigAgent",
        instruction: "Custom instruction",
        servers: ["server1", "server2"],
        model: "gpt-3.5-turbo",
        use_history: false,
        default_request_params: {
          use_history: false,
          systemPrompt: "Custom instruction",
        },
        human_input: true,
        agent_type: AgentType.ORCHESTRATOR,
      };

      expect(config.name).toBe("FullConfigAgent");
      expect(config.instruction).toBe("Custom instruction");
      expect(config.servers).toEqual(["server1", "server2"]);
      expect(config.model).toBe("gpt-3.5-turbo");
      expect(config.use_history).toBe(false);
      expect(config.default_request_params).toEqual({
        use_history: false,
        systemPrompt: "Custom instruction",
      });
      expect(config.human_input).toBe(true);
      expect(config.agent_type).toBe(AgentType.ORCHESTRATOR);
    });
  });
});
