import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import * as directFactory from '../../../src/core/directFactory';
import { Prompt } from '../../../src/core/prompt';
import path from 'path';

// --- Define Mock LLMs ---
const samplingLlm = { send: jest.fn() };
const defaultLlm = { send: jest.fn() }; // Fallback

// Constants
const FIXED_RESPONSE_INDICATOR = '[FIXED_RESPONSE]';

// Helper function to extract text from response
function extractTextFromResponse(response: any): string {
    if (typeof response === 'string') {
        return response;
    }
    
    // Handle Prompt object
    if (response && response.content && Array.isArray(response.content)) {
        // Extract text from content array
        return response.content
            .map((item: any) => (item.text || '').toString())
            .join('\n');
    }
    
    // Fallback: stringify the response
    return JSON.stringify(response);
}

// Mock the directFactory module
jest.mock('../../../src/core/directFactory', () => ({
    getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
        // This mock should return a FACTORY FUNCTION
        return () => {
            // Determine which mock LLM to return based on the agent's model name
            if (modelName === 'sampling-model') {
                return samplingLlm;
            }
            // Default or throw error if unexpected model name
            console.warn(`Mock LLM requested for unexpected model: ${modelName}. Using default.`);
            return defaultLlm;
        };
    }),
}));

// --- Tests ---
describe('Sampling Integration Tests', () => {
    let fast: FastAgent;

    beforeEach(() => {
        // Reset mocks before each test
        // Clear calls to the outer mock factory function
        (directFactory.getModelFactory as jest.Mock).mockClear();
        // Clear calls on the individual mock LLM's send methods
        samplingLlm.send.mockClear();
        defaultLlm.send.mockClear();

        // Create a new FastAgent instance for each test
        fast = new FastAgent('testSamplingInstance');
        // Prevent actual config loading during tests
        (fast as any).loadConfig = jest.fn();
        
        // Mock the config to include sampling configuration
        (fast as any).context = {
            config: {
                default_model: 'sampling-model',
                mcp: {
                    servers: {
                        sampling_test: {
                            sampling: {
                                model: 'sampling-model'
                            }
                        }
                    }
                }
            }
        };
    });

    it('should return the default message', async () => {
        // --- Define Mock LLM Responses for this test ---
        samplingLlm.send.mockResolvedValue(Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} hello, world`));

        // --- Define Agent ---
        fast.agent({ 
            name: 'sampling_agent', 
            model: 'sampling-model',
            servers: ['sampling_test'] 
        }, async (agent: BaseAgent) => {
            // Test the sampling feature
            const rawResult = await agent.send('***CALL_TOOL sample');
            const result = extractTextFromResponse(rawResult);
            
            expect(result).toContain('hello, world');
            
            // Assert mocks
            expect(samplingLlm.send).toHaveBeenCalledTimes(1);
        });

        // --- Run FastAgent ---
        await fast.run();
    });

    it('should load sampling configuration', async () => {
        // --- Define Agent ---
        fast.agent({ 
            name: 'config_test_agent', 
            model: 'sampling-model' 
        }, async () => {
            // Check that the config has the expected sampling configuration
            expect((fast as any).context.config.mcp.servers.sampling_test.sampling.model).toBe('sampling-model');
        });

        // --- Run FastAgent ---
        await fast.run();
    });

    it('should pass back specific sample values', async () => {
        // --- Define Mock LLM Responses for this test ---
        samplingLlm.send.mockResolvedValue(Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} llmindset`));

        // --- Define Agent ---
        fast.agent({ 
            name: 'sampling_agent', 
            model: 'sampling-model',
            servers: ['sampling_test'] 
        }, async (agent: BaseAgent) => {
            // Test the sampling feature with a specific value
            const rawResult = await agent.send('***CALL_TOOL sample {"to_sample": "llmindset"}');
            const result = extractTextFromResponse(rawResult);
            
            expect(result).toContain('llmindset');
            expect(result).not.toContain('Error');
            
            // Assert mocks
            expect(samplingLlm.send).toHaveBeenCalledTimes(1);
        });

        // --- Run FastAgent ---
        await fast.run();
    });

    it('should handle multiple messages', async () => {
        // --- Define Mock LLM Responses for this test ---
        samplingLlm.send.mockResolvedValue(Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} message 1\nmessage 2`));

        // --- Define Agent ---
        fast.agent({ 
            name: 'sampling_agent', 
            model: 'sampling-model',
            servers: ['sampling_test'] 
        }, async (agent: BaseAgent) => {
            // Test the sampling feature with multiple messages
            const rawResult = await agent.send('***CALL_TOOL sample_many');
            const result = extractTextFromResponse(rawResult);
            
            expect(result).toContain('message 1');
            expect(result).toContain('message 2');
            
            // Assert mocks
            expect(samplingLlm.send).toHaveBeenCalledTimes(1);
        });

        // --- Run FastAgent ---
        await fast.run();
    });
});
