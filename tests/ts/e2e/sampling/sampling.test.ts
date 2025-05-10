import { FastAgent } from '../../../../src/fastAgent'; // Adjust the import path as necessary
import path from 'path';

// Assuming fastAgent is initialized similarly to the Python fixture
let fastAgent: FastAgent;

// Determine the directory for the config file relative to the test file
const configDir = path.resolve(__dirname, '../../e2e/sampling'); // Points to the original Python test directory

beforeAll(() => {
  // Initialize FastAgent, assuming config is in the Python test directory
  fastAgent = new FastAgent('sampling-e2e-test-agent');
  // Set baseDir if config is relative to that dir
  // fastAgent.config.baseDir = configDir; // Example if needed
});

describe('Agent Sampling Tests', () => {
  const agentName = 'agent'; // Define agent name

  test('should get sampling output via resource (Anthropic Server)', async () => {
    const agentConfig = {
      name: agentName,
      instruction: 'You are a helpful AI Agent',
      model: 'passthrough', // only need a resource call
      servers: ['sampling_resource_anthropic'], // Ensure this server is configured
    };

    await fastAgent.agent(agentConfig, async (agent) => {
      const story = await agent.withResource(
        'Here is a story',
        'resource://fast-agent/short-story/kittens', // Resource provided by the server
        'sampling_resource_anthropic'
      );

      expect(story.length).toBeGreaterThan(300);
      expect(story).toContain('kitten');
      expect(story.toLowerCase()).not.toContain('error');
    });
  }, 45000); // Increased timeout

  test('should get sampling output via resource (OpenAI Server)', async () => {
    const agentConfig = {
      name: agentName,
      instruction: 'You are a helpful AI Agent',
      model: 'passthrough', // only need a resource call
      servers: ['sampling_resource_openai'], // Ensure this server is configured
    };

    await fastAgent.agent(agentConfig, async (agent) => {
      const story = await agent.withResource(
        'Here is a story',
        'resource://fast-agent/short-story/kittens', // Resource provided by the server
        'sampling_resource_openai'
      );

      expect(story.length).toBeGreaterThan(300);
      expect(story).toContain('kitten');
      expect(story.toLowerCase()).not.toContain('error');
    });
  }, 45000); // Increased timeout

  test('should get sampling with image content (Anthropic Server)', async () => {
    const agentConfig = {
      name: agentName,
      instruction: 'You are a helpful AI Agent',
      model: 'passthrough', // only need a resource call
      servers: ['sampling_resource_anthropic'], // Ensure this server is configured
    };

    await fastAgent.agent(agentConfig, async (agent) => {
      // The Python test uses agent("***CALL_TOOL sample_with_image")
      // Assuming agent.send can trigger tool calls like this
      const result = await agent.send('***CALL_TOOL sample_with_image');

      expect(result.toLowerCase()).toContain('evalstate'); // Check for expected keyword in result
    });
  }, 45000); // Increased timeout
});

// Add teardown logic if necessary
// afterAll(async () => {
//   await fastAgent.shutdownServers();
// });
