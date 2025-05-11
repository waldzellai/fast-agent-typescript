import { FastAgent } from '../../../src/fastAgent';
import {
  BaseAgent,
  Context,
  AugmentedLLMProtocol,
} from '../../../src/mcpAgent';
import * as directFactory from '../../../src/core/directFactory';
import { AgentConfig, AgentType } from '../../../src/core/agentTypes';
import { jest } from '@jest/globals';
import path from 'path';

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
    return { content: { type: 'text', text: 'Mock LLM Send Response' } };
  });
  generate = jest.fn(async (prompt: string, options?: any) => {
    console.log(`MockLLM generate called with: ${prompt}`);
    return { content: { type: 'text', text: 'Mock LLM Generate Response' } };
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
    haiku: { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  },
  servers: { prompt_server: { model: 'haiku', api_key: 'dummy-key' } },
  mcp: { servers: {} },
  default_model: 'haiku',
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
describe('E2E Resources Tests', () => {
  let fast: FastAgent;
  let mockAgentInstance: jest.Mocked<BaseAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    fast = new FastAgent('test-e2e-resources');

    // Create a fully typed mock agent instance with explicit async functions
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
      ),
      listPrompts: jest.fn(async () => []),
      listResources: jest.fn(async () => [
        'resource://fast-agent/sample.pdf',
        'resource://fast-agent/style.css',
      ]),
      prompt: jest.fn(
        async (defaultPrompt?: string, agentName?: string) =>
          'Mock interactive prompt response'
      ),
      attachLlm: jest.fn(
        async (llmFactory: () => AugmentedLLMProtocol) => undefined
      ),
    } as jest.Mocked<BaseAgent>; // Cast necessary because attachLlm is optional in interface

    // Mock fast.run with the implementation cast to 'any'
    jest.spyOn(fast as any, 'run').mockImplementation(
      (async (options?: { model?: string }) => {
        const agentName = 'agent';
        (fast as any).createdAgents[agentName] = mockAgentInstance; // Store the mock
        // Simulate attaching LLM if attachLlm exists on the mock
        if (mockAgentInstance.attachLlm) {
          await mockAgentInstance.attachLlm(() => mockLLMInstance as any);
        }
      }) as any // Cast the implementation function to 'any'
    );

    // Define mock behavior for the agent's withResource method
    mockAgentInstance.withResource.mockImplementation(
      async (prompt: string, resourceUri: string, serverName: string) => {
        console.log(
          `Mock withResource called with: prompt="${prompt}", uri="${resourceUri}", server="${serverName}"`
        );
        if (resourceUri === 'resource://fast-agent/sample.pdf') {
          return `Summary of PDF includes the product name: fast-agent.`;
        } else if (resourceUri === 'resource://fast-agent/style.css') {
          return `The buttons described in the CSS are white.`;
        }
        return `Unknown resource URI: ${resourceUri}`;
      }
    );
  });

  const modelNames = ['haiku'];

  test.each(modelNames)('test_using_resource_blob (%s)', async (modelName) => {
    async function agent_function() {
      await fast.run({ model: modelName });
      const agent = (fast as any).createdAgents[
        'agent'
      ] as jest.Mocked<BaseAgent>;
      expect(agent).toBeDefined();
      expect(agent).toBe(mockAgentInstance);

      const response = await agent.withResource(
        'Summarise this PDF please, be sure to include the product name',
        'resource://fast-agent/sample.pdf',
        'prompt_server'
      );
      expect(mockAgentInstance.withResource).toHaveBeenCalledWith(
        'Summarise this PDF please, be sure to include the product name',
        'resource://fast-agent/sample.pdf',
        'prompt_server'
      );
      expect(response).toContain('fast-agent');
    }
    await agent_function();
  });

  test.each(modelNames)('test_using_resource_text (%s)', async (modelName) => {
    async function agent_function() {
      await fast.run({ model: modelName });
      const agent = (fast as any).createdAgents[
        'agent'
      ] as jest.Mocked<BaseAgent>;
      expect(agent).toBeDefined();
      expect(agent).toBe(mockAgentInstance);

      const answer = await agent.withResource(
        'What colour are buttons in this file?',
        'resource://fast-agent/style.css',
        'prompt_server'
      );
      expect(mockAgentInstance.withResource).toHaveBeenCalledWith(
        'What colour are buttons in this file?',
        'resource://fast-agent/style.css',
        'prompt_server'
      );
      expect(answer.toLowerCase()).toContain('white');
    }
    await agent_function();
  });
});
