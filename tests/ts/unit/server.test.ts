import { AgentMCPServer } from "../../../src/server";
import { BaseAgent } from "../../../src/mcpAgent";

// Mock dependencies
jest.mock("../../../src/mcpAgent", () => ({
  BaseAgent: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation(async function (this: any, _msg: string) {
      if (this.context && this.context.progress_reporter) {
        await this.context.progress_reporter(1);
      }
      return "Response from agent";
    }),
    context: { progress_reporter: jest.fn() },
    _llm: { messageHistory: [] },
  })),
}));

const mockMcpServer = {
  addTool: jest.fn(),
  addPrompt: jest.fn(),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
};

jest.mock("fastmcp", () => ({
  FastMCP: jest.fn(() => mockMcpServer),
}));

describe("AgentMCPServer", () => {
  let agents: Record<string, BaseAgent>;
  let server: AgentMCPServer;
  let MockBaseAgent: jest.Mock;
  let FastMCPMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    MockBaseAgent = (require("../../../src/mcpAgent") as any).BaseAgent;
    agents = {
      testAgent: new MockBaseAgent(),
    };
    FastMCPMock = require("fastmcp").FastMCP as jest.Mock;
    server = new AgentMCPServer(agents, "TestServer", "Test Description");
  });

  test("should initialize with provided agents and server details", () => {
    expect(FastMCPMock).toHaveBeenCalledWith({
      name: "TestServer",
      instructions: "Test Description",
      version: "1.0.0",
    });
  });

  test("should register tools for each agent", () => {
    const toolArgs = mockMcpServer.addTool.mock.calls[0][0];
    expect(toolArgs.name).toBe("testAgent_send");
    expect(toolArgs.description).toBe(
      "Send a message to the testAgent agent",
    );
    const promptArgs = mockMcpServer.addPrompt.mock.calls[0][0];
    expect(promptArgs.name).toBe("testAgent_history");
    expect(promptArgs.description).toBe(
      "Conversation history for the testAgent agent",
    );
  });

  test("should handle send message tool execution with context bridging", async () => {
    const toolDef = mockMcpServer.addTool.mock.calls[0][0];
    const mockCtx = { reportProgress: jest.fn().mockResolvedValue(undefined) };
    const result = await toolDef.execute({ message: "Hello, agent" }, mockCtx);
    expect(agents.testAgent.send).toHaveBeenCalledWith("Hello, agent");
    expect(result).toBe("Response from agent");
    expect(mockCtx.reportProgress).toHaveBeenCalled();
  });

  test("should handle history prompt execution", async () => {
    const promptDef = mockMcpServer.addPrompt.mock.calls[0][0];
    const result = await promptDef.load();
    expect(result).toBe("[]");
  });

  test("should run server with SSE transport", () => {
    server.run("sse", "localhost", 8080);
    expect(mockMcpServer.start).toHaveBeenCalledWith({
      transportType: "sse",
      sse: { port: 8080, endpoint: "/sse" },
    });
  });

  test("should run server asynchronously with SSE transport", async () => {
    await server.runAsync("sse", "localhost", 8080);
    expect(mockMcpServer.start).toHaveBeenCalledWith({
      transportType: "sse",
      sse: { port: 8080, endpoint: "/sse" },
    });
  });

  test("should run server asynchronously with STDIO transport", async () => {
    await server.runAsync("stdio");
    expect(mockMcpServer.start).toHaveBeenCalledWith({
      transportType: "stdio",
    });
  });

  test("should handle keyboard interrupt during async SSE run", async () => {
    mockMcpServer.start.mockRejectedValueOnce(
      Object.assign(new Error("KeyboardInterrupt"), {
        name: "KeyboardInterrupt",
      }),
    );
    await expect(server.runAsync("sse")).resolves.toBeUndefined();
  });

  test("should handle keyboard interrupt during async STDIO run", async () => {
    mockMcpServer.start.mockRejectedValueOnce(
      Object.assign(new Error("KeyboardInterrupt"), {
        name: "KeyboardInterrupt",
      }),
    );
    await expect(server.runAsync("stdio")).resolves.toBeUndefined();
  });

  test("should rethrow non-interrupt errors during async run", async () => {
    mockMcpServer.start.mockRejectedValueOnce(new Error("Some other error"));
    await expect(server.runAsync("sse")).rejects.toThrow("Some other error");
  });

  test("should shutdown server gracefully", async () => {
    await server.shutdown();
    expect(mockMcpServer.stop).toHaveBeenCalled();
  });
});
