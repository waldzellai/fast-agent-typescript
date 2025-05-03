/**
 * Router workflow implementation
 * 
 * A Router workflow uses an LLM to determine which agent should handle a given input,
 * then routes the input to that agent.
 */
import { Agent, BaseAgent, AugmentedLLMProtocol } from '../mcpAgent';
import { AgentConfig, AgentType } from '../core/agentTypes';
import { BaseWorkflow } from './workflow';

export interface RouterConfig extends AgentConfig {
  /**
   * The names of the agents that this router can route to
   */
  router_agents: string[];
}

export class Router extends BaseWorkflow {
  private routerAgents: string[] = [];
  private routerLLM?: Agent;
  
  constructor(config: RouterConfig, agents: Record<string, BaseAgent>) {
    super(
      config.name,
      'router',
      AgentType.ROUTER,
      config
    );
    
    this.routerAgents = config.router_agents || [];
    
    // Validate that all agents in the router_agents exist
    for (const agentName of this.routerAgents) {
      if (!agents[agentName]) {
        throw new Error(`Router ${this.name} references non-existent agent: ${agentName}`);
      }
      this.agents[agentName] = agents[agentName];
    }
    
    if (this.routerAgents.length === 0) {
      throw new Error(`Router ${this.name} requires at least one agent to route to`);
    }
  }
  
  async initialize(): Promise<void> {
    // Create a router LLM agent to make routing decisions
    this.routerLLM = new Agent({
      name: `${this.name}_router`,
      instruction: this.generateRouterInstruction(),
      agent_type: AgentType.BASIC,
      model: this.config.model,
      use_history: false // Router doesn't need history
    });
    
    // Initialize the router LLM
    await this.routerLLM.initialize();
    
    // If the router has an attachLlm method, call it with a factory function
    if ('attachLlm' in this.routerLLM) {
      await (this.routerLLM as any).attachLlm(() => {
        // This is a placeholder - in a real implementation, you would create an actual LLM
        return {
          send: async (message: string) => {
            // Simple routing logic - in a real implementation, this would use an actual LLM
            // to make a more sophisticated routing decision
            const lowerMessage = message.toLowerCase();
            
            // For each agent, check if its name or a keyword related to its instruction
            // appears in the message
            for (const agentName of this.routerAgents) {
              const agent = this.agents[agentName];
              if (lowerMessage.includes(agentName.toLowerCase())) {
                return agentName;
              }
            }
            
            // Default to the first agent if no match is found
            return this.routerAgents[0];
          },
          applyPrompt: async () => "",
          listPrompts: async () => [],
          listResources: async () => [],
          messageHistory: []
        } as AugmentedLLMProtocol;
      });
    }
  }
  
  /**
   * Generate the instruction for the router LLM
   */
  private generateRouterInstruction(): string {
    let instruction = `You are a router that determines which specialized agent should handle a given query.
Analyze the query and select the most appropriate agent from the following options:

`;
    
    // Add information about each agent
    for (const agentName of this.routerAgents) {
      const agent = this.agents[agentName];
      const agentConfig = (agent as any).config as AgentConfig;
      instruction += `- ${agentName}: ${agentConfig.instruction || 'No description available'}\n`;
    }
    
    instruction += `
Respond ONLY with the name of the selected agent. Do not include any other text in your response.`;
    
    return instruction;
  }
  
  /**
   * Execute the router with the given input
   * @param input The input to route
   * @returns The output of the selected agent
   */
  async execute(input: string): Promise<string> {
    if (!this.routerLLM) {
      throw new Error(`Router ${this.name} has not been initialized`);
    }
    
    // Ask the router LLM which agent should handle this input
    const selectedAgentName = (await this.routerLLM.send(input)).trim();
    
    // Check if the selected agent exists
    if (!this.agents[selectedAgentName]) {
      console.warn(`Router selected non-existent agent: ${selectedAgentName}. Falling back to first agent.`);
      const fallbackAgentName = this.routerAgents[0];
      return this.agents[fallbackAgentName].send(input);
    }
    
    // Route the input to the selected agent
    return this.agents[selectedAgentName].send(input);
  }
}
