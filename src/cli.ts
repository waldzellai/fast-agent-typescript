#!/usr/bin/env node

import { Command } from "commander";

// Assuming these will be implemented in separate files
import { setupCommand } from "./cli/setup";
import {
  setupQuickstartCommand,
  setupBootstrapCommand,
} from "./cli/quickstart";

// Application class to manage shared context
class Application {
  verbosity: number = 0;
  console: boolean = true;

  constructor() {
    this.verbosity = 0;
    this.console = true;
  }
}

// Shared application context
const application = new Application();

// Function to get package version
function getVersion(): string {
  try {
    const pkg = require("../package.json");
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

// Function to show welcome message with available commands
function showWelcome(): void {
  const appVersion = getVersion();
  console.log(`\nfast-agent (fast-agent-mcp) ${appVersion}`);
  console.log("Build effective agents using Model Context Protocol (MCP)");

  // Create a simple table for commands without external dependency
  console.log("\nAvailable Commands:");
  console.log("------------------");
  console.log("Command      | Description");
  console.log(
    "-------------|------------------------------------------------------------",
  );
  console.log(
    "setup        | Set up a new agent project with configuration files",
  );
  console.log(
    "quickstart   | Create example applications (workflow, researcher, etc.)",
  );
  console.log(
    "-------------|------------------------------------------------------------",
  );

  console.log("\nGetting Started:");
  console.log("1. Set up a new project:");
  console.log("   fastagent setup");
  console.log("\n2. Create Building Effective Agents workflow examples:");
  console.log("   fastagent quickstart workflow");
  console.log("\n3. Explore other examples:");
  console.log("   fastagent quickstart");
  console.log("\nUse --help with any command for more information");
  console.log("Example: fastagent quickstart --help");
}

// Main CLI setup
const program = new Command();
program
  .name("fastagent")
  .description(
    "FastAgent CLI - Build effective agents using Model Context Protocol (MCP)",
  )
  .version(getVersion(), "--version", "Show version and exit")
  .option("-v, --verbose", "Enable verbose mode", () => {
    application.verbosity = 1;
  })
  .option("-q, --quiet", "Disable output", () => {
    application.verbosity = -1;
  })
  .option("--color", "Enable color output", () => {
    application.console = true;
  })
  .option("--no-color", "Disable color output", () => {
    application.console = false;
  })
  .helpOption("--help", "Display help for command");

// Add subcommands
program.addCommand(setupCommand);

// Placeholder for other subcommands

// Setup quickstart and bootstrap commands
setupQuickstartCommand(program);
setupBootstrapCommand(program);

// Handle case when no command is provided
program.action(() => {
  showWelcome();
});

// Parse command line arguments
program.parse(process.argv);
