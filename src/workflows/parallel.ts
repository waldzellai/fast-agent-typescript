/**
 * Parallel workflow implementation
 * 
 * A Parallel workflow executes multiple agents in parallel, then optionally
 * aggregates their results using a fan-in agent.
 */
import { Agent, BaseAgent } from '../mcpAgent';
import { AgentConfig, AgentType } from '../core/agentTypes';
import { BaseWorkflow } from './workflow';
import { getModelFactory } from '../core/directFactory';
import { PromptMessageMultipart } from '../core/prompt';
import { messageToString } from '../utils';

export interface ParallelConfig extends AgentConfig {
  /**
   * The names of the agents to execute in parallel (fan-out)
   */
  fan_out: string[];
  
  /**
   * The name of the agent to aggregate results (fan-in)
   * If not provided, results will be returned as-is
   */
  fan_in?: string;
  
  /**
   * Whether to include the original request in the fan-in message
   */
  include_request?: boolean;
}

export class Parallel extends BaseWorkflow {
  private fanOut: string[] = [];
  private fanIn?: string;
  private includeRequest: boolean = true;
  private defaultFanInAgent?: Agent;
  
  constructor(config: ParallelConfig, agents: Record<string, BaseAgent>) {
    super(
      config.name,
      'parallel',
      AgentType.PARALLEL,
      config
    );
    
    this.fanOut = config.fan_out || [];
    this.fanIn = config.fan_in;
    this.includeRequest = config.include_request !== false; // Default to true
    
    // Validate that all fan-out agents exist
    for (const agentName of this.fanOut) {
      if (!agents[agentName]) {
        throw new Error(`Parallel workflow ${this.name} references non-existent fan-out agent: ${agentName}`);
      }
      this.agents[agentName] = agents[agentName];
    }
    
    // Validate that the fan-in agent exists if provided
    if (this.fanIn && !agents[this.fanIn]) {
      throw new Error(`Parallel workflow ${this.name} references non-existent fan-in agent: ${this.fanIn}`);
    } else if (this.fanIn) {
      this.agents[this.fanIn] = agents[this.fanIn];
    }
    
    if (this.fanOut.length === 0) {
      throw new Error(`Parallel workflow ${this.name} requires at least one fan-out agent`);
    }
  }
  
  async initialize(): Promise<void> {
    // If no fan-in agent is provided, create a default one
    if (!this.fanIn) {
      const defaultFanInName = `${this.name}_default_fan_in`;
      this.defaultFanInAgent = new Agent({
        name: defaultFanInName,
        instruction:
          'You are a passthrough agent that combines outputs from parallel agents.',
        agent_type: AgentType.BASIC,
        model: this.config.model,
        use_history: false,
      });

      await this.defaultFanInAgent.initialize();
      if ('attachLlm' in this.defaultFanInAgent) {
        const factory = getModelFactory(
          (this.defaultFanInAgent as any).context || {},
          this.config.model || undefined,
        );
        await (this.defaultFanInAgent as any).attachLlm(factory as any);
      }

      this.agents[defaultFanInName] = this.defaultFanInAgent;
      this.fanIn = defaultFanInName;
    }
  }
  
  /**
   * Execute the parallel workflow with the given input
   * @param input The input to the workflow
   * @returns The aggregated output of the fan-out agents
   */
  async execute(
    input: string | PromptMessageMultipart | PromptMessageMultipart[],
  ): Promise<string> {
    const normalize = (m: any) =>
      Array.isArray(m) ? m.map(messageToString).join('\n') : messageToString(m);
    const normalizedInput = normalize(input);

    const fanOutPromises = this.fanOut.map(async (agentName) => {
      const agent = this.agents[agentName];
      if (!agent) {
        throw new Error(`Agent ${agentName} not found in parallel workflow ${this.name}`);
      }

      try {
        const result = await agent.send(normalizedInput);
        return { agentName, result: messageToString(result) };
      } catch (error) {
        console.error(
          `Error executing agent ${agentName} in parallel workflow ${this.name}:`,
          error,
        );
        return {
          agentName,
          result: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    });

    const fanOutResults = await Promise.all(fanOutPromises);
    
    // If there's no fan-in agent, return the results as-is
    if (!this.fanIn) {
      return fanOutResults
        .map(({ agentName, result }) => `${agentName}:\n${result}`)
        .join('\n\n');
    }
    
    // Otherwise, use the fan-in agent to aggregate the results
    const fanInAgent = this.agents[this.fanIn];
    if (!fanInAgent) {
      throw new Error(`Fan-in agent ${this.fanIn} not found in parallel workflow ${this.name}`);
    }
    
    // Prepare the fan-in message
    let fanInMessage = '';
    
    if (this.includeRequest) {
      fanInMessage += `Original request: ${normalizedInput}\n\n`;
    }
    
    fanInMessage += 'Agent results:\n\n';
    
    for (const { agentName, result } of fanOutResults) {
      fanInMessage += `${agentName}:\n${result}\n\n`;
    }

    const fanInResult = await fanInAgent.send(fanInMessage);
    return messageToString(fanInResult);
  }
}
