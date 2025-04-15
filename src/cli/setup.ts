import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Template for fastagent.config.yaml
const FASTAGENT_CONFIG_TEMPLATE = `
# FastAgent Configuration File

# Default Model Configuration:
# 
# Takes format:
#   <provider>.<model_string>.<reasoning_effort?> (e.g. anthropic.claude-3-5-sonnet-20241022 or openai.o3-mini.low)
# Accepts aliases for Anthropic Models: haiku, haiku3, sonnet, sonnet35, opus, opus3
# and OpenAI Models: gpt-4o-mini, gpt-4o, o1, o1-mini, o3-mini
#
# If not specified, defaults to "haiku". 
# Can be overriden with a command line switch --model=<model>, or within the Agent constructor.

default_model: haiku

# Logging and Console Configuration:
logger:
    # level: "debug" | "info" | "warning" | "error"
    # type: "none" | "console" | "file" | "http"
    # path: "/path/to/logfile.jsonl"

    
    # Switch the progress display on or off
    progress_display: true

    # Show chat User/Assistant messages on the console
    show_chat: true
    # Show tool calls on the console
    show_tools: true
    # Truncate long tool responses on the console 
    truncate_tools: true

# MCP Servers
mcp:
    servers:
        fetch:
            command: "uvx"
            args: ["mcp-server-fetch"]
        filesystem:
            command: "npx"
            args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
`;

// Template for fastagent.secrets.yaml
const FASTAGENT_SECRETS_TEMPLATE = `
# FastAgent Secrets Configuration
# WARNING: Keep this file secure and never commit to version control

# Alternatively set OPENAI_API_KEY, ANTHROPIC_API_KEY or other environment variables. 
# Keys in the configuration file override environment variables.

openai:
    api_key: <your-api-key-here>
anthropic:
    api_key: <your-api-key-here>
deepseek:
    api_key: <your-api-key-here>
openrouter:
    api_key: <your-api-key-here>


# Example of setting an MCP Server environment variable
mcp:
    servers:
        brave:
            env:
                BRAVE_API_KEY: <your_api_key_here>
`;

// Template for .gitignore
const GITIGNORE_TEMPLATE = `
# FastAgent secrets file
fastagent.secrets.yaml

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
.env
.venv
env/
venv/
ENV/

# IDE
.idea/
.vscode/
*.swp
*.swo
`;

// Template for example agent.ts
const AGENT_EXAMPLE_TEMPLATE = `
import { FastAgent } from "../mcpAgent";

// Create the application
const fast = new FastAgent("fast-agent example");

// Define the agent
fast.agent({ instruction: "You are a helpful AI Agent" }, async function main(agent) {
    // Use the --model command line switch or agent arguments to change model
    await agent.interactive();
});

// Run the agent
if (require.main === module) {
    fast.run();
}
`;

// Function to check if a .gitignore file exists in the directory or any parent
function findGitignore(dirPath: string): boolean {
  let current = path.resolve(dirPath);
  const root = path.parse(current).root;
  while (current !== root) {
    if (fs.existsSync(path.join(current, ".gitignore"))) {
      return true;
    }
    current = path.dirname(current);
  }
  return false;
}

// Function to create a file with content if it doesn't exist or if force is true
async function createFile(
  filePath: string,
  content: string,
  force: boolean = false,
): Promise<boolean> {
  if (fs.existsSync(filePath) && !force) {
    const shouldOverwrite = await askQuestion(
      `Warning: ${filePath} already exists. Overwrite? (y/N): `,
    );
    if (!shouldOverwrite.toLowerCase().startsWith("y")) {
      console.log(`Skipping ${filePath}`);
      return false;
    }
  }
  fs.writeFileSync(filePath, content.trim() + "\n");
  console.log(`Created ${filePath}`);
  return true;
}

// Function to ask a question and get user input
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Setup command implementation
export const setupCommand = new Command()
  .name("setup")
  .description("Set up a new agent project with configuration files")
  .option(
    "-c, --config-dir <directory>",
    "Directory where configuration files will be created",
    ".",
  )
  .option("-f, --force", "Force overwrite existing files", false)
  .action(async (options) => {
    const configPath = path.resolve(options.configDir);
    if (!fs.existsSync(configPath)) {
      const shouldCreate = await askQuestion(
        `Directory ${configPath} does not exist. Create it? (Y/n): `,
      );
      if (shouldCreate.toLowerCase().startsWith("n")) {
        console.log("Setup aborted.");
        return;
      }
      fs.mkdirSync(configPath, { recursive: true });
    }

    // Check for existing .gitignore
    const needsGitignore = !findGitignore(configPath);

    console.log("\nfast-agent Setup\n");
    console.log("This will create the following files:");
    console.log(`  - ${configPath}/fastagent.config.yaml`);
    console.log(`  - ${configPath}/fastagent.secrets.yaml`);
    console.log(`  - ${configPath}/agent.ts`);
    if (needsGitignore) {
      console.log(`  - ${configPath}/.gitignore`);
    }

    const shouldContinue = await askQuestion("\nContinue? (Y/n): ");
    if (shouldContinue.toLowerCase().startsWith("n")) {
      console.log("Setup aborted.");
      return;
    }

    // Create configuration files
    const created: string[] = [];
    if (
      await createFile(
        path.join(configPath, "fastagent.config.yaml"),
        FASTAGENT_CONFIG_TEMPLATE,
        options.force,
      )
    ) {
      created.push("fastagent.config.yaml");
    }

    if (
      await createFile(
        path.join(configPath, "fastagent.secrets.yaml"),
        FASTAGENT_SECRETS_TEMPLATE,
        options.force,
      )
    ) {
      created.push("fastagent.secrets.yaml");
    }

    if (
      await createFile(
        path.join(configPath, "agent.ts"),
        AGENT_EXAMPLE_TEMPLATE,
        options.force,
      )
    ) {
      created.push("agent.ts");
    }

    // Only create .gitignore if none exists in parent directories
    if (
      needsGitignore &&
      (await createFile(
        path.join(configPath, ".gitignore"),
        GITIGNORE_TEMPLATE,
        options.force,
      ))
    ) {
      created.push(".gitignore");
    }

    if (created.length > 0) {
      console.log("\nSetup completed successfully!");
      if (created.includes("fastagent.secrets.yaml")) {
        console.log("\nImportant: Remember to:");
        console.log(
          "1. Add your API keys to fastagent.secrets.yaml or set OPENAI_API_KEY and ANTHROPIC_API_KEY environment variables",
        );
        console.log(
          "2. Keep fastagent.secrets.yaml secure and never commit it to version control",
        );
        console.log(
          "3. Update fastagent.config.yaml to set a default model (currently system default is 'haiku')",
        );
      }
      console.log("\nTo get started, run:");
      console.log("  npx ts-node agent.ts");
    } else {
      console.log("\nNo files were created or modified.");
    }
  });
