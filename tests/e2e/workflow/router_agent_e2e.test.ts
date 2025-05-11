/**
 * E2E tests for the Router agent workflow
 * TypeScript port of test_router_agent_e2e.py
 */

import * as path from 'path';
import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import { Prompt } from '../../../src/core/prompt';
import * as directFactory from '../../../src/core/directFactory';

// --- Define Mock LLMs ---
const sunnyLlm = {
  send: jest.fn().mockImplementation(() => {
    return Promise.resolve('beachball');
  }),
  generate: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      first_text: () => 'beachball',
    });
  }),
};

const stormyLlm = {
  send: jest.fn().mockImplementation(() => {
    return Promise.resolve('umbrella');
  }),
  generate: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      first_text: () => 'umbrella',
    });
  }),
};

const routerLlm = {
  send: jest.fn().mockImplementation((message: string) => {
    if (message.toLowerCase().includes('sunny')) {
      return Promise.resolve(
        'I will route to the sunny agent\n\n***ROUTE sunny'
      );
    } else {
      return Promise.resolve(
        'I will route to the stormy agent\n\n***ROUTE stormy'
      );
    }
  }),
  generate: jest.fn().mockImplementation((messages: any[]) => {
    // Check if the message contains an image
    const hasImage = messages.some(
      (msg) =>
        msg.content &&
        Array.isArray(msg.content) &&
        msg.content.some((item: any) => item.type === 'image')
    );

    // Check image filename if available
    const imagePath = hasImage
      ? messages
          .find(
            (msg) =>
              msg.content &&
              Array.isArray(msg.content) &&
              msg.content.some((item: any) => item.type === 'image')
          )
          ?.content.find((item: any) => item.type === 'image')?.path
      : '';

    if (imagePath && imagePath.includes('sunny')) {
      return Promise.resolve({
        first_text: () => 'I will route to the sunny agent\n\n***ROUTE sunny',
      });
    } else {
      return Promise.resolve({
        first_text: () => 'I will route to the stormy agent\n\n***ROUTE stormy',
      });
    }
  }),
};

const defaultLlm = {
  send: jest.fn(),
  generate: jest.fn(),
}; // Fallback

// Mock the directFactory module
jest.mock('../../../src/core/directFactory', () => ({
  getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
    // This mock should return a FACTORY FUNCTION
    return () => {
      // Determine which mock LLM to return based on the agent's model name
      if (modelName === 'passthrough' && _context?.agentName === 'sunny') {
        return sunnyLlm;
      } else if (
        modelName === 'passthrough' &&
        _context?.agentName === 'stormy'
      ) {
        return stormyLlm;
      } else if (['haiku', 'gpt-4.1-mini'].includes(modelName)) {
        return routerLlm;
      }
      // Default or throw error if unexpected model name
      console.warn(
        `Mock LLM requested for unexpected model: ${modelName}. Using default.`
      );
      return defaultLlm;
    };
  }),
}));

// Test models to run the tests with
const testModels = ['haiku', 'gpt-4.1-mini'];

// --- Tests ---
describe('Router Agent E2E Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    sunnyLlm.send.mockClear();
    sunnyLlm.generate.mockClear();
    stormyLlm.send.mockClear();
    stormyLlm.generate.mockClear();
    routerLlm.send.mockClear();
    routerLlm.generate.mockClear();
    defaultLlm.send.mockClear();
    defaultLlm.generate.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testRouterE2EInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();

    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'passthrough',
      },
    };
  });

  testModels.forEach((modelName) => {
    it(`should route based on text content using ${modelName}`, async () => {
      // Define sunny agent
      fast.agent(
        {
          name: 'sunny',
          instruction:
            'You dispense advice on clothing and activities for clement weather.',
          model: 'passthrough',
        },
        async (agent: BaseAgent) => {
          // Not needed for test as LLM is mocked
        }
      );

      // Define stormy agent
      fast.agent(
        {
          name: 'stormy',
          instruction:
            'You dispense advice on clothing and activities for stormy weather.',
          model: 'passthrough',
        },
        async (agent: BaseAgent) => {
          // Not needed for test as LLM is mocked
        }
      );

      // Define router workflow
      fast.router(
        {
          name: 'weather',
          instruction:
            'Route to the most appropriate agent for the weather forecast received',
          agents: ['sunny', 'stormy'],
          model: modelName,
        },
        async (agent: BaseAgent) => {
          // Set fixed responses for the sunny and stormy agents
          await agent.sunny.send('***FIXED_RESPONSE beachball');
          await agent.stormy.send('***FIXED_RESPONSE umbrella');

          // Test routing to sunny agent
          const sunnyResponse = await agent.weather.send(
            'the weather is sunny'
          );
          expect(sunnyResponse.toLowerCase()).toContain('beachball');

          // Test routing to stormy agent
          const stormyResponse = await agent.weather.send(
            'storm clouds coming, looks snowy'
          );
          expect(stormyResponse.toLowerCase()).toContain('umbrella');
        }
      );

      // Run FastAgent
      await fast.run();
    });

    it(`should route based on image content using ${modelName}`, async () => {
      // Define sunny agent
      fast.agent(
        {
          name: 'sunny',
          instruction:
            'You dispense advice on clothing and activities for clement weather.',
          model: 'passthrough',
        },
        async (agent: BaseAgent) => {
          // Not needed for test as LLM is mocked
        }
      );

      // Define stormy agent
      fast.agent(
        {
          name: 'stormy',
          instruction:
            'You dispense advice on clothing and activities for stormy weather.',
          model: 'passthrough',
        },
        async (agent: BaseAgent) => {
          // Not needed for test as LLM is mocked
        }
      );

      // Define router workflow
      fast.router(
        {
          name: 'weather',
          instruction: 'Use the image to route to the most appropriate agent.',
          agents: ['sunny', 'stormy'],
          model: modelName,
          use_history: false,
        },
        async (agent: BaseAgent) => {
          // Set fixed responses for the sunny and stormy agents
          await agent.sunny.send('***FIXED_RESPONSE beachball');
          await agent.stormy.send('***FIXED_RESPONSE umbrella');

          // Test routing with sunny image
          const sunnyResponse = await agent.weather.generate([
            Prompt.user(
              path.resolve(__dirname, 'sunny.png'),
              "here's the image"
            ),
          ]);
          expect(sunnyResponse.first_text().toLowerCase()).toContain(
            'beachball'
          );

          // Test routing with umbrella image
          const stormyResponse = await agent.weather.generate([
            Prompt.user(
              path.resolve(__dirname, 'umbrella.png'),
              "here's the image"
            ),
          ]);
          expect(stormyResponse.first_text().toLowerCase()).toContain(
            'umbrella'
          );
        }
      );

      // Run FastAgent
      await fast.run();
    });
  });
});
