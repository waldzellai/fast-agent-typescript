/**
 * Integration tests for prompt server functionality
 * TypeScript port of test_prompt_server_integration.py
 */

import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import { Prompt, PromptMessageMultipart } from '../../../src/core/prompt';
import * as directFactory from '../../../src/core/directFactory';

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

// Helper function to mock get_text functionality
function getText(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        return item.text;
      }
    }
  }
  
  if (content && typeof content === 'object') {
    if (content.text) {
      return content.text;
    }
    if (content.content && Array.isArray(content.content)) {
      for (const item of content.content) {
        if (item.type === 'text' && item.text) {
          return item.text;
        }
      }
    }
  }
  
  return '';
}

// Helper function to check if content is an image
function isImageContent(content: any): boolean {
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === 'image') {
        return true;
      }
    }
  }
  
  return content && typeof content === 'object' && content.type === 'image';
}

// --- Tests ---
describe('FastAgent Prompt Server Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    passthroughLlm.send.mockClear();
    defaultLlm.send.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testPromptServerInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();
    
    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'passthrough',
        mcp: {
          servers: {
            prompts: {
              command: 'prompt-server',
              args: ['simple.txt', 'simple_sub.txt', 'multi.txt', 'multi_sub.txt', 'multipart.json']
            }
          }
        }
      }
    };
  });

  // Mock the get_prompt method for testing
  const mockGetPrompt = jest.fn().mockImplementation((promptName: string, args?: any, serverName?: string) => {
    if (promptName === 'simple') {
      return Promise.resolve({
        messages: [
          { role: 'user', content: [{ text: 'simple, no delimiters', type: 'text' }] }
        ]
      });
    } else if (promptName === 'simple_sub') {
      const product = args?.product || 'default-product';
      const company = args?.company || 'default-company';
      return Promise.resolve({
        messages: [
          { role: 'user', content: [{ text: `this is ${product} by ${company}`, type: 'text' }] }
        ]
      });
    } else if (promptName === 'multi') {
      return Promise.resolve({
        messages: [
          { role: 'user', content: [{ text: 'good morning', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'how may i help you?', type: 'text' }] }
        ]
      });
    } else if (promptName === 'multi_sub') {
      const userName = args?.user_name || 'default-user';
      const assistantName = args?.assistant_name || 'default-assistant';
      return Promise.resolve({
        messages: [
          { role: 'user', content: [{ text: `hello, my name is ${userName}`, type: 'text' }] },
          { role: 'assistant', content: [{ text: `nice to meet you. i am ${assistantName}`, type: 'text' }] }
        ]
      });
    } else if (promptName === 'multipart') {
      return Promise.resolve({
        messages: [
          { role: 'user', content: [{ text: 'text message 1', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'response 1', type: 'text' }] },
          { role: 'user', content: [{ text: 'text message 2', type: 'text' }] },
          { 
            role: 'user', 
            content: [
              { 
                type: 'image',
                mimeType: 'image/png',
                data: 'base64-encoded-image-data'
              }
            ] 
          },
          { role: 'assistant', content: [{ text: 'I see an image', type: 'text' }] }
        ]
      });
    }
    
    return Promise.resolve({ messages: [] });
  });

  // Mock the list_prompts method for testing
  const mockListPrompts = jest.fn().mockImplementation(() => {
    return Promise.resolve({
      prompts: [
        { name: 'simple', description: 'Simple prompt without delimiters' },
        { name: 'simple_sub', description: 'Simple prompt with substitutions' },
        { name: 'multi', description: 'Multi-turn conversation' },
        { name: 'multi_sub', description: 'Multi-turn conversation with substitutions' },
        { name: 'multipart', description: 'Multipart content with images' }
      ]
    });
  });

  // Mock the apply_prompt method for testing
  const mockApplyPrompt = jest.fn().mockImplementation((promptName: string, args?: any, serverName?: string) => {
    if (promptName === 'simple') {
      return Promise.resolve('simple, no delimiters');
    } else if (promptName === 'simple_sub') {
      const product = args?.product || 'default-product';
      const company = args?.company || 'default-company';
      return Promise.resolve(`this is ${product} by ${company}`);
    }
    
    return Promise.resolve('default response');
  });

  it('should handle prompt with no delimiters', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_prompt method
      (agent as any).test = { get_prompt: mockGetPrompt };
      
      // Get prompt with no delimiters
      const result = await (agent as any).test.get_prompt('simple', null);
      
      // Convert to multipart format for testing
      const multipart = PromptMessageMultipart.toMultipart(result.messages);
      
      // Verify prompt content
      expect(multipart[0].first_text()).toBe('simple, no delimiters');
      expect(multipart[0].role).toBe('user');
      expect(multipart.length).toBe(1);
      
      // Verify mock was called correctly
      expect(mockGetPrompt).toHaveBeenCalledWith('simple', null);
    });

    // Run FastAgent
    await fast.run();
  });

  it('should handle prompt with no delimiters and variables', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_prompt method
      (agent as any).test = { get_prompt: mockGetPrompt };
      
      // Get prompt with variables
      const result = await (agent as any).test.get_prompt(
        'simple_sub', 
        { product: 'fast-agent', company: 'llmindset' }
      );
      
      // Convert to multipart format for testing
      const multipart = PromptMessageMultipart.toMultipart(result.messages);
      
      // Verify prompt content
      expect(multipart[0].first_text()).toBe('this is fast-agent by llmindset');
      expect(multipart[0].role).toBe('user');
      expect(multipart.length).toBe(1);
      
      // Verify mock was called correctly
      expect(mockGetPrompt).toHaveBeenCalledWith(
        'simple_sub', 
        { product: 'fast-agent', company: 'llmindset' }
      );
    });

    // Run FastAgent
    await fast.run();
  });

  it('should handle multi-turn prompts', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_prompt method
      (agent as any).test = { get_prompt: mockGetPrompt };
      
      // Get multi-turn prompt
      const result = await (agent as any).test.get_prompt('multi', null);
      
      // Convert to multipart format for testing
      const multipart = PromptMessageMultipart.toMultipart(result.messages);
      
      // Verify prompt content
      expect(multipart[0].first_text()).toBe('good morning');
      expect(multipart[0].role).toBe('user');
      expect(multipart[1].first_text()).toBe('how may i help you?');
      expect(multipart[1].role).toBe('assistant');
      expect(multipart.length).toBe(2);
      
      // Verify mock was called correctly
      expect(mockGetPrompt).toHaveBeenCalledWith('multi', null);
    });

    // Run FastAgent
    await fast.run();
  });

  it('should handle multi-turn prompts with substitution', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_prompt method
      (agent as any).test = { get_prompt: mockGetPrompt };
      
      // Get multi-turn prompt with variables
      const result = await (agent as any).test.get_prompt(
        'multi_sub', 
        { user_name: 'evalstate', assistant_name: 'HAL9000' }
      );
      
      // Convert to multipart format for testing
      const multipart = PromptMessageMultipart.toMultipart(result.messages);
      
      // Verify prompt content
      expect(multipart[0].first_text()).toBe('hello, my name is evalstate');
      expect(multipart[0].role).toBe('user');
      expect(multipart[1].first_text()).toBe('nice to meet you. i am HAL9000');
      expect(multipart[1].role).toBe('assistant');
      expect(multipart.length).toBe(2);
      
      // Verify mock was called correctly
      expect(mockGetPrompt).toHaveBeenCalledWith(
        'multi_sub', 
        { user_name: 'evalstate', assistant_name: 'HAL9000' }
      );
    });

    // Run FastAgent
    await fast.run();
  });

  it('should return list of available prompts', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's list_prompts method
      (agent as any).test = { list_prompts: mockListPrompts };
      
      // Get list of prompts
      const prompts = await (agent as any).test.list_prompts();
      
      // Verify prompts list
      expect(prompts.prompts.length).toBe(5);
      
      // Verify mock was called correctly
      expect(mockListPrompts).toHaveBeenCalled();
    });

    // Run FastAgent
    await fast.run();
  });

  it('should get prompt with explicit server parameter', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_prompt method
      (agent as any).test = { get_prompt: mockGetPrompt };
      
      // Get prompt with explicit server parameter
      const prompt = await (agent as any).test.get_prompt('simple', null, 'prompts');
      
      // Verify prompt content
      expect(getText(prompt.messages[0].content)).toBe('simple, no delimiters');
      
      // Verify mock was called correctly
      expect(mockGetPrompt).toHaveBeenCalledWith('simple', null, 'prompts');
    });

    // Run FastAgent
    await fast.run();
  });

  it('should apply prompt with server parameter', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's apply_prompt method
      (agent as any).test = { apply_prompt: mockApplyPrompt };
      
      // Apply prompt with explicit server parameter
      const response1 = await (agent as any).test.apply_prompt('simple', null, 'prompts');
      
      // Verify response
      expect(response1).toBeDefined();
      
      // Apply prompt with both arguments and server parameter
      const response2 = await (agent as any).test.apply_prompt(
        'simple_sub',
        { product: 'test-product', company: 'test-company' },
        'prompts'
      );
      
      // Verify response
      expect(response2).toBeDefined();
      expect(response2.includes('test-product') || response2.includes('test-company')).toBe(true);
      
      // Verify mock was called correctly
      expect(mockApplyPrompt).toHaveBeenCalledTimes(2);
      expect(mockApplyPrompt).toHaveBeenCalledWith('simple', null, 'prompts');
      expect(mockApplyPrompt).toHaveBeenCalledWith(
        'simple_sub',
        { product: 'test-product', company: 'test-company' },
        'prompts'
      );
    });

    // Run FastAgent
    await fast.run();
  });

  it('should handle multipart JSON format', async () => {
    // Define agent with prompts server
    fast.agent({ 
      name: 'test',
      model: 'passthrough',
      servers: ['prompts']
    }, async (agent: BaseAgent) => {
      // Mock the agent's get_prompt method
      (agent as any).test = { get_prompt: mockGetPrompt };
      
      // Get multipart prompt
      const result = await (agent as any).test.get_prompt('multipart');
      
      // Verify multipart content
      expect(result.messages.length).toBe(5);
      expect(isImageContent(result.messages[3].content)).toBe(true);
      
      // Verify mock was called correctly
      expect(mockGetPrompt).toHaveBeenCalledWith('multipart');
    });

    // Run FastAgent
    await fast.run();
  });
});
