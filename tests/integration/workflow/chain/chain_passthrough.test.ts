/**
 * Integration tests for chain passthrough functionality
 * TypeScript port of test_chain_passthrough.py
 */

import { FastAgent } from '../../../../src/fastAgent';
import { BaseAgent } from '../../../../src/mcpAgent';
import * as directFactory from '../../../../src/core/directFactory';

// --- Define Mock LLMs ---
const agent1Llm = { send: jest.fn() };
const agent2Llm = { send: jest.fn() };
const agent3Llm = { send: jest.fn() };
const defaultLlm = { send: jest.fn() }; // Fallback

// Mock the directFactory module
jest.mock('../../../../src/core/directFactory', () => ({
  getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
    // This mock should return a FACTORY FUNCTION
    return () => {
      // Determine which mock LLM to return based on the agent's model name
      if (modelName === 'agent1-model') {
        return agent1Llm;
      } else if (modelName === 'agent2-model') {
        return agent2Llm;
      } else if (modelName === 'agent3-model') {
        return agent3Llm;
      }
      // Default or throw error if unexpected model name
      console.warn(`Mock LLM requested for unexpected model: ${modelName}. Using default.`);
      return defaultLlm;
    };
  }),
}));

// --- Tests ---
describe('Chain Passthrough Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    agent1Llm.send.mockClear();
    agent2Llm.send.mockClear();
    agent3Llm.send.mockClear();
    defaultLlm.send.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testChainPassthroughInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();
    
    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'default-model',
      }
    };
  });

  it('should pass through messages in a chain', async () => {
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

    fast.agent({ 
      name: 'agent3', 
      model: 'agent3-model'
    }, async (agent: BaseAgent) => {
      // Agent function - not needed for test as LLM is mocked
    });

    // Define chain workflow
    fast.chain(
      { 
        name: 'chain', 
        sequence: ['agent1', 'agent2', 'agent3']
      }, 
      async (chainAgent: BaseAgent) => {
        // Set up agent responses
        agent1Llm.send.mockImplementation(message => {
          return Promise.resolve(`Agent1 processed: ${message}`);
        });
        
        agent2Llm.send.mockImplementation(message => {
          return Promise.resolve(`Agent2 processed: ${message}`);
        });
        
        agent3Llm.send.mockImplementation(message => {
          return Promise.resolve(`Agent3 processed: ${message}`);
        });

        // Test chain execution
        const result = await chainAgent.send("Initial input");
        
        // Verify that the message was passed through the chain
        expect(result).toContain("Agent3 processed");
        expect(result).toContain("Agent2 processed");
      }
    );

    // Run FastAgent
    await fast.run();
  });

  it('should handle cumulative chain with passthrough', async () => {
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

    // Define chain workflow with cumulative option
    fast.chain(
      { 
        name: 'cumulative_chain', 
        sequence: ['agent1', 'agent2'],
        cumulative: true
      }, 
      async (chainAgent: BaseAgent) => {
        // Set up agent responses
        agent1Llm.send.mockImplementation(message => {
          return Promise.resolve(`Agent1 output for: ${message}`);
        });
        
        agent2Llm.send.mockImplementation(message => {
          return Promise.resolve(`Agent2 final output based on: ${message}`);
        });

        // Test chain execution
        const result = await chainAgent.send("Initial cumulative input");
        
        // Verify that the message was passed through the chain cumulatively
        expect(result).toContain("Agent2 final output");
        expect(result).toContain("Agent1 output");
        expect(result).toContain("Initial cumulative input");
      }
    );

    // Run FastAgent
    await fast.run();
  });
});
