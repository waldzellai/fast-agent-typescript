import {
  agent,
  orchestrator,
  router,
  chain,
  parallel,
  evaluatorOptimizer,
} from "../../../src/core/directDecorators";
import { AgentType } from "../../../src/core/agentTypes";
import { AgentConfigError } from "../../../src/core/exceptions";

describe("Direct Decorators", () => {
  let mockSelf: any;

  beforeEach(() => {
    mockSelf = {
      agents: {},
    };
  });

  describe("agent decorator", () => {
    test("should create a basic agent with default settings", () => {
      const decorated = agent(mockSelf, "basicAgent")(() => "result");
      expect(decorated._agent_type).toBe(AgentType.BASIC);
      expect(decorated._agent_config.name).toBe("basicAgent");
      expect(decorated._agent_config.instruction).toBe(
        "You are a helpful agent.",
      );
      expect(decorated._agent_config.use_history).toBe(true);
      expect(mockSelf.agents["basicAgent"]).toBeDefined();
    });

    test("should allow custom instruction and options", () => {
      const decorated = agent(mockSelf, "customAgent", "Custom instruction", {
        servers: ["server1"],
        model: "gpt-3.5",
        use_history: false,
        human_input: true,
      })(() => "result");
      expect(decorated._agent_config.instruction).toBe("Custom instruction");
      expect(decorated._agent_config.servers).toEqual(["server1"]);
      expect(decorated._agent_config.model).toBe("gpt-3.5");
      expect(decorated._agent_config.use_history).toBe(false);
      expect(decorated._agent_config.human_input).toBe(true);
    });
  });

  describe("orchestrator decorator", () => {
    test("should create an orchestrator with specified agents", () => {
      const decorated = orchestrator(mockSelf, "orchestratorAgent", {
        agents: ["agent1", "agent2"],
        plan_type: "iterative",
        max_iterations: 10,
      })(() => "result");
      expect(decorated._agent_type).toBe(AgentType.ORCHESTRATOR);
      expect(decorated._agent_config.name).toBe("orchestratorAgent");
      expect(decorated._child_agents).toEqual(["agent1", "agent2"]);
      expect(decorated._plan_type).toBe("iterative");
      expect(mockSelf.agents["orchestratorAgent"].max_iterations).toBe(10);
    });
  });

  describe("router decorator", () => {
    test("should create a router with specified agents", () => {
      const decorated = router(mockSelf, "routerAgent", {
        agents: ["agentA", "agentB"],
        instruction: "Custom router instruction",
      })(() => "result");
      expect(decorated._agent_type).toBe(AgentType.ROUTER);
      expect(decorated._agent_config.name).toBe("routerAgent");
      expect(decorated._router_agents).toEqual(["agentA", "agentB"]);
      expect(decorated._agent_config.instruction).toBe(
        "Custom router instruction",
      );
    });
  });

  describe("chain decorator", () => {
    test("should create a chain with specified sequence", () => {
      const decorated = chain(mockSelf, "chainAgent", {
        sequence: ["step1", "step2"],
        cumulative: true,
      })(() => "result");
      expect(decorated._agent_type).toBe(AgentType.CHAIN);
      expect(decorated._agent_config.name).toBe("chainAgent");
      expect(decorated._chain_agents).toEqual(["step1", "step2"]);
      expect(mockSelf.agents["chainAgent"].cumulative).toBe(true);
    });

    test("should throw error for empty sequence", () => {
      expect(() => {
        chain(mockSelf, "invalidChain", { sequence: [] })(() => "result");
      }).toThrow(AgentConfigError);
    });
  });

  describe("parallel decorator", () => {
    test("should create a parallel processor with fan-out agents", () => {
      const decorated = parallel(mockSelf, "parallelAgent", {
        fan_out: ["worker1", "worker2"],
        fan_in: "aggregator",
        include_request: false,
      })(() => "result");
      expect(decorated._agent_type).toBe(AgentType.PARALLEL);
      expect(decorated._agent_config.name).toBe("parallelAgent");
      expect(decorated._fan_out).toEqual(["worker1", "worker2"]);
      expect(decorated._fan_in).toBe("aggregator");
      expect(mockSelf.agents["parallelAgent"].include_request).toBe(false);
    });
  });

  describe("evaluatorOptimizer decorator", () => {
    test("should create an evaluator-optimizer with generator and evaluator", () => {
      const decorated = evaluatorOptimizer(mockSelf, "optimizerAgent", {
        generator: "genAgent",
        evaluator: "evalAgent",
        min_rating: "EXCELLENT",
        max_refinements: 5,
      })(() => "result");
      expect(decorated._agent_type).toBe(AgentType.EVALUATOR_OPTIMIZER);
      expect(decorated._agent_config.name).toBe("optimizerAgent");
      expect(decorated._generator).toBe("genAgent");
      expect(decorated._evaluator).toBe("evalAgent");
      expect(mockSelf.agents["optimizerAgent"].min_rating).toBe("EXCELLENT");
      expect(mockSelf.agents["optimizerAgent"].max_refinements).toBe(5);
    });
  });
});
