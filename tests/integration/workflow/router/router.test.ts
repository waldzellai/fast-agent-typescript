import { ZodError, z } from 'zod';
import { FastAgent } from '../../../../src/fastAgent';
import { Prompt, PromptMessageMultipart } from '../../../../src/core/prompt';
import { BaseAgent } from '../../../../src/mcpAgent'; 
import * as directFactory from '../../../../src/core/directFactory'; // Import factory for mocking
import path from 'path';
import fs from 'fs';

// --- Define Mock LLMs FIRST ---
const routerLlm = { send: jest.fn() };
const target1Llm = { send: jest.fn() };
const target2Llm = { send: jest.fn() };
const structuredLlm = { send: jest.fn() };
const errorLlm = { send: jest.fn() };
const defaultLlm = { send: jest.fn() }; // Fallback
const availableAgentLlm = { send: jest.fn() }; // For the invalid selection test
const anotherAgentLlm = { send: jest.fn() }; // For the invalid selection test

// Mock the directFactory module
jest.mock('../../../../src/core/directFactory', () => ({
    getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
        // This mock should return a FACTORY FUNCTION
        return () => { 
            // Determine which mock LLM to return based on the agent's model name
            if (modelName === 'router-model') {
                return routerLlm; 
            } else if (modelName === 'target1-model') { // Use names from agent definition
                return target1Llm;
            } else if (modelName === 'target2-model') { // Use names from agent definition
                return target2Llm;
            } else if (modelName === 'structured-model') { // Use names from agent definition
                return structuredLlm;
            } else if (modelName === 'error-model') { // Use names from agent definition
                 return errorLlm;
            } else if (modelName === 'available-agent-model') { // Use names from agent definition
                return availableAgentLlm;
            } else if (modelName === 'another-agent-model') { // Use names from agent definition
                return anotherAgentLlm;
            }
            // Default or throw error if unexpected model name
            console.warn(`Mock LLM requested for unexpected model: ${modelName}. Using default.`);
            return defaultLlm; 
        };
    }),
}));

// --- Constants & Schemas ---
const FIXED_RESPONSE_INDICATOR = '[FIXED_RESPONSE]';

// Function to load and parse the script file (implementation from previous step)
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
describe('Router Workflow Integration Tests', () => {
    let fast: FastAgent;
    
    beforeEach(() => {
        // Reset mocks before each test
        // Clear calls to the outer mock factory function
        (directFactory.getModelFactory as jest.Mock).mockClear(); 
        // Clear calls on the individual mock LLM's send methods
        routerLlm.send.mockClear();
        target1Llm.send.mockClear();
        target2Llm.send.mockClear();
        structuredLlm.send.mockClear();
        errorLlm.send.mockClear();
        defaultLlm.send.mockClear();
        availableAgentLlm.send.mockClear();
        anotherAgentLlm.send.mockClear();

        // Create a new FastAgent instance for each test
        fast = new FastAgent('testRouterInstance');
        // Prevent actual config loading during tests if necessary
        (fast as any).loadConfig = jest.fn(); 
    });

    it('should route requests between two agents', async () => {
        // --- Define Mock LLM Responses for this test ---
        routerLlm.send.mockResolvedValueOnce(Prompt.assistant(JSON.stringify({ agent: 'target1', confidence: 'high', reasoning: 'Route to 1' }))).mockResolvedValueOnce(Prompt.assistant(JSON.stringify({ agent: 'target2', confidence: 'high', reasoning: 'Route to 2' })));
        target1Llm.send.mockResolvedValue(Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} target1-result`));
        target2Llm.send.mockResolvedValue(Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} target2-result`));

        // --- Define Agents ---
        fast.agent({ name: 'target1', model: 'target1-model' }, async (agent: BaseAgent) => {
             // Agent function - target agents don't need logic as LLM is mocked
        });
        fast.agent({ name: 'target2', model: 'target2-model' }, async (agent: BaseAgent) => {
             // Agent function - target agents don't need logic as LLM is mocked
        });

        // --- Define Router Workflow & Test Logic ---
        fast.router(
            { 
                name: 'router', 
                router_agents: ['target1', 'target2'], 
                model: 'router-model' // Specify model for the factory
            }, 
            async (routerAgent: BaseAgent) => { // Test logic is now inside the AgentFunction
                // routerSetupFromFile isn't explicitly sent, mock handles sequence
                // const routerSetupFromFile = loadPromptMultipart('./router_script.txt');
                
                // First send - should route to target1
                const result1 = await routerAgent.send("some routing"); // Pass string directly
                expect(result1).toBeDefined();
                expect(result1).toContain('target1-result');

                // Second send - should route to target2
                const result2 = await routerAgent.send("more routing"); // Pass string directly
                expect(result2).toBeDefined();
                expect(result2).toContain('target2-result');

                // Assertions on mocks (moved inside)
                expect(routerLlm.send).toHaveBeenCalledTimes(2); // Called for routing decisions
                // Agent LLMs are called *by* the router workflow internally after routing
                expect(target1Llm.send).toHaveBeenCalledTimes(1);
                expect(target2Llm.send).toHaveBeenCalledTimes(1);
            }
        );

        // --- Run FastAgent ---
        await fast.run(); 
    });

    it('should handle structured output from routed agent', async () => {
        // --- Define Mock LLM Responses for this test ---
        routerLlm.send.mockResolvedValue(Prompt.assistant(JSON.stringify({ agent: 'structured-agent', confidence: 'high', reasoning: 'Weather request' })));
        structuredLlm.send.mockResolvedValue(Prompt.assistant(`${FIXED_RESPONSE_INDICATOR} { "location": "New York", "temperature": 72.5, "conditions": "Sunny" }`));

        // --- Define Agent ---
        fast.agent({ name: 'structured-agent', model: 'structured-model' }, async (agent) => {});

        // --- Define Router Workflow & Test Logic ---
        fast.router(
            { 
                name: 'router', 
                router_agents: ['structured-agent'], 
                model: 'router-model'
            }, 
            async (routerAgent) => {
                // Send request expected to yield structured output
                const rawJsonResult = await routerAgent.send("What's the weather in New York?"); // Pass string
                expect(rawJsonResult).toBeDefined();
                // Manually remove indicator and parse
                const jsonString = rawJsonResult.replace(FIXED_RESPONSE_INDICATOR, '').trim();
                const structuredResult = WeatherDataSchema.parse(JSON.parse(jsonString)); 

                // Verify structured result
                expect(structuredResult).toBeDefined();
                expect(structuredResult.location).toBe("New York");
                expect(structuredResult.temperature).toBe(72.5);
                expect(structuredResult.conditions).toBe("Sunny");

                // Assert mocks
                expect(routerLlm.send).toHaveBeenCalledTimes(1);
                expect(structuredLlm.send).toHaveBeenCalledTimes(1);
            }
        );
        
        // --- Run FastAgent ---
        await fast.run();
    });

    it('should handle invalid agent selection gracefully', async () => {
        // --- Define Mock LLM Responses for this test ---
        routerLlm.send.mockResolvedValue(Prompt.assistant(JSON.stringify({ agent: 'nonexistent_agent', confidence: 'high', reasoning: 'Test request' })));
        // No mocks needed for availableAgentLlm or anotherAgentLlm as they shouldn't be called
        
        // --- Define Agents ---
        fast.agent({ name: 'available_agent', model: 'available-agent-model' }, async (agent) => {});
        fast.agent({ name: 'another_agent', model: 'another-agent-model' }, async (agent) => {});

        // --- Define Router Workflow & Test Logic ---
        fast.router(
            { 
                name: 'router', 
                router_agents: ['available_agent', 'another_agent'], 
                model: 'router-model'
            }, 
            async (routerAgent) => {
                // Send request that router will attempt to route incorrectly
                const errorResult = await routerAgent.send("This should cause an error"); // Pass string

                // Verify the error message in the result
                expect(errorResult).toBeDefined();
                // The exact error message might differ in TS implementation, adjust if needed
                expect(errorResult).toContain('A response was received, but the agent nonexistent_agent was not known to the Router'); 
                
                // Assert mocks
                expect(routerLlm.send).toHaveBeenCalledTimes(1);
                expect(availableAgentLlm.send).not.toHaveBeenCalled();
                expect(anotherAgentLlm.send).not.toHaveBeenCalled();
            }
        );

        // --- Run FastAgent ---
        await fast.run();
    });
});
