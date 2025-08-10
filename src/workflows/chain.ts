/**
 * Chain workflow implementation
 * 
 * A Chain workflow executes a sequence of agents in order, passing the output of each agent
 * as input to the next agent in the sequence.
 */
import { BaseAgent } from '../mcpAgent';
import { AgentConfig, AgentType } from '../core/agentTypes';
import { BaseWorkflow } from './workflow';
import { PromptMessageMultipart } from '../core/prompt';
import { messageToString } from '../utils';

export interface ChainConfig extends AgentConfig {
  /**
   * The sequence of agent names to execute in order
   */
  sequence: string[];
  
  /**
   * Whether to include the original input in the chain
   */
  cumulative?: boolean;
}

export class Chain extends BaseWorkflow {
  private sequence: string[] = [];
  private cumulative: boolean = false;
  
  constructor(config: ChainConfig, agents: Record<string, BaseAgent>) {
    super(
      config.name,
      'chain',
      AgentType.CHAIN,
      config
    );
    
    this.sequence = config.sequence || [];
    this.cumulative = config.cumulative || false;
    
    // Validate that all agents in the sequence exist
    for (const agentName of this.sequence) {
      if (!agents[agentName]) {
        throw new Error(`Chain ${this.name} references non-existent agent: ${agentName}`);
      }
      this.agents[agentName] = agents[agentName];
    }
    
    if (this.sequence.length === 0) {
      throw new Error(`Chain ${this.name} requires at least one agent in the sequence`);
    }
  }
  
  async initialize(): Promise<void> {
    // Nothing to initialize for a chain
    return Promise.resolve();
  }
  
  /**
   * Execute the chain with the given input
   * @param input The input to the chain
   * @returns The output of the last agent in the chain
   */
  async execute(
    input: string | PromptMessageMultipart | PromptMessageMultipart[],
  ): Promise<string> {
    const normalize = (m: any) =>
      Array.isArray(m) ? m.map(messageToString).join('\n') : messageToString(m);
    let currentInput = normalize(input);
    let result = '';
    
    for (const agentName of this.sequence) {
      const agent = this.agents[agentName];
      if (!agent) {
        throw new Error(`Agent ${agentName} not found in chain ${this.name}`);
      }
      
      // Send the current input to the agent
      const agentResult = await agent.send(currentInput);
      result = messageToString(agentResult);
      
      // Update the input for the next agent
      if (this.cumulative) {
        // If cumulative, include the original input and all previous outputs
        currentInput = `${normalize(input)}\n\nPrevious step output:\n${result}`;
      } else {
        currentInput = result;
      }
    }

    return result;
  }
  
  /**
   * Start an interactive prompt session with this chain
   * @param defaultPrompt Default message to use when user presses enter
   * @param agentName Optional agent name to start with
   */
  async prompt(defaultPrompt: string = "", agentName?: string): Promise<string> {
    // If an agent name is specified and it exists in the chain, prompt that agent
    if (agentName && this.agents[agentName]) {
      return this.agents[agentName].prompt(defaultPrompt);
    }
    
    // Otherwise, prompt the last agent in the chain
    const lastAgentName = this.sequence[this.sequence.length - 1];
    if (!lastAgentName || !this.agents[lastAgentName]) {
      throw new Error(`Chain ${this.name} has no agents to prompt`);
    }
    
    return this.agents[lastAgentName].prompt(defaultPrompt);
  }
}
