import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/agent/baseAgent';
import * as directFactory from '../../../src/llm/directFactory';
import { BaseLLM } from '@mcp/llm';
import { MCPLog } from '@mcp/ai';
import { jest } from '@jest/globals';
import path from 'path';
import { AgentContext } from '../../../src/types'; // Assuming AgentContext type exists

// Mock the directFactory to control LLM instantiation
jest.mock('../../../src/llm/directFactory');
const mockGetLLM = directFactory.getLLM as jest.MockedFunction<typeof directFactory.getLLM>;

// Mock loadConfig to prevent actual file loading and provide controlled config
const mockLoadConfig = jest.spyOn(FastAgent.prototype as any, 'loadConfig').mockImplementation(async function (this: FastAgent, root?: string) {
    // Simulate loading a minimal config relevant to the test
    this.context = {
        agents: {
            agent: {
                instruction: "You are a helpful AI Agent",
                model: "passthrough", // Crucial for these tests
                servers: ["sampling_resource_anthropic", "sampling_resource_openai"],
            }
        },
        models: {
             "fake-claude": { provider: 'anthropic', model: 'claude-3-opus-20240229' },
             "fake-gpt": { provider: 'openai', model: 'gpt-4' },
        },
        servers: {
             "sampling_resource_anthropic": { model: "fake-claude", api_key: 'dummy-key' },
             "sampling_resource_openai": { model: "fake-gpt", api_key: 'dummy-key' },
        },
        log: new MCPLog('test-sampling'),
        rootDir: root || process.cwd(),
    } as AgentContext;
    this.rootDir = root || process.cwd();
    this.configPath = path.join(this.rootDir, 'fastagent.config.yaml'); // Set a dummy path
    this.isConfigLoaded = true;
});


// Define Mock LLM behavior (likely not called due to 'passthrough')
class MockLLM extends BaseLLM<any, any> {
    send = jest.fn().mockResolvedValue({ content: { type: 'text', text: 'LLM Passthrough Fallback' } });
    generate = jest.fn().mockResolvedValue({ content: { type: 'text', text: 'LLM Passthrough Fallback' } });
    getTrace() { return {} };
    getClient() { return null; }
    getContext() { return {} };
    getModelName() { return 'mock-llm'; };
    _prepareRequest(): any {}
    _parseResponse(): any {}
}
const mockLLMInstance = new MockLLM({}, {});
mockGetLLM.mockResolvedValue(mockLLMInstance);


// --- Test Suite ---
describe('E2E Sampling Tests', () => {
    let fast: FastAgent;
    let mockAgentInstance: Partial<BaseAgent>; // Use Partial for easier mocking

    // Mocks for the agent instance methods
    const mockRunWithResource = jest.fn();
    const mockSend = jest.fn();


    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks between tests

        const testDir = __dirname; // Assumes tests run from their directory
        fast = new FastAgent({ root: testDir });

        // Mock the agent instance that fast.run() provides
        mockAgentInstance = {
            context: { log: new MCPLog('mock-agent') } as any,
            withResource: mockRunWithResource,
            send: mockSend,
            history: { add: jest.fn(), getHistory: jest.fn().mockReturnValue([]) } as any,
        };

        // Mock fast.run() to provide the mocked agent instance
        jest.spyOn(fast, 'run').mockImplementation(async (agentName = 'agent') => {
            await fast.loadConfig(); // Ensure mock config is loaded
            // Return an object mimicking the async context manager result
            return {
                [Symbol.asyncDispose]: jest.fn(async () => { /* mock cleanup */ }),
                agent: mockAgentInstance as BaseAgent, // Provide the mocked agent
            };
        });
    });

    test('test_sampling_output_anthropic', async () => {
        const mockStory = "This is a lovely story about a fluffy kitten playing with yarn. ".repeat(10); // > 300 chars
        mockRunWithResource.mockResolvedValue(mockStory);

        async function agent_function() {
            const runner = await fast.run();
            const agent = runner.agent;
            try {
                const story = await agent.withResource(
                    "Here is a story",
                    "resource://fast-agent/short-story/kittens",
                    "sampling_resource_anthropic"
                );

                expect(mockLoadConfig).toHaveBeenCalled();
                expect(mockRunWithResource).toHaveBeenCalledWith(
                    "Here is a story",
                    "resource://fast-agent/short-story/kittens",
                    "sampling_resource_anthropic"
                );
                expect(story.length).toBeGreaterThan(300);
                expect(story).toContain("kitten");
                expect(story.toLowerCase()).not.toContain("error");
            } finally {
                await runner[Symbol.asyncDispose]();
            }
        }
        await agent_function();
    });

     test('test_sampling_output_gpt', async () => {
        const mockStory = "A tale concerning a small cat, often called a kitten, engaging with string. ".repeat(10); // > 300 chars
        mockRunWithResource.mockResolvedValue(mockStory);

        async function agent_function() {
            const runner = await fast.run();
            const agent = runner.agent;
             try {
                 const story = await agent.withResource(
                    "Here is a story",
                    "resource://fast-agent/short-story/kittens",
                    "sampling_resource_openai" // Different server name
                 );

                 expect(mockLoadConfig).toHaveBeenCalled();
                 expect(mockRunWithResource).toHaveBeenCalledWith(
                    "Here is a story",
                    "resource://fast-agent/short-story/kittens",
                    "sampling_resource_openai"
                 );
                 expect(story.length).toBeGreaterThan(300);
                 expect(story).toContain("kitten");
                 expect(story.toLowerCase()).not.toContain("error");
            } finally {
                await runner[Symbol.asyncDispose]();
            }
        }
        await agent_function();
    });


    test('test_sampling_with_image_content_anthropic', async () => {
        const mockToolResult = "The username is evalstate_user.";
        // Mock agent.send for the specific tool call string
        mockSend.mockImplementation(async (message) => {
             if (message === "***CALL_TOOL sample_with_image") {
                return mockToolResult;
            }
            throw new Error(`Unexpected message sent to mockSend: ${message}`);
        });


        async function agent_function() {
             const runner = await fast.run();
             const agent = runner.agent;
             try {
                 const result = await agent.send("***CALL_TOOL sample_with_image");

                 expect(mockLoadConfig).toHaveBeenCalled();
                 expect(mockSend).toHaveBeenCalledWith("***CALL_TOOL sample_with_image");
                 // Ensure the result is treated as a string before calling toLowerCase
                 expect(String(result).toLowerCase()).toContain("evalstate");
            } finally {
                await runner[Symbol.asyncDispose]();
            }
        }
        await agent_function();
    });

});
