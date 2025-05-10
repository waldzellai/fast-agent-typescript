import { FastAgent } from '../../../../src/fastAgent'; // Adjust the import path as necessary
import path from 'path';

// Assuming fastAgent is initialized similarly to the Python fixture, possibly in a setup file
// For demonstration, let's assume a function getFastAgentInstance exists or it's globally available
// In a real Jest setup, this might come from beforeEach or a test setup file.
let fastAgent: FastAgent;

// Determine the directory for the config file relative to the test file
const configDir = path.resolve(__dirname, '../../e2e/prompts-resources'); // Points to the original Python test directory where config/prompts might be

beforeAll(() => {
  // Initialize FastAgent pointing to the directory containing the prompts and config
  // This assumes fastagent.config.yaml and prompt files are in the Python test directory
  // Initialize FastAgent. Let's assume it implicitly uses the config in the baseDir or CWD.
  // We'll pass a simple name for the agent instance.
  fastAgent = new FastAgent('prompts-e2e-test-agent');
});

const modelNames = [
  'gpt-4.1-mini', // OpenAI model
  'haiku35', // Anthropic model
];

describe.each(modelNames)('Agent Prompt Tests (Model: %s)', (modelName) => {
  const agentName = 'agent'; // Define agent name

  test('should process a simple prompt', async () => {
    // Define the agent and its execution logic directly
    await fastAgent.agent(
      {
        name: agentName,
        instruction: 'You are a helpful AI Agent',
        model: modelName,
        servers: ['prompt_server'], // Ensure prompt_server is configured and running
      },
      async (agent) => {
        const response = await agent.applyPrompt('simple', {
          name: 'llmindset',
        });
        expect(response).toContain('llmindset');
      }
    );
  }, 30000); // Increase timeout if necessary

  test('should process a prompt with attachment', async () => {
    await fastAgent.agent(
      {
        name: agentName,
        instruction: 'You are a helpful AI Agent',
        model: modelName,
        servers: ['prompt_server'],
      },
      async (agent) => {
        const response = await agent.applyPrompt('with_attachment', {});
        const lowerResponse = response.toLowerCase();
        const terms = ['llmindset', 'fast-agent'];
        expect(terms.some((term) => lowerResponse.includes(term))).toBe(true);
      }
    );
  }, 30000); // Increase timeout if necessary

  test('should process a multi-turn prompt', async () => {
    await fastAgent.agent(
      {
        name: agentName,
        instruction: 'You are a helpful AI Agent',
        model: modelName,
        servers: ['prompt_server'],
      },
      async (agent) => {
        // The 'agent' parameter in the callback is the interface to interact with
        const response = await agent.applyPrompt('multiturn', {});
        expect(response.toLowerCase()).toContain('testcaseok');
      }
    );
  }, 30000); // Increase timeout if necessary
});

// Add teardown logic if necessary, e.g., shutting down servers
// afterAll(async () => {
//   await fastAgent.shutdownServers();
// });
