/**
 * Agent implementation using the clean BaseAgent adapter.
 *
 * This provides a streamlined implementation that adheres to AgentProtocol
 * while delegating LLM operations to an attached AugmentedLLMProtocol instance.
 */

import { AgentConfig, AgentType } from './core/agentTypes';
import { PromptMessageMultipart } from './core/prompt';
import { ConsoleProgressDisplay } from './logging/consoleProgressDisplay';

// Placeholder types and interfaces for missing imports
export interface BaseAgent {
  name: string;
  agentType: AgentType;
  send(
    message: string | PromptMessageMultipart | PromptMessageMultipart[]
  ): Promise<string>;
  /**
   * Backward compatibility: some code/tests use `generate` instead of `send`.
   * We keep it optional so newer codebases can rely solely on `send`.
   */
  generate?(
    message: string | PromptMessageMultipart | PromptMessageMultipart[]
  ): Promise<string>;
  applyPrompt(promptName: string, args: any): Promise<string>;
  listPrompts(): Promise<string[]>;
  prompt(defaultPrompt?: string, agentName?: string): Promise<string>;
  listResources(): Promise<string[]>;
  withResource(
    prompt: string,
    resourceUri: string,
    serverName: string
  ): Promise<string>;
  attachLlm?(llmFactory: () => AugmentedLLMProtocol): Promise<void>; // Add optional attachLlm method
}

export class InteractivePrompt {
  private agentTypes: Record<string, AgentType>;
  private currentAgent: string = '';

  constructor(options: { agentTypes: Record<string, AgentType> }) {
    this.agentTypes = options.agentTypes || {};
  }

  async promptLoop(
    sendFunc: (message: string, agentName: string) => Promise<string>,
    defaultAgent: string,
    availableAgents: string[],
    applyPromptFunc: (
      promptName: string,
      args: any,
      agentName: string
    ) => Promise<string>,
    listPromptsFunc: (agentName: string) => Promise<string[]>,
    defaultPrompt: string
  ): Promise<string> {
    // Initialize with default agent
    this.currentAgent = defaultAgent;
    let lastResponse = '';
    let running = true;

    console.log(
      `\nInteractive prompt session with agent: ${this.currentAgent}`
    );
    console.log('Type "/help" for available commands, "STOP" to exit.');

    while (running) {
      try {
        // Get input from user with enhanced prompt features
        const input = await this.getInput(this.currentAgent, {
          defaultValue: defaultPrompt,
          showDefault: true,
          availableAgentNames: availableAgents,
          agentTypes: this.agentTypes,
        });

        // Handle special commands and agent switching
        if (typeof input === 'string') {
          if (input.toUpperCase() === 'STOP') {
            console.log('Stopping interactive session.');
            running = false;
            continue;
          }

          if (input.startsWith('SWITCH:')) {
            const newAgent = input.substring(7).trim();
            if (availableAgents.includes(newAgent)) {
              this.currentAgent = newAgent;
              console.log(`Switched to agent: ${this.currentAgent}`);
              continue;
            } else {
              console.log(
                `Agent '${newAgent}' not found. Available agents: ${availableAgents.join(', ')}`
              );
              continue;
            }
          }

          if (input === 'HELP') {
            this.showHelp();
            continue;
          }

          if (input === 'CLEAR') {
            console.clear();
            continue;
          }

          if (input === 'LIST_AGENTS') {
            console.log('\nAvailable Agents:');
            availableAgents.forEach((agent) => {
              console.log(`  ${agent} (Agent)`);
            });
            continue;
          }
        }

        // Handle prompt selection
        if (typeof input === 'object' && input.select_prompt) {
          const prompts = await listPromptsFunc(this.currentAgent);
          if (prompts.length === 0) {
            console.log('No prompts available for this agent.');
            continue;
          }

          let selectedPrompt: string | undefined;
          if (input.prompt_name) {
            // Find by name
            selectedPrompt = prompts.find(
              (p) => p.toLowerCase() === input.prompt_name?.toLowerCase()
            );
            if (!selectedPrompt) {
              console.log(`Prompt '${input.prompt_name}' not found.`);
              continue;
            }
          } else if (input.prompt_index !== undefined) {
            // Find by index
            if (
              input.prompt_index >= 0 &&
              input.prompt_index < prompts.length
            ) {
              selectedPrompt = prompts[input.prompt_index];
            } else {
              console.log(
                `Invalid prompt index: ${input.prompt_index}. Valid range: 0-${prompts.length - 1}`
              );
              continue;
            }
          } else {
            // Show list of prompts for selection
            console.log('\nAvailable Prompts:');
            prompts.forEach((prompt, index) => {
              console.log(`  ${index}: ${prompt}`);
            });

            // Get user selection
            const selection = await this.getPromptSelection(prompts.length);
            if (selection === null) {
              console.log('Prompt selection cancelled.');
              continue;
            }
            selectedPrompt = prompts[selection];
          }

          if (selectedPrompt) {
            // Get prompt arguments if needed
            const args = await this.getPromptArguments(selectedPrompt);
            if (args === null) {
              console.log('Prompt application cancelled.');
              continue;
            }

            // Apply the prompt
            try {
              console.log(`Applying prompt: ${selectedPrompt}`);
              lastResponse = await applyPromptFunc(
                selectedPrompt,
                args,
                this.currentAgent
              );
              console.log('\nResponse:');
              console.log(lastResponse);
            } catch (error) {
              console.error(
                `Error applying prompt: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }
          continue;
        }

        // Send regular message to agent
        if (typeof input === 'string' && input.trim() !== '') {
          try {
            console.log(`Sending message to ${this.currentAgent}...`);
            lastResponse = await sendFunc(input, this.currentAgent);
            console.log('\nResponse:');
            console.log(lastResponse);
          } catch (error) {
            console.error(
              `Error sending message: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'PromptExitError') {
          console.log('Exiting interactive session.');
          running = false;
        } else {
          console.error(
            `Error in prompt loop: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    return lastResponse;
  }

  private async getInput(
    agentName: string,
    _options: any
  ): Promise<
    | string
    | { select_prompt: boolean; prompt_name?: string; prompt_index?: number }
  > {
    // This is a simplified version - in a real implementation, you would use the getEnhancedInput function
    // from enhancedPrompt.ts
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const promptText = `${agentName} > `;

    return new Promise((resolve) => {
      rl.question(promptText, (answer: string) => {
        rl.close();

        // Basic command processing
        if (answer.startsWith('/')) {
          const parts = answer.slice(1).trim().split(/\s+/, 2);
          const cmd = parts[0].toLowerCase();

          if (cmd === 'help') resolve('HELP');
          else if (cmd === 'clear') resolve('CLEAR');
          else if (cmd === 'agents') resolve('LIST_AGENTS');
          else if (cmd === 'prompts') resolve({ select_prompt: true });
          else if (cmd === 'prompt' && parts.length > 1) {
            const promptArg = parts[1].trim();
            if (/^\d+$/.test(promptArg)) {
              resolve({
                select_prompt: true,
                prompt_index: parseInt(promptArg, 10),
              });
            } else {
              resolve({ select_prompt: true, prompt_name: promptArg });
            }
          } else if (cmd === 'exit') resolve('EXIT');
          else if (cmd === 'stop') resolve('STOP');
          else resolve(answer);
        } else if (answer.startsWith('@')) {
          resolve(`SWITCH:${answer.slice(1).trim()}`);
        } else if (answer.toUpperCase() === 'STOP') {
          resolve('STOP');
        } else {
          resolve(answer);
        }
      });
    });
  }

  private showHelp(): void {
    console.log('\nAvailable Commands:');
    console.log('  /help          - Show this help');
    console.log('  /clear         - Clear screen');
    console.log('  /agents        - List available agents');
    console.log('  /prompts       - List and select MCP prompts');
    console.log('  /prompt <name> - Apply a specific prompt by name');
    console.log('  @agent_name    - Switch to agent');
    console.log('  STOP           - Exit interactive session');
  }

  private async getPromptSelection(
    promptCount: number
  ): Promise<number | null> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        'Enter prompt number (or empty to cancel): ',
        (answer: string) => {
          rl.close();
          if (!answer.trim()) {
            resolve(null);
            return;
          }

          const index = parseInt(answer.trim(), 10);
          if (isNaN(index) || index < 0 || index >= promptCount) {
            console.log(
              `Invalid selection. Please enter a number between 0 and ${promptCount - 1}.`
            );
            resolve(null);
          } else {
            resolve(index);
          }
        }
      );
    });
  }

  private async getPromptArguments(
    _promptName: string
  ): Promise<Record<string, any> | null> {
    // In a real implementation, you would query the prompt for its required arguments
    // For now, we'll just return an empty object
    return {};
  }
}

export type HumanInputCallback = (input: string) => Promise<string>;

// Re-export the structured logger for external modules
export { createLogger as getLogger, Logger };

export interface Context {
  config?: {
    default_model?: string;
    mcp?: {
      servers?: Record<string, any>;
    };
  };
  progress_reporter?: (progress: number, total?: number) => Promise<void>;
}

/**
 * An Agent is an entity that has access to a set of MCP servers and can interact with them.
 * Each agent should have a purpose defined by its instruction.
 *
 * This implementation provides a clean adapter that adheres to AgentProtocol
 * while delegating LLM operations to an attached AugmentedLLMProtocol instance.
 */
export class Agent implements BaseAgent {
  name: string;
  agentType: AgentType;
  private _llm?: AugmentedLLMProtocol;
  private _context?: Context;
  private _humanInputCallback?: HumanInputCallback;
  private _config: AgentConfig;

  constructor(
    config: AgentConfig | string, // Can be AgentConfig or backward compatible string name
    _functions?: Array<(...args: any[]) => any>,
    _connectionPersistence: boolean = true,
    humanInputCallback?: HumanInputCallback,
    context?: Context
  ) {
    // Initialize properties
    if (typeof config === 'string') {
      this.name = config;
      this._config = {
        name: config,
        instruction: 'You are a helpful agent.',
        agent_type: AgentType.BASIC,
        use_history: true,
        servers: [],
        human_input: false,
      };
      this.agentType = AgentType.BASIC;
    } else {
      this.name = config.name;
      this._config = {
        ...config,
        instruction: config.instruction || 'You are a helpful agent.',
        agent_type: config.agent_type || AgentType.BASIC,
        use_history:
          config.use_history !== undefined ? config.use_history : true,
        servers: config.servers || [],
        human_input: config.human_input || false,
      };
      this.agentType =
        (config.agent_type as unknown as AgentType) || AgentType.BASIC;
    }

    this._humanInputCallback = humanInputCallback;
    this._context = context;

    if (this._context && !this._context.progress_reporter) {
      const display = new ConsoleProgressDisplay();
      this._context.progress_reporter = async (
        progress: number,
        total?: number,
      ): Promise<void> => {
        display.report(progress, total);
      };
    }
  }

  /**
   * Initialize the agent and prepare it for use.
   * This is called automatically when needed.
   */
  async initialize(): Promise<void> {
    // Initialization logic can be added here
    // For example, setting up connections to MCP servers
    return Promise.resolve();
  }

  /**
   * Attach an LLM to this agent for handling requests.
   * @param llmFactory Factory function to create the LLM instance
   */
  async attachLlm(llmFactory: () => AugmentedLLMProtocol): Promise<void> {
    // Call the factory to get the LLM instance and store it
    this._llm = llmFactory();
  }

  /**
   * Send a message to the agent and get a response.
   * @param message The message to send
   * @returns The agent's response
   */
  async send(
    message: string | PromptMessageMultipart | PromptMessageMultipart[]
  ): Promise<string> {
    if (!this._llm) {
      throw new Error(
        `Agent ${this.name} has no LLM attached. Call attachLlm() first.`
      );
    }

    try {
      // Normalize message to a string for downstream LLMs
      let normalizedMessage: string;
      if (typeof message === 'string') {
        normalizedMessage = message;
      } else {
        // Basic conversion for now – callers can pass richer structures but they are JSON stringified here.
        normalizedMessage = JSON.stringify(message);
      }

      // If human input is enabled and callback is provided, use it
      if (this._config.human_input && this._humanInputCallback) {
        const humanResponse = await this._humanInputCallback(normalizedMessage);
        return humanResponse;
      }

      // Otherwise, use the LLM
      return await this._llm.send(normalizedMessage);
    } catch (error) {
      console.error(`Error sending message to agent ${this.name}:`, error);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Alias method to support legacy `generate` calls
   */
  async generate(
    message: string | PromptMessageMultipart | PromptMessageMultipart[]
  ): Promise<string> {
    // Simply forward to send()
    return await this.send(message as any);
  }

  /**
   * Apply a specific prompt template with arguments.
   * @param promptName The name of the prompt template
   * @param args Arguments to pass to the prompt template
   * @returns The result of applying the prompt
   */
  async applyPrompt(promptName: string, args: any): Promise<string> {
    if (!this._llm) {
      throw new Error(
        `Agent ${this.name} has no LLM attached. Call attachLlm() first.`
      );
    }

    try {
      return await this._llm.applyPrompt(promptName, args);
    } catch (error) {
      console.error(
        `Error applying prompt ${promptName} to agent ${this.name}:`,
        error
      );
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * List available prompts for this agent.
   * @returns Array of prompt names
   */
  async listPrompts(): Promise<string[]> {
    if (!this._llm) {
      return [];
    }

    try {
      return await this._llm.listPrompts();
    } catch (error) {
      console.error(`Error listing prompts for agent ${this.name}:`, error);
      return [];
    }
  }

  /**
   * List available resources for this agent.
   * @returns Array of resource names
   */
  async listResources(): Promise<string[]> {
    if (!this._llm) {
      return [];
    }

    try {
      return await this._llm.listResources();
    } catch (error) {
      console.error(`Error listing resources for agent ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Send a prompt along with a resource URI to the agent.
   * @param prompt The prompt message
   * @param resourceUri The URI of the resource to include
   * @param serverName The name of the server providing the resource
   * @returns The agent's response
   */
  async withResource(
    prompt: string,
    resourceUri: string,
    serverName: string
  ): Promise<string> {
    if (!this._llm) {
      throw new Error(
        `Agent ${this.name} has no LLM attached. Call attachLlm() first.`
      );
    }
    // Assuming the attached LLM has a withResource method or similar
    // If not, this needs adjustment based on AugmentedLLMProtocol definition
    if (typeof (this._llm as any).withResource === 'function') {
      try {
        // Delegate to the LLM's withResource method if it exists
        return await (this._llm as any).withResource(
          prompt,
          resourceUri,
          serverName
        );
      } catch (error) {
        console.error(
          `Error using resource ${resourceUri} with agent ${this.name}:`,
          error
        );
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      // Fallback or error if the LLM doesn't support withResource
      console.warn(
        `LLM attached to agent ${this.name} does not support withResource. Sending prompt without resource.`
      );
      // Send the prompt and mention the unprocessed resource URI
      return this.send(
        `${prompt}\n\nResource URI (unprocessed): ${resourceUri}`
      );
      // Alternatively, throw an error:
      // throw new Error(`LLM for agent ${this.name} does not support withResource`);
    }
  }

  /**
   * Start an interactive prompt session with this agent.
   * @param defaultPrompt Default message to use when user presses enter
   * @param _agentName Ignored for single agents, included for API compatibility
   * @returns The result of the interactive session
   */
  async prompt(
    defaultPrompt: string = '',
    _agentName?: string
  ): Promise<string> {
    // Use the agent name as a string - ensure it's not the object itself
    const agentNameStr: string = String(this.name);

    // Create agentTypes dictionary with just this agent
    const agentTypes: Record<string, AgentType> = {
      [agentNameStr]: this.agentType,
    };

    // Create the interactive prompt
    const prompt = new InteractivePrompt({ agentTypes });

    // Define wrapper for send function
    const sendWrapper = async (
      message: string,
      _agentName: string
    ): Promise<string> => {
      return await this.send(message);
    };

    // Define wrapper for applyPrompt function
    const applyPromptWrapper = async (
      promptName: string,
      args: any,
      _agentName: string
    ): Promise<string> => {
      // Just apply the prompt directly
      return await this.applyPrompt(promptName, args);
    };

    // Define wrapper for listPrompts function
    const listPromptsWrapper = async (
      _agentName: string
    ): Promise<string[]> => {
      // Always call listPrompts on this agent regardless of agentName
      return await this.listPrompts();
    };

    // Start the prompt loop with just this agent
    return await prompt.promptLoop(
      sendWrapper,
      agentNameStr,
      [agentNameStr], // Only this agent
      applyPromptWrapper,
      listPromptsWrapper,
      defaultPrompt
    );
  }

  /**
   * Get the agent's configuration.
   * @returns The agent's configuration
   */
  get config(): AgentConfig {
    return this._config;
  }

  /**
   * Get the agent's context.
   * @returns The agent's context
   */
  get context(): Context | undefined {
    return this._context;
  }
}
