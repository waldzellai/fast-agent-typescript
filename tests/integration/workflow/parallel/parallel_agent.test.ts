/**
 * Integration tests for the Parallel workflow
 * TypeScript port of test_parallel_agent.py
 */

import { FastAgent } from '../../../../src/fastAgent';
import { BaseAgent } from '../../../../src/mcpAgent';
import { Prompt } from '../../../../src/core/prompt';
import * as directFactory from '../../../../src/core/directFactory';

// --- Define Mock LLMs ---
const fanOut1Llm = { send: jest.fn() };
const fanOut2Llm = { send: jest.fn() };
const fanInLlm = { send: jest.fn() };
const defaultLlm = { send: jest.fn() }; // Fallback

// Constants
const FIXED_RESPONSE_INDICATOR = '[FIXED_RESPONSE]';

// Mock the directFactory module
jest.mock('../../../../src/core/directFactory', () => ({
  getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
    // This mock should return a FACTORY FUNCTION
    return () => {
      // Determine which mock LLM to return based on the agent's model name
      if (modelName === 'fan-out-1-model') {
        return fanOut1Llm;
      } else if (modelName === 'fan-out-2-model') {
        return fanOut2Llm;
      } else if (modelName === 'fan-in-model') {
        return fanInLlm;
      }
      // Default or throw error if unexpected model name
      console.warn(
        `Mock LLM requested for unexpected model: ${modelName}. Using default.`
      );
      return defaultLlm;
    };
  }),
}));

// --- Tests ---
describe('Parallel Workflow Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    fanOut1Llm.send.mockClear();
    fanOut2Llm.send.mockClear();
    fanInLlm.send.mockClear();
    defaultLlm.send.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testParallelInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();

    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'default-model',
      },
    };

    // Set up mock responses for fan-out agents
    // Both fan-out agents will echo back the input
    fanOut1Llm.send.mockImplementation((message) => {
      if (typeof message === 'string') {
        return Promise.resolve(message);
      }
      return Promise.resolve(JSON.stringify(message));
    });

    fanOut2Llm.send.mockImplementation((message) => {
      if (typeof message === 'string') {
        return Promise.resolve(message);
      }
      return Promise.resolve(JSON.stringify(message));
    });
  });

  it('should run parallel workflow with explicit fan-in', async () => {
    // Define fan-out agents
    fast.agent(
      {
        name: 'fan_out_1',
        model: 'fan-out-1-model',
      },
      async (agent: BaseAgent) => {
        // Agent function - not needed for test as LLM is mocked
      }
    );

    fast.agent(
      {
        name: 'fan_out_2',
        model: 'fan-out-2-model',
      },
      async (agent: BaseAgent) => {
        // Agent function - not needed for test as LLM is mocked
      }
    );

    // Define fan-in agent
    fast.agent(
      {
        name: 'fan_in',
        model: 'fan-in-model',
      },
      async (agent: BaseAgent) => {
        // Agent function - not needed for test as LLM is mocked
      }
    );

    // Define parallel workflow
    fast.parallel(
      {
        name: 'parallel',
        fan_out: ['fan_out_1', 'fan_out_2'],
        fan_in: 'fan_in',
      },
      async (parallelAgent: BaseAgent) => {
        // Expected response format
        const expected = `The following request was sent to the agents:

<fastagent:request>
foo
</fastagent:request>

<fastagent:response agent="fan_out_1">
foo
</fastagent:response>

<fastagent:response agent="fan_out_2">
foo
</fastagent:response>`;

        // Mock the fan-in agent to return the expected format
        fanInLlm.send.mockResolvedValueOnce(expected);

        // Test the parallel workflow
        const result = await parallelAgent.send('foo');
        expect(result).toBe(expected);

        // Assert that fan-out agents were called
        expect(fanOut1Llm.send).toHaveBeenCalled();
        expect(fanOut2Llm.send).toHaveBeenCalled();
        // Assert that fan-in agent was called
        expect(fanInLlm.send).toHaveBeenCalled();
      }
    );

    // Run FastAgent
    await fast.run();
  });

  it('should run parallel workflow with default fan-in', async () => {
    // Define fan-out agents
    fast.agent(
      {
        name: 'fan_out_1',
        model: 'fan-out-1-model',
      },
      async (agent: BaseAgent) => {
        // Agent function - not needed for test as LLM is mocked
      }
    );

    fast.agent(
      {
        name: 'fan_out_2',
        model: 'fan-out-2-model',
      },
      async (agent: BaseAgent) => {
        // Agent function - not needed for test as LLM is mocked
      }
    );

    // Define parallel workflow without explicit fan-in
    fast.parallel(
      {
        name: 'parallel',
        fan_out: ['fan_out_1', 'fan_out_2'],
        // No fanIn specified - should create automatically
      },
      async (parallelAgent: BaseAgent) => {
        // Expected response format
        const expected = `The following request was sent to the agents:

<fastagent:request>
foo
</fastagent:request>

<fastagent:response agent="fan_out_1">
foo
</fastagent:response>

<fastagent:response agent="fan_out_2">
foo
</fastagent:response>`;

        // Mock the default LLM to return the expected format
        // This will be used by the auto-created fan-in agent
        defaultLlm.send.mockResolvedValueOnce(expected);

        // Test the parallel workflow
        const result = await parallelAgent.send('foo');
        expect(result).toBe(expected);

        // Assert that fan-out agents were called
        expect(fanOut1Llm.send).toHaveBeenCalled();
        expect(fanOut2Llm.send).toHaveBeenCalled();
      }
    );

    // Run FastAgent
    await fast.run();
  });
});
