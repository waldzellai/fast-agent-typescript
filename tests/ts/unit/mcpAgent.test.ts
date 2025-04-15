import { Agent, BaseAgent } from "../../../src/mcpAgent";
import { getLogger } from "../../../src/mcpAgent";

// Mock the getLogger function to avoid actual logging during tests
jest.mock("../../../src/mcpAgent", () => {
  const originalModule = jest.requireActual("../../../src/mcpAgent");
  return {
    ...originalModule,
    getLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  };
});

describe("Agent Class", () => {
  let agent: Agent;
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  const mockConfig = {
    name: "test-agent",
    type: { name: "test-type" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new Agent(mockConfig, [], true, undefined, undefined);
  });

  test("should initialize with correct configuration", () => {
    expect(agent).toBeDefined();
    expect(getLogger).toHaveBeenCalledWith(mockConfig.name);
  });

  test("should send a message and receive a response", async () => {
    const message = "Hello, Agent!";
    const expectedResponse = "Response from server";
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === "message") {
        callback(expectedResponse);
      }
    });

    const response = await agent.send(message);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "message",
      { content: message },
      expect.any(Function),
    );
    expect(response).toBe(expectedResponse);
  });

  test("should handle error when sending a message fails", async () => {
    const message = "Hello, Agent!";
    const errorMessage = "Failed to send message";
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === "message") {
        callback(new Error(errorMessage));
      }
    });

    await expect(agent.send(message)).rejects.toThrow(errorMessage);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "message",
      { content: message },
      expect.any(Function),
    );
  });

  test("should apply a prompt with given arguments", async () => {
    const promptName = "test-prompt";
    const args = { key: "value" };
    const expectedResponse = "Prompt applied successfully";
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === "applyPrompt") {
        callback(expectedResponse);
      }
    });

    const response = await agent.applyPrompt(promptName, args);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "applyPrompt",
      { promptName, args },
      expect.any(Function),
    );
    expect(response).toBe(expectedResponse);
  });

  test("should list available prompts", async () => {
    const expectedPrompts = ["prompt1", "prompt2"];
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === "listPrompts") {
        callback(expectedPrompts);
      }
    });

    const prompts = await agent.listPrompts();
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "listPrompts",
      { agentName: mockConfig.name },
      expect.any(Function),
    );
    expect(prompts).toEqual(expectedPrompts);
  });

  test("should list available resources", async () => {
    const expectedResources = ["resource1", "resource2"];
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === "listResources") {
        callback(expectedResources);
      }
    });

    const resources = await agent.listResources();
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "listResources",
      { agentName: mockConfig.name },
      expect.any(Function),
    );
    expect(resources).toEqual(expectedResources);
  });

  test("should handle prompt method with a message", async () => {
    const message = "Test prompt message";
    const expectedResponse = "Prompt response";
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === "message") {
        callback(expectedResponse);
      }
    });

    const response = await agent.prompt(message);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "message",
      { content: message },
      expect.any(Function),
    );
    expect(response).toBe(expectedResponse);
  });
});
