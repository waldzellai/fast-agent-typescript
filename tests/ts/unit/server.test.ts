import { AgentMCPServer } from "../../../src/server";
import { BaseAgent } from "../../../src/mcpAgent";

// Mock dependencies
jest.mock("../../../src/mcpAgent", () => ({
  BaseAgent: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue("Response from agent"),
    context: { progress_reporter: jest.fn() },
    _llm: { messageHistory: [] },
  })),
}));

describe("AgentMCPServer", () => {
  let agents: Record<string, BaseAgent>;
  let server: AgentMCPServer;
  let mockMcpServer: any;
  let MockBaseAgent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    MockBaseAgent = (require("../../../src/mcpAgent") as any).BaseAgent;
    agents = {
      testAgent: new MockBaseAgent(),
    };
    // Mock FastMCP implementation
    mockMcpServer = {
      tool: jest.fn().mockReturnValue(jest.fn()),
      prompt: jest.fn().mockReturnValue(jest.fn()),
      run: jest.fn(),
      run_sse_async: jest.fn().mockResolvedValue(undefined),
      run_stdio_async: jest.fn().mockResolvedValue(undefined),
      settings: {
        host: "0.0.0.0",
        port: 8000,
      },
    };
    // Mock the initializeMcpServer method to return our mockMcpServer
    jest
      .spyOn(AgentMCPServer.prototype as any, "initializeMcpServer")
      .mockReturnValue(mockMcpServer);
    server = new AgentMCPServer(agents, "TestServer", "Test Description");
  });

  test("should initialize with provided agents and server details", () => {
    expect(server).toBeDefined();
    expect((server as any).initializeMcpServer).toHaveBeenCalledWith(
      "TestServer",
      "Test Description",
    );
  });

  test("should register tools for each agent", () => {
    expect(mockMcpServer.tool).toHaveBeenCalledWith({
      name: "testAgent_send",
      description: "Send a message to the testAgent agent",
    });
    expect(mockMcpServer.prompt).toHaveBeenCalledWith({
      name: "testAgent_history",
      description: "Conversation history for the testAgent agent",
    });
  });

  test("should handle send message tool execution with context bridging", async () => {
    const sendToolCallback = mockMcpServer.tool.mock.results[0].value;
    const mockCtx = { report_progress: jest.fn().mockResolvedValue(undefined) };
    const result = await sendToolCallback("Hello, agent", mockCtx);
    expect(agents.testAgent.send).toHaveBeenCalledWith("Hello, agent");
    expect(result).toBe("Response from agent");
    expect(mockCtx.report_progress).toHaveBeenCalled();
  });

  test("should handle history prompt execution", async () => {
    const historyPromptCallback = mockMcpServer.prompt.mock.results[0].value;
    const result = await historyPromptCallback();
    expect(result).toEqual([]);
  });

  test("should run server with SSE transport and update settings", () => {
    server.run("sse", "localhost", 8080);
    expect(mockMcpServer.settings.host).toBe("localhost");
    expect(mockMcpServer.settings.port).toBe(8080);
    expect(mockMcpServer.run).toHaveBeenCalledWith({ transport: "sse" });
  });

  test("should run server asynchronously with SSE transport", async () => {
    await server.runAsync("sse", "localhost", 8080);
    expect(mockMcpServer.settings.host).toBe("localhost");
    expect(mockMcpServer.settings.port).toBe(8080);
    expect(mockMcpServer.run_sse_async).toHaveBeenCalled();
  });

  test("should run server asynchronously with STDIO transport", async () => {
    await server.runAsync("stdio");
    expect(mockMcpServer.run_stdio_async).toHaveBeenCalled();
  });

  test("should handle keyboard interrupt during async SSE run", async () => {
    const error = new Error("KeyboardInterrupt");
    error.name = "KeyboardInterrupt";
    mockMcpServer.run_sse_async.mockRejectedValue(error);
    await expect(server.runAsync("sse")).resolves.toBeUndefined();
  });

  test("should handle keyboard interrupt during async STDIO run", async () => {
    const error = new Error("KeyboardInterrupt");
    error.name = "KeyboardInterrupt";
    mockMcpServer.run_stdio_async.mockRejectedValue(error);
    await expect(server.runAsync("stdio")).resolves.toBeUndefined();
  });

  test("should rethrow non-interrupt errors during async run", async () => {
    const error = new Error("Some other error");
    mockMcpServer.run_sse_async.mockRejectedValue(error);
    await expect(server.runAsync("sse")).rejects.toThrow("Some other error");
  });

  test("should shutdown server gracefully", async () => {
    await expect(server.shutdown()).resolves.toBeUndefined();
  });
});
