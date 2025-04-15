import {
  validateServerReferences,
  validateWorkflowReferences,
  getDependenciesGroups,
} from "../../../src/core/validation";
import { AgentType } from "../../../src/core/agentTypes";

describe("Validation", () => {
  describe("validateServerReferences", () => {
    test("should throw an error if server references are invalid", () => {
      const context = {
        config: {
          mcp: {
            servers: { server3: {}, server4: {} },
          },
        },
      };
      const agents = {
        agent1: {
          type: AgentType.BASIC,
          config: { name: "agent1", servers: ["server1", "server2"] },
        },
      };
      expect(() => validateServerReferences(context, agents)).toThrow(
        /Missing server configuration/,
      );
    });

    test("should not throw an error if server references are valid", () => {
      const context = {
        config: {
          mcp: {
            servers: { server1: {}, server2: {}, server3: {} },
          },
        },
      };
      const agents = {
        agent1: {
          type: AgentType.BASIC,
          config: { name: "agent1", servers: ["server1", "server2"] },
        },
      };
      expect(() => validateServerReferences(context, agents)).not.toThrow();
    });
  });

  describe("validateWorkflowReferences", () => {
    test("should throw an error for undefined agent references in workflow", () => {
      const agents = {
        agent1: { type: AgentType.PARALLEL, agents: ["agent2"] },
      };
      expect(() => validateWorkflowReferences(agents)).toThrow(
        /references non-existent/,
      );
    });

    test("should throw an error for cyclic dependencies", () => {
      const agents = {
        agent1: { type: AgentType.CHAIN, sequence: ["agent2"] },
        agent2: { type: AgentType.CHAIN, sequence: ["agent1"] },
      };
      expect(() => validateWorkflowReferences(agents)).toThrow(
        /Cycle detected/,
      );
    });

    test("should not throw an error for valid workflow references", () => {
      const agents = {
        agent1: { type: AgentType.PARALLEL, agents: ["agent2"] },
        agent2: { type: AgentType.BASIC, agents: [] },
      };
      expect(() => validateWorkflowReferences(agents)).not.toThrow();
    });
  });

  describe("getDependenciesGroups", () => {
    test("should return correct dependency groups for basic agents", () => {
      const agentsDict = {
        agent1: { type: AgentType.BASIC, agents: [] },
        agent2: { type: AgentType.BASIC, agents: [] },
      };
      const groups = getDependenciesGroups(agentsDict);
      expect(groups).toEqual([["agent1", "agent2"]]);
    });

    test("should return correct dependency groups for chained agents", () => {
      const agentsDict = {
        agent1: { type: AgentType.CHAIN, sequence: ["agent2"] },
        agent2: { type: AgentType.BASIC, agents: [] },
      };
      const groups = getDependenciesGroups(agentsDict);
      expect(groups).toEqual([["agent2"], ["agent1"]]);
    });

    test("should handle complex dependency structures", () => {
      const agentsDict = {
        agent1: { type: AgentType.PARALLEL, fan_out: ["agent2", "agent3"] },
        agent2: { type: AgentType.BASIC, agents: [] },
        agent3: { type: AgentType.CHAIN, sequence: ["agent4"] },
        agent4: { type: AgentType.BASIC, agents: [] },
      };
      const groups = getDependenciesGroups(agentsDict);
      expect(groups).toEqual([["agent2", "agent4"], ["agent3"], ["agent1"]]);
    });
  });
});
