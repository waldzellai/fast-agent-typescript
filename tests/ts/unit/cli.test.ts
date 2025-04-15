import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";

// Mock dependencies
jest.mock("commander", () => {
  const mockInstance = {
    name: jest.fn().mockReturnValue({}),
    description: jest.fn().mockReturnValue({}),
    version: jest.fn().mockReturnValue({}),
    option: jest.fn().mockReturnValue({}),
    helpOption: jest.fn().mockReturnValue({}),
    addCommand: jest.fn().mockReturnValue({}),
    action: jest.fn().mockReturnValue({}),
    parse: jest.fn().mockReturnValue({}),
  };
  const mockCommand = jest.fn(() => mockInstance);
  return { Command: mockCommand, mockInstance };
});

jest.mock("fs", () => ({
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({ version: "1.0.0" })),
}));

jest.mock("../src/cli/setup", () => ({
  setupCommand: { name: "setup" },
}));

jest.mock("../src/cli/quickstart", () => ({
  setupQuickstartCommand: jest.fn(),
  setupBootstrapCommand: jest.fn(),
}));

describe("CLI", () => {
  let program: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    // Re-import the module to reset the program instance
    jest.resetModules();
    require("../src/cli.ts");
    const commanderMock = require("commander");
    program = commanderMock.mockInstance;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("should initialize CLI with correct name and description", () => {
    expect(program.name).toHaveBeenCalledWith("fastagent");
    expect(program.description).toHaveBeenCalledWith(
      "FastAgent CLI - Build effective agents using Model Context Protocol (MCP)",
    );
  });

  test("should set version from package.json", () => {
    expect(program.version).toHaveBeenCalledWith(
      expect.stringContaining("1.0.0"),
      "--version",
      "Show version and exit",
    );
  });

  test("should define verbose and quiet options", () => {
    expect(program.option).toHaveBeenCalledWith(
      "-v, --verbose",
      "Enable verbose mode",
      expect.any(Function),
    );
    expect(program.option).toHaveBeenCalledWith(
      "-q, --quiet",
      "Disable output",
      expect.any(Function),
    );
  });

  test("should define color output options", () => {
    expect(program.option).toHaveBeenCalledWith(
      "--color",
      "Enable color output",
      expect.any(Function),
    );
    expect(program.option).toHaveBeenCalledWith(
      "--no-color",
      "Disable color output",
      expect.any(Function),
    );
  });

  test("should define help option", () => {
    expect(program.helpOption).toHaveBeenCalledWith(
      "--help",
      "Display help for command",
    );
  });

  test("should add setup command", () => {
    expect(program.addCommand).toHaveBeenCalledWith(
      expect.objectContaining({ name: "setup" }),
    );
  });

  test("should call quickstart and bootstrap setup functions", () => {
    const {
      setupQuickstartCommand,
      setupBootstrapCommand,
    } = require("../src/cli/quickstart");
    expect(setupQuickstartCommand).toHaveBeenCalledWith(program);
    expect(setupBootstrapCommand).toHaveBeenCalledWith(program);
  });

  test("should display welcome message when no command is provided", () => {
    const actionCallback = program.action.mock.calls[0][0];
    actionCallback();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("fast-agent (fast-agent-mcp) 1.0.0"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Available Commands:"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "setup        | Set up a new agent project with configuration files",
      ),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "quickstart   | Create example applications (workflow, researcher, etc.)",
      ),
    );
  });

  test("should parse command line arguments", () => {
    expect(program.parse).toHaveBeenCalledWith(process.argv);
  });
});
