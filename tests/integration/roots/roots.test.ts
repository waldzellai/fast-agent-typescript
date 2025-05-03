/**
 * Integration tests for the FastAgent Roots functionality
 * TypeScript port of test_roots.py
 */

import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import * as directFactory from '../../../src/core/directFactory';

// --- Define Mock LLMs ---
const rootsLlm = { 
  send: jest.fn().mockImplementation((message: string) => {
    // If the message contains a call to the roots_test-show_roots tool
    if (message.includes('***CALL_TOOL roots_test-show_roots')) {
      // Return a mock response that includes the expected root paths
      return Promise.resolve(`
        file:///mnt/data/ (alias for file://foo/bar)
        test_data
        file://no/alias
      `);
    }
    
    // Default response for other messages
    return Promise.resolve(message);
  })
};

const defaultLlm = { send: jest.fn() }; // Fallback

// Mock the directFactory module
jest.mock('../../../src/core/directFactory', () => ({
  getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
    // This mock should return a FACTORY FUNCTION
    return () => {
      // Determine which mock LLM to return based on the agent's model name
      if (modelName === 'passthrough') {
        return rootsLlm;
      }
      // Default or throw error if unexpected model name
      console.warn(`Mock LLM requested for unexpected model: ${modelName}. Using default.`);
      return defaultLlm;
    };
  }),
}));

// --- Tests ---
describe('FastAgent Roots Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    rootsLlm.send.mockClear();
    defaultLlm.send.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testRootsInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();
    
    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'passthrough',
        mcp: {
          servers: {
            roots_test: {
              command: 'uv',
              args: ['run', 'root_test_server.py'],
              roots: [
                {
                  uri: 'file://foo/bar',
                  name: 'test_data',
                  server_uri_alias: 'file:///mnt/data/'
                },
                {
                  uri: 'file://no/alias',
                  name: 'no_alias'
                }
              ]
            }
          }
        }
      }
    };
  });

  it('should retrieve and return roots information', async () => {
    // Define agent with roots_test server
    fast.agent({ 
      name: 'foo',
      instruction: 'bar',
      model: 'passthrough',
      servers: ['roots_test']
    }, async (agent: BaseAgent) => {
      // Test calling the roots_test-show_roots tool
      const result = await agent.send('***CALL_TOOL roots_test-show_roots {}');
      
      // Verify the response contains the expected root paths
      expect(result).toContain('file:///mnt/data/');
      expect(result).toContain('test_data');
      expect(result).toContain('file://no/alias');
      
      // Assert mocks
      expect(rootsLlm.send).toHaveBeenCalled();
    });

    // Run FastAgent
    await fast.run();
  });
});
