import { ZodError, z } from 'zod';
import { FastAgent } from '../../../../src/fastAgent';
import { Prompt, PromptMessageMultipart } from '../../../../src/core/prompt';
import { BaseAgent } from '../../../../src/mcpAgent';
import * as directFactory from '../../../../src/core/directFactory';
import path from 'path';
import fs from 'fs';

// --- Define Mock LLMs ---
const routerLlm = { send: jest.fn() };
const target1Llm = { send: jest.fn() };
const target2Llm = { send: jest.fn() };
const structuredAgentLlm = { send: jest.fn() };
const availableAgentLlm = { send: jest.fn() };
const anotherAgentLlm = { send: jest.fn() };
const defaultLlm = { send: jest.fn() }; // Fallback

// Mock the directFactory module
jest.mock('../../../../src/core/directFactory', () => ({
  getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
    // This mock should return a FACTORY FUNCTION
    return () => {
      // Determine which mock LLM to return based on the agent's model name
      if (modelName === 'router-model') {
        return routerLlm;
      } else if (modelName === 'target1-model') {
        return target1Llm;
      } else if (modelName === 'target2-model') {
        return target2Llm;
      } else if (modelName === 'structured-agent-model') {
        return structuredAgentLlm;
      } else if (modelName === 'available-agent-model') {
        return availableAgentLlm;
      } else if (modelName === 'another-agent-model') {
        return anotherAgentLlm;
      }
      // Default or throw error if unexpected model name
      console.warn(
        `Mock LLM requested for unexpected model: ${modelName}. Using default.`
      );
      return defaultLlm;
    };
  }),
}));

// --- Constants & Schemas ---
const FIXED_RESPONSE_INDICATOR = '[FIXED_RESPONSE]';

// Function to load and parse the script file
function loadPromptMultipart(filePath: string): PromptMessageMultipart[] {
  const fullPath = path.resolve(__dirname, filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  const parts = fileContent.split(/\n---(USER|ASSISTANT)\n/);
  const messages: PromptMessageMultipart[] = [];
  const startIndex = parts[0] === '' ? 1 : 0;
  for (let i = startIndex; i < parts.length; i += 2) {
    const roleStr = parts[i];
    const content = parts[i + 1]?.trim();
    if (roleStr === 'USER' && content) {
      messages.push(Prompt.user(content));
    } else if (roleStr === 'ASSISTANT' && content) {
      messages.push(Prompt.assistant(content));
    }
  }
  if (messages.length === 0 && fileContent.trim().length > 0) {
    messages.push(Prompt.user(fileContent.trim()));
  }
  return messages;
}

// Zod schema for structured weather data validation
const WeatherDataSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  conditions: z.string(),
});
type WeatherData = z.infer<typeof WeatherDataSchema>;

// --- Tests ---
describe('Router Agent Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    routerLlm.send.mockClear();
    target1Llm.send.mockClear();
    target2Llm.send.mockClear();
    structuredAgentLlm.send.mockClear();
    availableAgentLlm.send.mockClear();
    anotherAgentLlm.send.mockClear();
    defaultLlm.send.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testRouterAgentInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();
  });

  it('should route requests between two agents', async () => {
    // --- Define Mock LLM Responses for this test ---
    // Set up router to route to target1 then target2
    routerLlm.send.mockResolvedValueOnce(
      Prompt.assistant(
        JSON.stringify({
          agent: 'target1',
          confidence: 'high',
          reasoning: 'First request',
        })
      )
    );
    routerLlm.send.mockResolvedValueOnce(
      Prompt.assistant(
        JSON.stringify({
          agent: 'target2',
          confidence: 'high',
          reasoning: 'Second request',
        })
      )
    );

    // Set up target agent responses
    target1Llm.send.mockResolvedValue(
      Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} target1-result`)
    );
    target2Llm.send.mockResolvedValue(
      Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} target2-result`)
    );

    // --- Define Agents ---
    fast.agent(
      { name: 'target1', model: 'target1-model' },
      async (agent: BaseAgent) => {
        // Agent function - target agents don't need logic as LLM is mocked
      }
    );
    fast.agent(
      { name: 'target2', model: 'target2-model' },
      async (agent: BaseAgent) => {
        // Agent function - target agents don't need logic as LLM is mocked
      }
    );

    // --- Define Router Workflow & Test Logic ---
    fast.router(
      {
        name: 'router',
        router_agents: ['target1', 'target2'],
        model: 'router-model',
      },
      async (routerAgent: BaseAgent) => {
        // Mock the router setup script loading
        const routerSetup = loadPromptMultipart('router_script.txt');
        // Verify router setup was loaded (this is handled by the mock)

        // First routing request
        const result1 = await routerAgent.send('some routing');
        expect(result1).toBeDefined();
        expect(result1).toContain('target1-result');

        // Second routing request
        const result2 = await routerAgent.send('more routing');
        expect(result2).toBeDefined();
        expect(result2).toContain('target2-result');

        // Assertions on mocks
        expect(routerLlm.send).toHaveBeenCalledTimes(2);
        expect(target1Llm.send).toHaveBeenCalledTimes(1);
        expect(target2Llm.send).toHaveBeenCalledTimes(1);
      }
    );

    // --- Run FastAgent ---
    await fast.run();
  });

  it('should handle structured output from routed agent', async () => {
    // --- Define Mock LLM Responses for this test ---
    // Set up router to route to structured agent
    routerLlm.send.mockResolvedValue(
      Prompt.assistant(
        JSON.stringify({
          agent: 'structured_agent',
          confidence: 'high',
          reasoning: 'Weather request',
        })
      )
    );

    // Set up structured agent response with JSON
    const jsonResponse = {
      location: 'New York',
      temperature: 72.5,
      conditions: 'Sunny',
    };
    structuredAgentLlm.send.mockResolvedValue(
      Prompt.assistant(
        `${FIXED_RESPONSE_INDICATOR} ${JSON.stringify(jsonResponse)}`
      )
    );

    // --- Define Agent ---
    fast.agent(
      { name: 'structured_agent', model: 'structured-agent-model' },
      async (agent: BaseAgent) => {
        // Agent function - doesn't need logic as LLM is mocked
      }
    );

    // --- Define Router Workflow & Test Logic ---
    fast.router(
      {
        name: 'router',
        router_agents: ['structured_agent'],
        model: 'router-model',
      },
      async (routerAgent: BaseAgent) => {
        // Send request expected to yield structured output
        const rawResult = await routerAgent.send(
          "What's the weather in New York?"
        );
        expect(rawResult).toBeDefined();

        // Parse the JSON response
        const jsonString = rawResult
          .replace(FIXED_RESPONSE_INDICATOR, '')
          .trim();
        const result = WeatherDataSchema.parse(JSON.parse(jsonString));

        // Verify structured result
        expect(result).toBeDefined();
        expect(result.location).toBe('New York');
        expect(result.temperature).toBe(72.5);
        expect(result.conditions).toBe('Sunny');

        // Assertions on mocks
        expect(routerLlm.send).toHaveBeenCalledTimes(1);
        expect(structuredAgentLlm.send).toHaveBeenCalledTimes(1);
      }
    );

    // --- Run FastAgent ---
    await fast.run();
  });

  it('should handle invalid agent selection gracefully', async () => {
    // --- Define Mock LLM Responses for this test ---
    // Set up router to route to non-existent agent
    routerLlm.send.mockResolvedValue(
      Prompt.assistant(
        JSON.stringify({
          agent: 'nonexistent_agent',
          confidence: 'high',
          reasoning: 'Test request',
        })
      )
    );

    // --- Define Agents ---
    fast.agent(
      { name: 'available_agent', model: 'available-agent-model' },
      async (agent: BaseAgent) => {
        // Agent function - doesn't need logic as it shouldn't be called
      }
    );
    fast.agent(
      { name: 'another_agent', model: 'another-agent-model' },
      async (agent: BaseAgent) => {
        // Agent function - doesn't need logic as it shouldn't be called
      }
    );

    // --- Define Router Workflow & Test Logic ---
    fast.router(
      {
        name: 'router',
        router_agents: ['available_agent', 'another_agent'],
        model: 'router-model',
      },
      async (routerAgent: BaseAgent) => {
        // Send request that router will attempt to route incorrectly
        const errorResult = await routerAgent.send(
          'This should fail with a clear error'
        );

        // Verify error message
        expect(errorResult).toBeDefined();
        expect(errorResult).toContain(
          'A response was received, but the agent nonexistent_agent was not known to the Router'
        );

        // Assertions on mocks
        expect(routerLlm.send).toHaveBeenCalledTimes(1);
        expect(availableAgentLlm.send).not.toHaveBeenCalled();
        expect(anotherAgentLlm.send).not.toHaveBeenCalled();
      }
    );

    // --- Run FastAgent ---
    await fast.run();
  });
});
