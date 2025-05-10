import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent, Context } from '../../../src/mcpAgent';
import {
  Prompt,
  PromptMessage,
  PromptMessageMultipart,
  Role,
  ContentPart,
  isPromptMessage,
  ImageContent,
  isImageContent,
  isTextContent,
  TextContent,
} from '../../../src/core/prompt';
import { AgentConfig } from '../../../src/core/agentTypes';
import { getModelFactory } from '../../../src/core/directFactory';

// Placeholder interfaces for testing tool interactions
interface ToolCallContent {
  type: "tool_call";
  id: string;
  name: string;
  input: any;
}

interface ToolResultContent {
  type: "tool_result";
  tool_call_id: string;
  content: string | ContentPart[];
}

// Define a custom content part type for tests that's broader than ContentPart
type TestContentPart = ContentPart | ToolCallContent | ToolResultContent;

// Create a custom prompt message type for tests that accepts our custom content parts
interface TestPromptMessageMultipart extends Omit<PromptMessageMultipart, 'content'> {
    content: TestContentPart[];
}

// Mock the getModelFactory path
jest.mock('../../../src/core/directFactory');

// Define mocks at the top level or within describe
let mockSend: jest.Mock;
let mockGenerate: jest.Mock;
let mockLlmInstance: any;
const imagePath = path.join(__dirname, 'image.png');
const pdfPath = path.join(__dirname, 'sample.pdf');
const TEST_ASSETS_DIR = path.resolve(__dirname, '../..', 'assets');

// Updated mockSend definition
mockSend = jest
  .fn()
  .mockImplementation(
    async (
      message: string | PromptMessage | PromptMessageMultipart
    ): Promise<string> => {
      let userContent = '';
      if (typeof message === 'string') {
        userContent = message;
      } else if (isPromptMessage(message)) {
        if (Array.isArray(message.content)) {
          const textPart = message.content.find(isTextContent);
          userContent = textPart?.text || '';
        } else if (typeof message.content === 'string') {
          userContent = message.content;
        }
      }

      console.log(
        `mockSend received content: ${userContent.substring(0, 50)}...`
      );

      if (userContent.includes('image fetch tool')) {
        return 'Mock response: Okay, using the tool to fetch the image... The user name is evalstate.';
      } else if (userContent.includes('summarise the sample PDF')) {
        return 'Mock response: Summarizing the PDF... The product name is Fast-Agent.';
      } else if (userContent.includes('what is the user name')) {
        return 'Mock response: The user name in the image is evalstate.';
      } else if (userContent.includes('summarize this document')) {
        return 'Mock response: Based on the document, the company is LLMindset.';
      }
      return 'Mock default response';
    }
  );

// Updated mockGenerate definition
mockGenerate = jest
  .fn()
  .mockImplementation(
    async (
      messages: PromptMessage[]
    ): Promise<PromptMessage | PromptMessageMultipart> => {
      const userPromptMessage = messages.find((m) => m.role === Role.User);

      let responseContent: TestContentPart[] = [];
      let assistantResponseText = 'Mock Assistant Response.';

      if (userPromptMessage && userPromptMessage.content) {
        const userContentParts =
          typeof userPromptMessage.content === 'string'
            ? [{ type: 'text', text: userPromptMessage.content } as TextContent]
            : userPromptMessage.content;

        const textPart = userContentParts.find(isTextContent);
        const imagePart = userContentParts.find(isImageContent);

        console.log(
          `mockGenerate received user text: ${textPart?.text.substring(0, 50)}...`
        );
        if (imagePart) console.log(`mockGenerate received image part.`);

        if (textPart?.text.includes('image fetch tool')) {
          responseContent.push({
            type: 'tool_call',
            id: 'call_123',
            name: 'image_fetch',
            input: { query: 'sample image' },
          } as ToolCallContent);
          const mockImage: ImageContent = {
            type: 'image',
            data: fs.readFileSync(imagePath).toString('base64'),
            mimeType: 'image/png',
          };
          responseContent.push({
            type: 'tool_result',
            tool_call_id: 'call_123',
            content: 'Mock tool text result about evalstate',
            resources: [mockImage],
          } as ToolResultContent);
          assistantResponseText =
            'Okay, I used the tool. The user name is evalstate.';
          responseContent.push({
            type: 'text',
            text: assistantResponseText,
          } as TextContent);
        } else if (textPart?.text.includes('summarise the sample PDF')) {
          responseContent.push({
            type: 'tool_call',
            id: 'call_456',
            name: 'pdf_summarize',
            input: { query: 'sample PDF' },
          } as ToolCallContent);
          responseContent.push({
            type: 'tool_result',
            tool_call_id: 'call_456',
            content: 'Mock PDF summary mentioning Fast-Agent',
          } as ToolResultContent);
          assistantResponseText =
            'I have summarized the PDF using the tool. It mentions Fast-Agent.';
          responseContent.push({
            type: 'text',
            text: assistantResponseText,
          } as TextContent);
        } else if (imagePart) {
          assistantResponseText = `Mock analysis of image: The user name seems to be evalstate.`;
          responseContent.push({
            type: 'text',
            text: assistantResponseText,
          } as TextContent);
        } else if (textPart?.text.includes('summarize this document')) {
          assistantResponseText = `Mock analysis of PDF: The company mentioned is LLMindset.`;
          responseContent.push({
            type: 'text',
            text: assistantResponseText,
          } as TextContent);
        } else {
          responseContent.push({
            type: 'text',
            text: assistantResponseText,
          } as TextContent);
        }
      } else {
        responseContent.push({
          type: 'text',
          text: assistantResponseText,
        } as TextContent);
      }

      const assistantResponse = Prompt.message(
        { role: Role.Assistant },
        ...responseContent
      );

      (assistantResponse as any).all_text = () =>
        responseContent
          .filter(isTextContent)
          .map((p) => p.text)
          .join(' ');

      console.log(
        `mockGenerate returning assistant response with ${responseContent.length} parts.`
      );
      return assistantResponse;
    }
  );

// Mock factory remains the same structure, but uses the corrected mockGenerate/mockSend
const mockModelFactory = getModelFactory as jest.Mock;
mockModelFactory.mockImplementation(() => {
  mockLlmInstance = {
    generate: mockGenerate,
    send: mockSend,
    model: 'mock-model',
    config: {},
  };
  return mockLlmInstance;
});

// Reset mocks before each test
beforeEach(() => {
  mockSend.mockClear();
  mockGenerate.mockClear();
  mockModelFactory.mockClear();
  mockLlmInstance = {
    generate: mockGenerate,
    send: mockSend,
    model: 'mock-model',
    config: {},
  };
});

// --- Test Suite ---
describe('E2E Multimodal Tests - Direct Agent Instantiation', () => {
  let mockConfig: AgentConfig;
  let mockContext: Context;

  beforeEach(async () => {
    mockConfig = {
      name: 'test-agent',
      instruction: 'You are a helpful test agent.',
      model: 'default-mock-model',
      agent_type: 'agent',
      servers: [],
    };
    mockContext = { config: { mcp: { servers: {} } } };
    mockModelFactory.mockReturnValue(mockLlmInstance);
  });

  // --- Tests ---
  it('should handle text input', async () => {
    const userPrompt = Prompt.user('Hello, how are you?');
    const response = await mockGenerate([userPrompt]);
    expect(response).toBeDefined();
    expect(response.role).toEqual(Role.Assistant);
    expect(typeof response.content).toBe('string'); // Assuming text response
  });

  it('should handle image input', async () => {
    const imagePathPng = path.join(TEST_ASSETS_DIR, 'image.png');
    const userPrompt = Prompt.user(
      'Describe this image:',
      {
        type: 'image',
        data: fs.readFileSync(imagePathPng, 'base64'), // Read file and encode
        mimeType: 'image/png', // Specify mime type
      } as ImageContent // Type assertion
    );
    const response = await mockGenerate([userPrompt]);
    expect(response).toBeDefined();
    expect(response.role).toEqual(Role.Assistant);
    expect(response.content).toContain('image'); // Assuming response mentions image
  });

  it('should handle tool call and result', async () => {
    // Simulate assistant responding with a tool call
    const toolCall: ToolCallContent = {
      type: 'tool_call',
      id: 'tool_abc123',
      name: 'image_analyzer',
      input: { image_data: 'base64_encoded_or_uri' },
    };

    const assistantMessage: PromptMessageMultipart = {
      role: Role.Assistant,
      content: [toolCall],
    };

    // Simulate user providing tool result
    const toolResult: ToolResultContent = {
      type: 'tool_result',
      tool_call_id: 'tool_abc123',
      content: 'The image shows a fluffy white cat.',
    };
    const userResponseMessage: PromptMessageMultipart = {
      role: Role.User, // Role should be User providing the result
      content: [toolResult],
    };

    const response = await mockGenerate([
      assistantMessage,
      userResponseMessage,
    ]);

    // Assertions (adjust based on expected final response after tool use)
    expect(response).toBeDefined();
    expect(response.role).toEqual(Role.Assistant);
    // Assuming the final response is text
    expect(response.content).toContain('cat');
  });

  it('should handle mixed text, image, and tool call/result flow', async () => {
    // Similar setup as above, combining text, image, tool call, and result
    const userPrompt = Prompt.user(
      'Analyze this image and tell me what it is.',
      {
        type: 'image',
        data: fs.readFileSync(imagePathPng, 'base64'),
        mimeType: 'image/png',
      } as ImageContent
    );

    const assistantToolCall = {
      role: Role.Assistant,
      content: [
        {
          type: 'tool_call',
          id: 'tool_xyz789',
          name: 'analyze_content',
          input: { content_ref: 'image_data' },
        } as unknown as ContentPart,
      ],
    } as PromptMessageMultipart;

    const userToolResult = {
      role: Role.User,
      content: [
        {
          type: 'tool_result',
          tool_call_id: 'tool_xyz789',
          content: 'Identified as a PNG image of a cat.',
        } as unknown as ContentPart,
      ],
    } as PromptMessageMultipart;

    const finalResponse = await mockGenerate([
      userPrompt,
      assistantToolCall,
      userToolResult,
    ]);

    expect(finalResponse).toBeDefined();
    expect(finalResponse.role).toEqual(Role.Assistant);
    expect(typeof finalResponse.content).toBe('string'); // Assuming text response
    expect(finalResponse.content).toContain('PNG image of a cat');
  });

  // Add more tests for edge cases, errors, different content types etc.
}); // Closing brace for describe block
