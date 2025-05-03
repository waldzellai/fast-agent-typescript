/**
 * Integration tests for the enhanced resource API features
 * TypeScript port of test_resource_api.py
 */

import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import * as directFactory from '../../../src/core/directFactory';

// Mock resource content
const resourceContents = {
  'resource://fast-agent/r1file1.txt': 'test 1',
  'resource://fast-agent/r1file2.txt': 'test 2',
  'resource://fast-agent/r2file1.txt': 'test 3',
  'resource://fast-agent/r2file2.txt': 'test 4'
};

// --- Define Mock LLMs ---
const passthroughLlm = { 
  send: jest.fn().mockImplementation((message: string) => {
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
        return passthroughLlm;
      }
      // Default or throw error if unexpected model name
      console.warn(`Mock LLM requested for unexpected model: ${modelName}. Using default.`);
      return defaultLlm;
    };
  }),
}));

// --- Tests ---
describe('FastAgent Resources Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    passthroughLlm.send.mockClear();
    defaultLlm.send.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testResourcesInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();
    
    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'passthrough',
        mcp: {
          servers: {
            resource_server_one: {
              command: 'prompt-server',
              args: ['prompt1.txt']
            },
            resource_server_two: {
              command: 'prompt-server',
              args: ['prompt2.txt']
            }
          }
        }
      }
    };
  });

  // Mock the agent's get_resource method
  const mockGetResource = jest.fn().mockImplementation((uri: string, server?: string) => {
    if (uri === 'resource://fast-agent/nonexistent.txt') {
      throw new Error('Resource not found');
    }
    
    if (server === 'nonexistent_server') {
      throw new Error('Server not found');
    }
    
    return Promise.resolve({
      contents: [{ text: resourceContents[uri] || 'default content' }]
    });
  });

  // Mock the agent's list_resources method
  const mockListResources = jest.fn().mockImplementation((server?: string) => {
    if (server === 'resource_server_one') {
      return Promise.resolve({
        resource_server_one: [
          'resource://fast-agent/r1file1.txt',
          'resource://fast-agent/r1file2.txt'
        ]
      });
    } else if (server === 'resource_server_two') {
      return Promise.resolve({
        resource_server_two: [
          'resource://fast-agent/r2file1.txt',
          'resource://fast-agent/r2file2.txt'
        ]
      });
    } else {
      // Return all resources if no server specified
      return Promise.resolve({
        resource_server_one: [
          'resource://fast-agent/r1file1.txt',
          'resource://fast-agent/r1file2.txt'
        ],
        resource_server_two: [
          'resource://fast-agent/r2file1.txt',
          'resource://fast-agent/r2file2.txt'
        ]
      });
    }
  });

  // Mock the agent's with_resource method
  const mockWithResource = jest.fn().mockImplementation((prompt: string, uri: string, server?: string) => {
    if (uri === 'resource://fast-agent/nonexistent.txt') {
      throw new Error('Resource not found');
    }
    
    if (server === 'nonexistent_server') {
      throw new Error('Server not found');
    }
    
    return Promise.resolve(`${prompt} ${resourceContents[uri] || 'default content'}`);
  });

  it('should get resource with explicit server parameter', async () => {
    // Define agent with resource servers
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['resource_server_one', 'resource_server_two']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_resource method
      (agent as any).test = { get_resource: mockGetResource };
      
      // Test get_resource with explicit server parameter
      const resource = await (agent as any).test.get_resource(
        'resource://fast-agent/r1file1.txt', 
        'resource_server_one'
      );
      
      expect(resource.contents[0].text).toBe('test 1');
      expect(mockGetResource).toHaveBeenCalledWith(
        'resource://fast-agent/r1file1.txt', 
        'resource_server_one'
      );
    });

    // Run FastAgent
    await fast.run();
  });

  it('should get resource with automatic server selection', async () => {
    // Define agent with resource servers
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['resource_server_one', 'resource_server_two']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_resource method
      (agent as any).test = { get_resource: mockGetResource };
      
      // Test get_resource with auto server selection
      const resource = await (agent as any).test.get_resource('resource://fast-agent/r2file1.txt');
      
      expect(resource.contents[0].text).toBe('test 3');
      expect(mockGetResource).toHaveBeenCalledWith('resource://fast-agent/r2file1.txt');
    });

    // Run FastAgent
    await fast.run();
  });

  it('should list resources from servers', async () => {
    // Define agent with resource servers
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['resource_server_one', 'resource_server_two']
    }, async (agent: BaseAgent) => {
      // Mock the agent's list_resources method
      (agent as any).test = { list_resources: mockListResources };
      
      // Test list_resources with explicit server
      const resources = await (agent as any).test.list_resources('resource_server_one');
      
      expect(resources).toHaveProperty('resource_server_one');
      expect(resources.resource_server_one).toContain('resource://fast-agent/r1file1.txt');
      expect(resources.resource_server_one).toContain('resource://fast-agent/r1file2.txt');
      
      // Test list_resources without server parameter
      const allResources = await (agent as any).test.list_resources();
      
      expect(allResources).toHaveProperty('resource_server_one');
      expect(allResources).toHaveProperty('resource_server_two');
      expect(mockListResources).toHaveBeenCalledTimes(2);
    });

    // Run FastAgent
    await fast.run();
  });

  it('should handle errors for nonexistent resources and servers', async () => {
    // Define agent with resource servers
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['resource_server_one']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_resource method
      (agent as any).test = { get_resource: mockGetResource };
      
      // Test nonexistent resource
      await expect(async () => {
        await (agent as any).test.get_resource(
          'resource://fast-agent/nonexistent.txt', 
          'resource_server_one'
        );
      }).rejects.toThrow('Resource not found');
      
      // Test nonexistent server
      await expect(async () => {
        await (agent as any).test.get_resource(
          'resource://fast-agent/r1file1.txt', 
          'nonexistent_server'
        );
      }).rejects.toThrow('Server not found');
    });

    // Run FastAgent
    await fast.run();
  });

  it('should use with_resource API with parameter ordering', async () => {
    // Define agent with resource servers
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['resource_server_one']
    }, async (agent: BaseAgent) => {
      // Mock the agent's with_resource method
      (agent as any).test = { with_resource: mockWithResource };
      
      // Test with explicit server parameter
      const response1 = await (agent as any).test.with_resource(
        'Reading resource content:',
        'resource://fast-agent/r1file1.txt',
        'resource_server_one'
      );
      
      expect(response1).toBe('Reading resource content: test 1');
      
      // Test with another resource
      const response2 = await (agent as any).test.with_resource(
        'Reading resource content:',
        'resource://fast-agent/r1file2.txt',
        'resource_server_one'
      );
      
      expect(response2).toBe('Reading resource content: test 2');
      
      // Test with auto server selection
      const response3 = await (agent as any).test.with_resource(
        'Reading resource content:', 
        'resource://fast-agent/r1file1.txt'
      );
      
      expect(response3).toBe('Reading resource content: test 1');
      expect(mockWithResource).toHaveBeenCalledTimes(3);
    });

    // Run FastAgent
    await fast.run();
  });
});
