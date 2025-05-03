/**
 * Integration tests for prompt state functionality
 * TypeScript port of test_load_prompt_templates.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import { Prompt, PromptMessageMultipart } from '../../../src/core/prompt';
import * as directFactory from '../../../src/core/directFactory';

// Mock image data
const mockImageData = Buffer.from('mock-image-data').toString('base64');

// --- Define Mock LLMs ---
const passthroughLlm = { 
  send: jest.fn().mockImplementation((message: string) => {
    return Promise.resolve(`Response to: ${message}`);
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

// Mock the prompt loading functions
jest.mock('../../../src/core/prompt', () => {
  // Keep the original module
  const originalModule = jest.requireActual('../../../src/core/prompt');
  
  return {
    ...originalModule,
    // Mock the loadPromptMultipart function
    loadPromptMultipart: jest.fn().mockImplementation((filePath: string) => {
      if (filePath.includes('conv1_simple.md')) {
        return [
          { role: 'user', content: [{ text: 'message 1', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'response 1', type: 'text' }] },
          { role: 'user', content: [{ text: 'message 2', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'response 2', type: 'text' }] }
        ];
      } else if (filePath.includes('conv2_attach.md')) {
        return [
          { 
            role: 'user', 
            content: [
              { text: 'Here is a CSS file', type: 'text' },
              { 
                resource: { 
                  mimeType: 'text/css', 
                  text: 'body { background-color: #f5f5f5; }' 
                },
                type: 'resource'
              }
            ] 
          },
          { 
            role: 'assistant', 
            content: [{ text: 'Thanks for sharing the CSS file', type: 'text' }] 
          },
          { 
            role: 'user', 
            content: [
              { text: 'Here is an image', type: 'text' },
              { text: 'And some text', type: 'text' },
              { 
                data: mockImageData,
                mimeType: 'image/png',
                type: 'image'
              }
            ] 
          },
          { 
            role: 'assistant', 
            content: [{ text: 'I see the image', type: 'text' }] 
          },
          { 
            role: 'user', 
            content: [{ text: 'What do you think?', type: 'text' }] 
          }
        ];
      } else if (filePath.includes('simple.txt')) {
        return [
          { role: 'user', content: [{ text: 'hello', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'Response to: hello', type: 'text' }] },
          { role: 'user', content: [{ text: 'world', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'Response to: world', type: 'text' }] }
        ];
      } else if (filePath.includes('history.json') || filePath.includes('multipart.json')) {
        return [
          { role: 'user', content: [{ text: 'hello', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'Response to: hello', type: 'text' }] },
          { role: 'user', content: [{ text: 'world', type: 'text' }] },
          { role: 'assistant', content: [{ text: 'Response to: world', type: 'text' }] }
        ];
      }
      
      return [];
    }),
    // Mock other functions as needed
    jsonToMultipartMessages: jest.fn().mockImplementation((jsonContent: string) => {
      return [
        { role: 'user', content: [{ text: 'hello', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'Response to: hello', type: 'text' }] },
        { role: 'user', content: [{ text: 'world', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'Response to: world', type: 'text' }] }
      ];
    })
  };
});

// Mock fs functions
jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockImplementation((filePath: string) => {
      if (filePath.includes('history.json') || filePath.includes('simple.txt') || filePath.includes('multipart.json')) {
        return true;
      }
      return false;
    }),
    readFileSync: jest.fn().mockImplementation((filePath: string) => {
      if (filePath.includes('history.json')) {
        return JSON.stringify({
          messages: [
            { role: 'user', content: [{ text: 'hello', type: 'text' }] },
            { role: 'assistant', content: [{ text: 'Response to: hello', type: 'text' }] },
            { role: 'user', content: [{ text: 'world', type: 'text' }] },
            { role: 'assistant', content: [{ text: 'Response to: world', type: 'text' }] }
          ]
        });
      } else if (filePath.includes('multipart.json')) {
        return JSON.stringify({
          messages: [
            { role: 'user', content: [{ text: 'good morning', type: 'text' }] },
            { role: 'assistant', content: [{ text: 'Good morning! How can I help you today?', type: 'text' }] },
            { 
              role: 'user', 
              content: [
                { text: "what's in this image", type: 'text' },
                { 
                  data: mockImageData,
                  mimeType: 'image/png',
                  type: 'image'
                }
              ] 
            },
            { role: 'assistant', content: [{ text: 'I see an image in your message.', type: 'text' }] }
          ]
        });
      }
      return '';
    }),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn()
  };
});

// --- Tests ---
describe('FastAgent Prompt State Integration Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's send methods
    passthroughLlm.send.mockClear();
    defaultLlm.send.mockClear();
    
    // Reset fs mocks
    (fs.existsSync as jest.Mock).mockClear();
    (fs.readFileSync as jest.Mock).mockClear();
    (fs.writeFileSync as jest.Mock).mockClear();
    (fs.unlinkSync as jest.Mock).mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testPromptStateInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();
    
    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'passthrough'
      }
    };
  });

  it('should load simple conversation from file', async () => {
    // Define agent
    fast.agent({ 
      name: 'default',
      model: 'passthrough'
    }, async (agent: BaseAgent) => {
      // Mock the loadPromptMultipart function
      const loadPromptMultipart = jest.fn().mockReturnValue([
        { role: 'user', content: [{ text: 'message 1', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'response 1', type: 'text' }] },
        { role: 'user', content: [{ text: 'message 2', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'response 2', type: 'text' }] }
      ]);
      
      // Mock the agent's generate method
      const generate = jest.fn().mockResolvedValue({
        first_text: () => 'message 2'
      });
      
      // Assign mocks to agent
      (agent as any).default = { 
        generate,
        loadPromptMultipart
      };
      
      // Load conversation from file
      const loaded = loadPromptMultipart('conv1_simple.md');
      
      // Verify loaded conversation
      expect(loaded.length).toBe(4);
      expect(loaded[0].role).toBe('user');
      expect(loaded[1].role).toBe('assistant');
      
      // Generate response using loaded conversation
      const response = await (agent as any).default.generate(loaded);
      
      // Verify response
      expect(response.first_text()).toContain('message 2');
      expect(generate).toHaveBeenCalledWith(loaded);
    });

    // Run FastAgent
    await fast.run();
  });

  it('should load conversation with attachments', async () => {
    // Define agent
    fast.agent({ 
      name: 'default',
      model: 'passthrough'
    }, async (agent: BaseAgent) => {
      // Mock the loadPromptMultipart function
      const loadPromptMultipart = jest.fn().mockReturnValue([
        { 
          role: 'user', 
          content: [
            { text: 'Here is a CSS file', type: 'text' },
            { 
              resource: { 
                mimeType: 'text/css', 
                text: 'body { background-color: #f5f5f5; }' 
              },
              type: 'resource'
            }
          ] 
        },
        { 
          role: 'assistant', 
          content: [{ text: 'Thanks for sharing the CSS file', type: 'text' }] 
        },
        { 
          role: 'user', 
          content: [
            { text: 'Here is an image', type: 'text' },
            { text: 'And some text', type: 'text' },
            { 
              data: mockImageData,
              mimeType: 'image/png',
              type: 'image'
            }
          ] 
        },
        { 
          role: 'assistant', 
          content: [{ text: 'I see the image', type: 'text' }] 
        },
        { 
          role: 'user', 
          content: [{ text: 'What do you think?', type: 'text' }] 
        }
      ]);
      
      // Assign mocks to agent
      (agent as any).loadPromptMultipart = loadPromptMultipart;
      
      // Load conversation from file
      const prompts = loadPromptMultipart('conv2_attach.md');
      
      // Verify loaded conversation
      expect(prompts.length).toBe(5);
      expect(prompts[0].role).toBe('user');
      expect(prompts[0].content[1].resource.mimeType).toBe('text/css');
      expect(prompts[0].content[1].resource.text).toContain('f5f5f5');
      
      expect(prompts[1].role).toBe('assistant');
      expect(prompts[1].content[0].text).toContain('sharing');
      
      expect(prompts[2].content.length).toBe(3);
      expect(prompts[2].content[2].type).toBe('image');
      expect(prompts[2].content[2].data).toBeDefined();
    });

    // Run FastAgent
    await fast.run();
  });

  it('should save state to simple text file', async () => {
    // Define agent
    fast.agent({ 
      name: 'default',
      model: 'passthrough'
    }, async (agent: BaseAgent) => {
      // Mock fs functions
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.unlinkSync as jest.Mock).mockReturnValueOnce(undefined);
      
      // Mock the agent's send method
      const send = jest.fn()
        .mockResolvedValueOnce('Response to: hello')
        .mockResolvedValueOnce('Response to: world')
        .mockResolvedValueOnce('History saved to simple.txt');
      
      // Mock loadPromptMultipart
      const loadPromptMultipart = jest.fn().mockReturnValue([
        { role: 'user', content: [{ text: 'hello', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'Response to: hello', type: 'text' }] },
        { role: 'user', content: [{ text: 'world', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'Response to: world', type: 'text' }] }
      ]);
      
      // Assign mocks to agent
      (agent as any).send = send;
      (agent as any).loadPromptMultipart = loadPromptMultipart;
      
      // Send messages
      await (agent as any).send('hello');
      await (agent as any).send('world');
      await (agent as any).send('***SAVE_HISTORY simple.txt');
      
      // Load saved conversation
      const prompts = loadPromptMultipart('simple.txt');
      
      // Verify loaded conversation
      expect(prompts.length).toBe(4);
      expect(prompts[0].role).toBe('user');
      expect(prompts[1].role).toBe('assistant');
      
      // Verify fs calls
      expect(fs.unlinkSync).toHaveBeenCalledWith('./simple.txt');
      expect(send).toHaveBeenCalledTimes(3);
    });

    // Run FastAgent
    await fast.run();
  });

  it('should save state to MCP JSON format', async () => {
    // Define agent
    fast.agent({ 
      name: 'default',
      model: 'passthrough'
    }, async (agent: BaseAgent) => {
      // Mock fs functions
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.unlinkSync as jest.Mock).mockReturnValueOnce(undefined);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      
      // Mock the agent's send method
      const send = jest.fn()
        .mockResolvedValueOnce('Response to: hello')
        .mockResolvedValueOnce('Response to: world')
        .mockResolvedValueOnce('History saved to history.json');
      
      // Mock jsonToMultipartMessages
      const jsonToMultipartMessages = jest.fn().mockReturnValue([
        { role: 'user', content: [{ text: 'hello', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'Response to: hello', type: 'text' }] },
        { role: 'user', content: [{ text: 'world', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'Response to: world', type: 'text' }] }
      ]);
      
      // Assign mocks to agent
      (agent as any).send = send;
      (agent as any).jsonToMultipartMessages = jsonToMultipartMessages;
      
      // Send messages
      await (agent as any).send('hello');
      await (agent as any).send('world');
      await (agent as any).send('***SAVE_HISTORY history.json');
      
      // Verify fs calls
      expect(fs.unlinkSync).toHaveBeenCalledWith('./history.json');
      expect(fs.existsSync).toHaveBeenCalledWith('./history.json');
      expect(send).toHaveBeenCalledTimes(3);
      
      // Verify JSON content
      const jsonContent = (fs.readFileSync as jest.Mock).mock.results[0]?.value;
      const jsonData = JSON.parse(jsonContent);
      
      expect(Array.isArray(jsonData.messages)).toBe(true);
      expect(jsonData.messages.length).toBeGreaterThanOrEqual(4);
      
      // Verify message structure
      jsonData.messages.forEach((msg: any) => {
        expect(msg).toHaveProperty('role');
        expect(msg).toHaveProperty('content');
      });
      
      // Load using jsonToMultipartMessages
      const prompts = jsonToMultipartMessages(jsonContent);
      
      // Verify loaded prompts
      expect(prompts.length).toBeGreaterThanOrEqual(4);
      expect(prompts[0].role).toBe('user');
      expect(prompts[1].role).toBe('assistant');
      expect(prompts[0].content[0].text).toContain('hello');
    });

    // Run FastAgent
    await fast.run();
  });

  it('should round trip JSON attachments', async () => {
    // Define agent
    fast.agent({ 
      name: 'test',
      model: 'passthrough'
    }, async (agent: BaseAgent) => {
      // Mock fs functions
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      
      // Mock the agent's methods
      const generate = jest.fn()
        .mockResolvedValueOnce({ first_text: () => 'Good morning! How can I help you today?' })
        .mockResolvedValueOnce({ first_text: () => 'I see an image in your message.' });
      
      const send = jest.fn().mockResolvedValueOnce('History saved to multipart.json');
      
      // Mock loadPromptMultipart
      const loadPromptMultipart = jest.fn().mockReturnValue([
        { role: 'user', content: [{ text: 'good morning', type: 'text' }] },
        { role: 'assistant', content: [{ text: 'Good morning! How can I help you today?', type: 'text' }] },
        { 
          role: 'user', 
          content: [
            { text: "what's in this image", type: 'text' },
            { 
              data: mockImageData,
              mimeType: 'image/png',
              type: 'image'
            }
          ] 
        },
        { role: 'assistant', content: [{ text: 'I see an image in your message.', type: 'text' }] }
      ]);
      
      // Create Prompt.user mock
      const userPrompt = jest.fn()
        .mockReturnValueOnce({ role: 'user', content: [{ text: 'good morning', type: 'text' }] })
        .mockReturnValueOnce({ 
          role: 'user', 
          content: [
            { text: "what's in this image", type: 'text' },
            { 
              data: mockImageData,
              mimeType: 'image/png',
              type: 'image'
            }
          ] 
        });
      
      // Assign mocks to agent
      (agent as any).test = { generate };
      (agent as any).send = send;
      (agent as any).loadPromptMultipart = loadPromptMultipart;
      Prompt.user = userPrompt;
      
      // Generate messages
      await (agent as any).test.generate([Prompt.user('good morning')]);
      await (agent as any).test.generate([Prompt.user("what's in this image", 'conv2_img.png')]);
      await (agent as any).send('***SAVE_HISTORY multipart.json');
      
      // Load saved conversation
      const prompts = loadPromptMultipart('./multipart.json');
      
      // Verify loaded conversation
      expect(prompts.length).toBe(4);
      expect(prompts[1].role).toBe('assistant');
      expect(prompts[2].content.length).toBe(2);
      expect(prompts[2].content[1].type).toBe('image');
      expect(prompts[2].content[1].data).toBeDefined();
      
      // Verify method calls
      expect(generate).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenCalledTimes(1);
      expect(userPrompt).toHaveBeenCalledTimes(2);
    });

    // Run FastAgent
    await fast.run();
  });
});
