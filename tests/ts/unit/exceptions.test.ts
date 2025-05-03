import {
  FastAgentError,
  ServerConfigError,
  AgentConfigError,
  ProviderKeyError,
  ServerInitializationError,
  ModelConfigError,
  CircularDependencyError,
  PromptExitError,
} from "../../../src/core/exceptions";

describe("FastAgentError", () => {
  test("should create error with message only", () => {
    const error = new FastAgentError("Base error message");
    expect(error.message).toBe("Base error message");
    expect(error.details).toBeUndefined();
    expect(error.name).toBe("FastAgentError");
  });

  test("should create error with message and details", () => {
    const error = new FastAgentError(
      "Base error message",
      "Detailed information",
    );
    expect(error.message).toContain("Base error message");
    expect(error.message).toContain("Detailed information");
    expect(error.details).toBe("Detailed information");
    expect(error.name).toBe("FastAgentError");
  });
});

describe("ServerConfigError", () => {
  test("should create error with message and details", () => {
    const error = new ServerConfigError(
      "Server config issue",
      "Server not defined",
    );
    expect(error.message).toContain("Server config issue");
    expect(error.message).toContain("Server not defined");
    expect(error.details).toBe("Server not defined");
    expect(error.name).toBe("ServerConfigError");
  });
});

describe("AgentConfigError", () => {
  test("should create error with message and details", () => {
    const error = new AgentConfigError(
      "Agent config issue",
      "Unknown agent reference",
    );
    expect(error.message).toContain("Agent config issue");
    expect(error.message).toContain("Unknown agent reference");
    expect(error.details).toBe("Unknown agent reference");
    expect(error.name).toBe("AgentConfigError");
  });
});

describe("ProviderKeyError", () => {
  test("should create error with message and details", () => {
    const error = new ProviderKeyError(
      "API key missing",
      "OpenAI key required",
    );
    expect(error.message).toContain("API key missing");
    expect(error.message).toContain("OpenAI key required");
    expect(error.details).toBe("OpenAI key required");
    expect(error.name).toBe("ProviderKeyError");
  });
});

describe("ServerInitializationError", () => {
  test("should create error with message and details", () => {
    const error = new ServerInitializationError(
      "Server init failed",
      "Connection error",
    );
    expect(error.message).toContain("Server init failed");
    expect(error.message).toContain("Connection error");
    expect(error.details).toBe("Connection error");
    expect(error.name).toBe("ServerInitializationError");
  });
});

describe("ModelConfigError", () => {
  test("should create error with message and details", () => {
    const error = new ModelConfigError(
      "Model config issue",
      "Unknown model name",
    );
    expect(error.message).toContain("Model config issue");
    expect(error.message).toContain("Unknown model name");
    expect(error.details).toBe("Unknown model name");
    expect(error.name).toBe("ModelConfigError");
  });
});

describe("CircularDependencyError", () => {
  test("should create error with message and details", () => {
    const error = new CircularDependencyError(
      "Circular dependency detected",
      "Agent A depends on B and vice versa",
    );
    expect(error.message).toContain("Circular dependency detected");
    expect(error.message).toContain("Agent A depends on B and vice versa");
    expect(error.details).toBe("Agent A depends on B and vice versa");
    expect(error.name).toBe("CircularDependencyError");
  });
});

describe("PromptExitError", () => {
  test("should create error with message and details", () => {
    const error = new PromptExitError(
      "Prompt exit requested",
      "User requested hard exit",
    );
    expect(error.message).toContain("Prompt exit requested");
    expect(error.message).toContain("User requested hard exit");
    expect(error.details).toBe("User requested hard exit");
    expect(error.name).toBe("PromptExitError");
  });
});
