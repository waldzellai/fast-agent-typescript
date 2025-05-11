import { FastAgent } from '../../../../src/fastAgent'; // Adjust the import path as necessary
import path from 'path';

// Assuming fastAgent is initialized similarly to the Python fixture, possibly in a setup file
let fastAgent: FastAgent;

// Determine the directory for the config file relative to the test file
const configDir = path.resolve(__dirname, '../../e2e/prompts-resources'); // Points to the original Python test directory

beforeAll(() => {
  // Initialize FastAgent, assuming config/resources are in the Python test directory
  fastAgent = new FastAgent('resources-e2e-test-agent');
  // Set baseDir if config/resources are relative to that dir
  // fastAgent.config.baseDir = configDir; // Example if needed, depends on FastAgent implementation
});

const modelNames = [
  'haiku', // Only Haiku is used in the Python tests
];

describe.each(modelNames)('Agent Resource Tests (Model: %s)', (modelName) => {
  const agentName = 'agent'; // Define agent name

  test('should process prompt using PDF resource blob', async () => {
    const agentConfig = {
      name: agentName,
      instruction: 'You are a helpful AI Agent',
      model: modelName,
      servers: ['prompt_server'], // Ensure prompt_server is configured and running
    };

    await fastAgent.agent(agentConfig, async (agent) => {
      const response = await agent.withResource(
        'Summarise this PDF please, be sure to include the product name',
        'resource://fast-agent/sample.pdf', // Assuming prompt_server provides this resource
        'prompt_server'
      );
      expect(response).toContain('fast-agent'); // Check if product name is in summary
    });
  }, 45000); // Increased timeout for potential PDF processing

  test('should process prompt using CSS resource text', async () => {
    const agentConfig = {
      name: agentName,
      instruction: 'You are a helpful AI Agent',
      model: modelName,
      servers: ['prompt_server'],
    };

    await fastAgent.agent(agentConfig, async (agent) => {
      // In Python: answer = await agent.agent.with_resource(...)
      // Assuming the agent object passed to the callback has the withResource method directly
      const answer = await agent.withResource(
        'What colour are buttons in this file?',
        'resource://fast-agent/style.css', // Assuming prompt_server provides this resource
        'prompt_server'
      );
      expect(answer.toLowerCase()).toContain('white');
    });
  }, 30000); // Standard timeout
});

// Add teardown logic if necessary
// afterAll(async () => {
//   await fastAgent.shutdownServers();
// });
