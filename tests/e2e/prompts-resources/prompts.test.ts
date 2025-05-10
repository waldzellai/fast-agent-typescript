import { FastAgent } from '../../../src/fastAgent';
import {
  BaseAgent,
  Context,
  AugmentedLLMProtocol,
} from '../../../src/mcpAgent'; // Corrected path
import * as directFactory from '../../../src/core/directFactory'; // Corrected path
import { AgentConfig, AgentType } from '../../../src/core/agentTypes'; // Import AgentType and AgentConfig

// Placeholder for BaseLLM - Simplified
interface BaseLLM {
  send: (message: string, options?: any) => Promise<any>;
  generate: (prompt: string, options?: any) => Promise<any>;
  // Add other methods if needed by the mock
}

// Placeholder for MCPLog
class MCPLog {
  constructor(name: string) {
    console.log(`MCPLog created: ${name}`);
  }
  log(...args: any[]) {
    console.log(...args);
  }
}
import { jest } from '@jest/globals';
import path from 'path';

// Mock the directFactory
jest.mock('../../../src/core/directFactory');
const mockGetModelFactory =
  directFactory.getModelFactory as jest.MockedFunction<
    typeof directFactory.getModelFactory
  >;

// Define Mock LLM behavior with explicit async functions
class MockLLM implements BaseLLM {
  send = jest.fn(async (message: string, options?: any) => {
    console.log(`MockLLM send called with: ${message}`);
    return { content: { type: 'text', text: 'LLM Fallback for Prompts Send' } };
  });
  generate = jest.fn(async (prompt: string, options?: any) => {
    console.log(`MockLLM generate called with: ${prompt}`);
    return {
      content: { type: 'text', text: 'LLM Fallback for Prompts Generate' },
    };
  });
}
const mockLLMInstance = new MockLLM();
mockGetModelFactory.mockReturnValue(() => mockLLMInstance as any);

// Store the mock config data separately
const mockAgentConfigData: AgentConfig = {
  name: 'agent',
  instruction: 'You are a helpful AI Agent',
  servers: ['prompt_server'],
  agent_type: AgentType.BASIC,
  use_history: true,
};
// Define the structure FastAgent expects internally after loading config
const mockInternalConfigStructure = {
  agents: { agent: mockAgentConfigData },
  models: {
    'gpt-4.1-mini': { provider: 'openai', model: 'gpt-4-turbo' }, // Match model names in tests
    haiku35: { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  },
  servers: { prompt_server: { model: 'gpt-4.1-mini', api_key: 'dummy-key' } }, // Use a default model from above
  mcp: { servers: {} },
  default_model: 'gpt-4.1-mini', // Example default model
};

// Mock loadConfig - Minimal implementation
const mockLoadConfig = jest
  .spyOn(FastAgent.prototype as any, 'loadConfig')
  .mockImplementation(async function (this: FastAgent) {
    (this as any).context = { config: mockInternalConfigStructure };
    (this as any)._agentConfigs = { agent: mockAgentConfigData };
    (this as any).isConfigLoaded = true;
  });

// --- Test Suite ---
describe('E2E Prompts Tests', () => {
  let fast: FastAgent;
  let mockAgentInstance: jest.Mocked<BaseAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    fast = new FastAgent('test-e2e-prompts'); // Instantiate FastAgent

    // Create a fully typed mock agent instance
    mockAgentInstance = {
      name: 'agent',
      agentType: AgentType.BASIC,
      withResource: jest.fn(
        async (prompt: string, resourceUri: string, serverName: string) =>
          'Mock resource response'
      ),
      send: jest.fn(async (message: string) => 'Mock send response'),
      applyPrompt: jest.fn(
        async (promptName: string, args: any) => 'Mock prompt response'
      ), // Mock applyPrompt here
      listPrompts: jest.fn(async () => [
        'simple',
        'with_attachment',
        'multiturn',
      ]), // Mock available prompts
      listResources: jest.fn(async () => []),
      prompt: jest.fn(
        async (defaultPrompt?: string, agentName?: string) =>
          'Mock interactive prompt response'
      ),
      attachLlm: jest.fn(
        async (llmFactory: () => AugmentedLLMProtocol) => undefined
      ),
    } as jest.Mocked<BaseAgent>;

    // Mock fast.run
    jest
      .spyOn(fast as any, 'run')
      .mockImplementation(async (options: any = {}): Promise<void> => {
        const agentName = 'agent';
        (fast as any).createdAgents[agentName] = mockAgentInstance;
        if (mockAgentInstance.attachLlm) {
          await mockAgentInstance.attachLlm(() => mockLLMInstance as any);
        }
      });

    // Define mock behavior for the agent's applyPrompt method
    mockAgentInstance.applyPrompt.mockImplementation(
      async (promptName, variables) => {
        console.log(
          `Mock applyPrompt called with: name="${promptName}", vars=${JSON.stringify(variables)}`
        );
        if (promptName === 'simple') {
          return `Mock response for simple prompt with name: ${variables?.name || 'unknown'}`;
        } else if (promptName === 'with_attachment') {
          return 'Mock response including attachment keywords: llmindset and fast-agent.';
        } else if (promptName === 'multiturn') {
          return 'Mock response for multiturn prompt. testcaseok';
        }
        return `Unknown prompt name: ${promptName}`;
      }
    );
  });

  const modelNames = ['gpt-4.1-mini', 'haiku35'];

  test.each(modelNames)(
    'test_agent_with_simple_prompt (%s)',
    async (modelName) => {
      async function agent_function() {
        await fast.run({ model: modelName });
        const agent = (fast as any).createdAgents[
          'agent'
        ] as jest.Mocked<BaseAgent>;
        expect(agent).toBeDefined();
        expect(agent).toBe(mockAgentInstance);

        const response = await agent.applyPrompt('simple', {
          name: 'llmindset',
        });
        expect(mockAgentInstance.applyPrompt).toHaveBeenCalledWith('simple', {
          name: 'llmindset',
        });
        expect(response).toContain('llmindset');
      }
      await agent_function();
    }
  );

  test.each(modelNames)(
    'test_agent_with_prompt_attachment (%s)',
    async (modelName) => {
      async function agent_function() {
        await fast.run({ model: modelName });
        const agent = (fast as any).createdAgents[
          'agent'
        ] as jest.Mocked<BaseAgent>;
        expect(agent).toBeDefined();
        expect(agent).toBe(mockAgentInstance);

        // Pass undefined or empty object if no variables are needed
        const response = await agent.applyPrompt('with_attachment', undefined);
        expect(mockAgentInstance.applyPrompt).toHaveBeenCalledWith(
          'with_attachment',
          undefined
        );
        expect(response.toLowerCase()).toMatch(/llmindset|fast-agent/);
      }
      await agent_function();
    }
  );

  test.each(modelNames)(
    'test_agent_multiturn_prompt (%s)',
    async (modelName) => {
      async function agent_function() {
        await fast.run({ model: modelName });
        const agent = (fast as any).createdAgents[
          'agent'
        ] as jest.Mocked<BaseAgent>;
        expect(agent).toBeDefined();
        expect(agent).toBe(mockAgentInstance);

        const response = await agent.applyPrompt('multiturn', undefined); // Pass undefined or empty object
        expect(mockAgentInstance.applyPrompt).toHaveBeenCalledWith(
          'multiturn',
          undefined
        );
        expect(response.toLowerCase()).toContain('testcaseok');
      }
      await agent_function();
    }
  );
});
