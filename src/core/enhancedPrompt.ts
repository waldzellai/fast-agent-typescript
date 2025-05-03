/**
 * Enhanced prompt functionality for advanced user interactions in a terminal environment.
 * Adapted from Python's prompt_toolkit functionality to TypeScript using Node.js readline.
 */

import * as readline from "readline";
import { AgentType } from "./agentTypes";
import { PromptExitError } from "./exceptions";

// Application version (placeholder, to be replaced by actual version retrieval)
const appVersion = "unknown";

// Map of agent names to their history
const agentHistories: { [key: string]: string[] } = {};

// Store available agents for auto-completion
let availableAgents: Set<string> = new Set();

// Keep track of multi-line mode state
let inMultilineMode = false;

// Track whether help text has been shown globally
let helpMessageShown = false;

/**
 * Interface for completion suggestions.
 */
interface Completion {
  text: string;
  display: string;
  displayMeta?: string;
}

/**
 * AgentCompleter class to provide completion for agent names and commands.
 */
class AgentCompleter {
  private agents: string[];
  private commands: { [key: string]: string };
  private agentTypes: { [key: string]: AgentType };

  constructor(
    agents: string[],
    commands: string[] = [],
    agentTypes: { [key: string]: AgentType } = {},
    isHumanInput: boolean = false,
  ) {
    this.agents = agents;
    this.commands = {
      help: "Show available commands",
      prompts: "List and select MCP prompts",
      prompt: "Apply a specific prompt by name (/prompt <name>)",
      agents: "List available agents",
      clear: "Clear the screen",
      STOP: "Stop this prompting session and move to next workflow step",
      EXIT: "Exit fast-agent, terminating any running workflows",
      ...commands.reduce((acc, cmd) => ({ ...acc, [cmd]: "" }), {}),
    };
    if (isHumanInput) {
      delete this.commands.agents;
      delete this.commands.prompts;
      delete this.commands.prompt;
    }
    this.agentTypes = agentTypes;
  }

  getCompletions(text: string): Completion[] {
    const lowerText = text.toLowerCase();
    const completions: Completion[] = [];

    // Complete commands
    if (text.startsWith("/")) {
      const cmd = lowerText.slice(1);
      for (const [command, description] of Object.entries(this.commands)) {
        if (command.toLowerCase().startsWith(cmd)) {
          completions.push({
            text: command,
            display: command,
            displayMeta: description,
          });
        }
      }
    }
    // Complete agent names
    else if (text.startsWith("@")) {
      const agentName = lowerText.slice(1);
      for (const agent of this.agents) {
        if (agent.toLowerCase().startsWith(agentName)) {
          const agentType = this.agentTypes[agent] || "Agent";
          completions.push({
            text: agent,
            display: agent,
            displayMeta: agentType,
          });
        }
      }
    }
    return completions;
  }
}

/**
 * Enhanced input function to get user input with advanced features.
 * @param agentName Name of the agent (used for prompt and history)
 * @param options Configuration options for the prompt
 * @returns Promise resolving to the user input string
 */
export async function getEnhancedInput(
  agentName: string,
  options: {
    defaultValue?: string | undefined;
    showDefault?: boolean;
    showStopHint?: boolean;
    multiline?: boolean;
    availableAgentNames?: string[];
    agentTypes?: { [key: string]: AgentType };
    isHumanInput?: boolean;
    toolbarColor?: string;
  } = {},
): Promise<
  | string
  | { select_prompt: boolean; prompt_name?: string; prompt_index?: number }
> {
  const {
    defaultValue = "",
    showDefault = false,
    showStopHint = false,
    multiline = false,
    availableAgentNames = [],
    agentTypes = {},
    isHumanInput = false,
    toolbarColor = "blue",
  } = options;

  inMultilineMode = multiline;
  if (availableAgentNames.length > 0) {
    availableAgents = new Set(availableAgentNames);
  }

  // Initialize history for this agent if not exists
  if (!agentHistories[agentName]) {
    agentHistories[agentName] = [];
  }

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: (line: string) => {
      const completer = new AgentCompleter(
        availableAgentNames,
        [],
        agentTypes,
        isHumanInput,
      );
      const completions = completer.getCompletions(line);
      return [completions.map((c) => c.text), line];
    },
  });

  // Prepare prompt text
  let promptText = `${agentName} > `;
  if (showDefault && defaultValue && defaultValue !== "STOP") {
    promptText += `[${defaultValue}] `;
  }

  // Show hints if requested
  if (showStopHint && defaultValue === "STOP") {
    console.log("Enter a prompt, STOP to finish");
    if (defaultValue) {
      console.log(`Press <ENTER> to use the default prompt: ${defaultValue}`);
    }
  }

  // Show help message on first usage
  if (!helpMessageShown) {
    console.log(
      isHumanInput
        ? "Type /help for commands. Ctrl+T toggles multiline mode."
        : "Type /help for commands, @agent to switch agent. Ctrl+T toggles multiline mode.",
    );
    console.log();
    helpMessageShown = true;
  }

  // Function to preprocess input for special commands
  const preProcessInput = (
    text: string,
  ):
    | string
    | {
        select_prompt: boolean;
        prompt_name?: string;
        prompt_index?: number;
      } => {
    if (text.startsWith("/")) {
      const cmdParts = text.slice(1).trim().split(/\s+/, 2);
      const cmd = cmdParts[0].toLowerCase();
      if (cmd === "help") return "HELP";
      if (cmd === "clear") return "CLEAR";
      if (cmd === "agents") return "LIST_AGENTS";
      if (cmd === "prompts")
        return { select_prompt: true, prompt_name: undefined };
      if (cmd === "prompt" && cmdParts.length > 1) {
        const promptArg = cmdParts[1].trim();
        if (/^\d+$/.test(promptArg)) {
          return { select_prompt: true, prompt_index: parseInt(promptArg, 10) };
        } else {
          return { select_prompt: true, prompt_name: promptArg };
        }
      }
      if (cmd === "exit") return "EXIT";
      if (cmd === "stop") return "STOP";
    }
    if (text.startsWith("@")) {
      return `SWITCH:${text.slice(1).trim()}`;
    }
    return text;
  };

  return new Promise<
    | string
    | { select_prompt: boolean; prompt_name?: string; prompt_index?: number }
  >((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      const processed = preProcessInput(answer);
      resolve(processed);
    });
  }).catch((err) => {
    console.error(`Input error: ${err.name}: ${err.message}`);
    return "STOP";
  });
}

/**
 * Handle special commands input by the user.
 * @param command The command to handle
 * @returns Promise resolving to a boolean or an object with action info
 */
export async function handleSpecialCommands(
  command:
    | string
    | { select_prompt: boolean; prompt_name?: string; prompt_index?: number },
): Promise<
  | boolean
  | { select_prompt: boolean; prompt_name?: string; prompt_index?: number }
> {
  if (!command) return false;

  if (typeof command === "object") {
    return command;
  }

  if (command === "HELP") {
    console.log("\nAvailable Commands:");
    console.log("  /help          - Show this help");
    console.log("  /clear         - Clear screen");
    console.log("  /agents        - List available agents");
    console.log("  /prompts       - List and select MCP prompts");
    console.log("  /prompt <name> - Apply a specific prompt by name");
    console.log("  @agent_name    - Switch to agent");
    console.log("  STOP           - Return control back to the workflow");
    console.log(
      "  EXIT           - Exit fast-agent, terminating any running workflows",
    );
    console.log("\nKeyboard Shortcuts:");
    console.log(
      "  Enter          - Submit (normal mode) / New line (multiline mode)",
    );
    console.log("  Ctrl+Enter     - Always submit (in any mode)");
    console.log("  Ctrl+T         - Toggle multiline mode");
    console.log("  Ctrl+L         - Clear input");
    console.log("  Up/Down        - Navigate history");
    return true;
  } else if (command === "CLEAR") {
    console.clear();
    return true;
  } else if (command.toUpperCase() === "EXIT") {
    throw new PromptExitError("User requested to exit fast-agent session");
  } else if (command === "LIST_AGENTS") {
    if (availableAgents.size > 0) {
      console.log("\nAvailable Agents:");
      Array.from(availableAgents)
        .sort()
        .forEach((agent) => console.log(`  @${agent}`));
    } else {
      console.log("No agents available");
    }
    return true;
  } else if (
    command === "SELECT_PROMPT" ||
    (typeof command === "string" && command.startsWith("SELECT_PROMPT:"))
  ) {
    const promptName =
      typeof command === "string" && command.startsWith("SELECT_PROMPT:")
        ? command.split(":", 2)[1].trim()
        : null;
    return { select_prompt: true, prompt_name: promptName ?? undefined };
  }
  return false;
}

/**
 * Get selection input from a list of options.
 * @param promptText Text to display as the prompt
 * @param options List of valid options for auto-completion
 * @param defaultValue Default value if user presses enter
 * @param allowCancel Whether to allow cancellation with empty input
 * @param completeOptions Whether to use options for auto-completion
 * @returns Promise resolving to the selected value or null if cancelled
 */
export async function getSelectionInput(
  promptText: string,
  options: string[] = [],
  defaultValue: string = "",
  allowCancel: boolean = true,
  completeOptions: boolean = true,
): Promise<string | undefined> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer:
      completeOptions && options.length > 0
        ? (line: string) => [
            options.filter((opt) =>
              opt.toLowerCase().startsWith(line.toLowerCase()),
            ),
            line,
          ]
        : undefined,
  });

  return new Promise<string | undefined>((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      if (allowCancel && !answer.trim()) {
        resolve(undefined);
      } else {
        resolve(answer);
      }
    });
  }).catch((err) => {
    console.error(`Error getting selection: ${err.message}`);
    return undefined;
  });
}

/**
 * Prompt for an argument value with formatting and help text.
 * @param argName Name of the argument
 * @param description Optional description of the argument
 * @param required Whether this argument is required
 * @returns Promise resolving to the input value or null if cancelled/skipped
 */
export async function getArgumentInput(
  argName: string,
  description: string = "",
  required: boolean = true,
): Promise<string | undefined> {
  const requiredText = required
    ? "(required)"
    : "(optional, press Enter to skip)";
  if (description) {
    console.log(`  ${argName}: ${description}`);
  }
  const promptText = `Enter value for ${argName} ${requiredText}: `;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string | undefined>((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      if (!required && !answer) {
        resolve(undefined);
      } else {
        resolve(answer);
      }
    });
  }).catch((err) => {
    console.error(`Error getting input: ${err.message}`);
    return undefined;
  });
}
