/**
 * Integration tests for mixed workflows
 * TypeScript port of test_mixed_workflow.py
 */

import { FastAgent } from '../../../../src/fastAgent';
import { BaseAgent } from '../../../../src/mcpAgent';
import * as directFactory from '../../../../src/core/directFactory';

// --- Define Mock LLMs ---
const routerLlm = { send: jest.fn() };
const agent1Llm = { send: jest.fn() };
const agent2Llm = { send: jest.fn() };
const defaultLlm = { send: jest.fn() }; // Fallback

// Mock the directFactory module
jest.mock('../../../../src/core/directFactory', () => ({
  getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
    // This mock should return a FACTORY FUNCTION
    return () => {
      // Determine which mock LLM to return based on the agent's model name
      if (modelName === 'router-model') {
        return routerLlm;
      } else if (modelName === 'agent1-model') {
        return agent1Llm;
      } else if (modelName === 'agent2-model') {
        return agent2Llm;
      }
      // Default or throw error if unexpected model name
      console.warn(`Mock LLM requested for unexpected model: ${modelName}. Using default.`);
      return defaultLlm;
    };
  }),
}));

// --- Tests ---
describe('Mixed Workflow Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    routerLlm.send.mockClear();
    agent1Llm.send.mockClear();
    agent2Llm.send.mockClear();
    defaultLlm.send.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testMixedInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();
    
    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'default-model',
      }
    };
  });

  it('should handle router with chain workflow', async () => {
    // Define agents
    fast.agent({ 
      name: 'agent1', 
      model: 'agent1-model'
    }, async (agent: BaseAgent) => {
      // Agent function - not needed for test as LLM is mocked
    });

    fast.agent({ 
      name: 'agent2', 
      model: 'agent2-model'
    }, async (agent: BaseAgent) => {
      // Agent function - not needed for test as LLM is mocked
    });

    // Define chain workflow
    fast.chain(
      { 
        name: 'chain', 
        sequence: ['agent1', 'agent2']
      }, 
      async (chainAgent: BaseAgent) => {
        // Set up agent responses
        agent1Llm.send.mockResolvedValueOnce("Agent1 response");
        agent2Llm.send.mockResolvedValueOnce("Agent2 response");

        // Test chain execution
        const result = await chainAgent.send("Chain input");
        expect(result).toContain("Agent2 response");
      }
    );

    // Define router workflow
    fast.router(
      { 
        name: 'router', 
        router_agents: ['agent1', 'agent2', 'chain'],
        model: 'router-model'
      }, 
      async (routerAgent: BaseAgent) => {
        // Mock the router's response to route to the chain
        routerLlm.send.mockResolvedValueOnce(JSON.stringify({
          agent: "chain",
          reason: "This task requires sequential processing"
        }));

        // Test router execution
        const result = await routerAgent.send("Router input");
        expect(result).toContain("Agent2 response");
      }
    );

    // Run FastAgent
    await fast.run();
  });

  it('should handle nested router workflows', async () => {
    // Define agents
    fast.agent({ 
      name: 'agent1', 
      model: 'agent1-model'
    }, async (agent: BaseAgent) => {
      // Agent function - not needed for test as LLM is mocked
    });

    fast.agent({ 
      name: 'agent2', 
      model: 'agent2-model'
    }, async (agent: BaseAgent) => {
      // Agent function - not needed for test as LLM is mocked
    });

    // Define inner router workflow
    fast.router(
      { 
        name: 'inner_router', 
        router_agents: ['agent1', 'agent2'],
        model: 'router-model'
      }, 
      async (innerRouterAgent: BaseAgent) => {
        // Mock the inner router's response to route to agent1
        routerLlm.send.mockResolvedValueOnce(JSON.stringify({
          agent: "agent1",
          reason: "This task is best handled by agent1"
        }));

        // Test inner router execution
        const result = await innerRouterAgent.send("Inner router input");
        expect(result).toContain("Agent1 response");
      }
    );

    // Define outer router workflow
    fast.router(
      { 
        name: 'outer_router', 
        router_agents: ['inner_router', 'agent2'],
        model: 'router-model'
      }, 
      async (outerRouterAgent: BaseAgent) => {
        // Mock agent1 response
        agent1Llm.send.mockResolvedValueOnce("Agent1 response");
        
        // Mock the outer router's response to route to the inner router
        routerLlm.send.mockResolvedValueOnce(JSON.stringify({
          agent: "inner_router",
          reason: "This task requires routing to specialized agents"
        }));

        // Test outer router execution
        const result = await outerRouterAgent.send("Outer router input");
        expect(result).toContain("Agent1 response");
      }
    );

    // Run FastAgent
    await fast.run();
  });
});
