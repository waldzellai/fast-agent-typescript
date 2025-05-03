/**
 * Base interface for all workflow types
 */
import { Agent, BaseAgent } from '../mcpAgent';
import { AgentConfig, AgentType } from '../core/agentTypes';

export interface Workflow extends BaseAgent {
  /**
   * The name of the workflow
   */
  name: string;
  
  /**
   * The type of the workflow
   */
  workflowType: string;
  
  /**
   * The configuration for the workflow
   */
  config: AgentConfig;
  
  /**
   * Initialize the workflow
   */
  initialize(): Promise<void>;
  
  /**
   * Execute the workflow with the given input
   * @param input The input to the workflow
   */
  execute(input: string): Promise<string>;
  
  /**
   * Get the agents used in this workflow
   */
  getAgents(): Record<string, BaseAgent>;
}

/**
 * Base class for all workflow implementations
 */
export abstract class BaseWorkflow implements Workflow {
  name: string;
  workflowType: string;
  agentType: AgentType;
  config: AgentConfig;
  protected agents: Record<string, BaseAgent> = {};
  
  constructor(name: string, workflowType: string, agentType: AgentType, config: AgentConfig) {
    this.name = name;
    this.workflowType = workflowType;
    this.agentType = agentType;
    this.config = config;
  }
  
  abstract initialize(): Promise<void>;
  abstract execute(input: string): Promise<string>;
  
  /**
   * Send a message to the workflow
   * @param message The message to send
   */
  async send(message: string): Promise<string> {
    return this.execute(message);
  }
  
  /**
   * Apply a prompt to the workflow
   * @param promptName The name of the prompt
   * @param args The arguments for the prompt
   */
  async applyPrompt(promptName: string, args: any): Promise<string> {
    throw new Error(`Workflow ${this.name} does not support applying prompts directly`);
  }
  
  /**
   * List available prompts for this workflow
   */
  async listPrompts(): Promise<string[]> {
    // Collect prompts from all agents in the workflow
    const prompts: string[] = [];
    for (const agent of Object.values(this.agents)) {
      prompts.push(...await agent.listPrompts());
    }
    return [...new Set(prompts)]; // Remove duplicates
  }
  
  /**
   * List available resources for this workflow
   */
  async listResources(): Promise<string[]> {
    // Collect resources from all agents in the workflow
    const resources: string[] = [];
    for (const agent of Object.values(this.agents)) {
      resources.push(...await agent.listResources());
    }
    return [...new Set(resources)]; // Remove duplicates
  }
  
  /**
   * Start an interactive prompt session with this workflow
   * @param defaultPrompt Default message to use when user presses enter
   * @param agentName Optional agent name to start with
   */
  async prompt(defaultPrompt: string = "", agentName?: string): Promise<string> {
    // Default implementation delegates to the first agent
    const firstAgent = Object.values(this.agents)[0];
    if (!firstAgent) {
      throw new Error(`Workflow ${this.name} has no agents to prompt`);
    }
    
    return firstAgent.prompt(defaultPrompt, agentName);
  }
  
  /**
   * Get the agents used in this workflow
   */
  getAgents(): Record<string, BaseAgent> {
    return this.agents;
  }
}
