/**
 * Orchestrator workflow implementation
 * 
 * An Orchestrator workflow uses an LLM to coordinate a multi-step process involving
 * multiple agents. The orchestrator decides which agent to call at each step and
 * what to do with the results.
 */
import { Agent, BaseAgent, AugmentedLLMProtocol } from '../mcpAgent';
import { AgentConfig, AgentType } from '../core/agentTypes';
import { BaseWorkflow } from './workflow';

export interface OrchestratorConfig extends AgentConfig {
  /**
   * The names of the agents that this orchestrator can use
   */
  orchestrator_agents: string[];
  
  /**
   * Maximum number of steps the orchestrator can take
   */
  max_steps?: number;
}

export class Orchestrator extends BaseWorkflow {
  private orchestratorAgents: string[] = [];
  private maxSteps: number = 10; // Default to 10 steps
  private orchestratorLLM?: Agent;
  
  constructor(config: OrchestratorConfig, agents: Record<string, BaseAgent>) {
    super(
      config.name,
      'orchestrator',
      AgentType.ORCHESTRATOR, // Pass agentType
      config // Pass config
    );
    
    this.orchestratorAgents = config.orchestrator_agents || [];
    this.maxSteps = config.max_steps || 10;
    
    // Validate that all agents in the orchestrator_agents exist
    for (const agentName of this.orchestratorAgents) {
      if (!agents[agentName]) {
        throw new Error(`Orchestrator ${this.name} references non-existent agent: ${agentName}`);
      }
      this.agents[agentName] = agents[agentName];
    }
    
    if (this.orchestratorAgents.length === 0) {
      throw new Error(`Orchestrator ${this.name} requires at least one agent to orchestrate`);
    }
  }
  
  async initialize(): Promise<void> {
    // Create an orchestrator LLM agent to make orchestration decisions
    this.orchestratorLLM = new Agent({
      name: `${this.name}_orchestrator`,
      instruction: this.generateOrchestratorInstruction(),
      agent_type: AgentType.BASIC,
      model: this.config.model,
      use_history: true // Orchestrator needs history to track the conversation
    });
    
    // Initialize the orchestrator LLM
    await this.orchestratorLLM.initialize();
    
    // If the orchestrator has an attachLlm method, call it with a factory function
    if ('attachLlm' in this.orchestratorLLM) {
      await (this.orchestratorLLM as any).attachLlm(() => {
        // This is a placeholder - in a real implementation, you would create an actual LLM
        return {
          send: async (message: string) => {
            // Simple orchestration logic - in a real implementation, this would use an actual LLM
            // to make more sophisticated orchestration decisions
            
            // Parse the message to extract the command
            const lines = message.split('\n');
            const commandLine = lines.find(line => line.startsWith('COMMAND:'));
            
            if (!commandLine) {
              return 'FINISH: I need to make a decision. Please provide a command in the format COMMAND: agent_name or COMMAND: FINISH.';
            }
            
            const command = commandLine.substring('COMMAND:'.length).trim();
            
            if (command === 'FINISH') {
              return 'FINISH: Task completed successfully.';
            }
            
            // Check if the command is a valid agent name
            if (this.orchestratorAgents.includes(command)) {
              // Extract the message for the agent
              const messageLine = lines.find(line => line.startsWith('MESSAGE:'));
              const agentMessage = messageLine ? messageLine.substring('MESSAGE:'.length).trim() : 'Please help with this task.';
              
              // Call the agent
              try {
                const agent = this.agents[command];
                const result = await agent.send(agentMessage);
                return `RESULT from ${command}:\n${result}\n\nWhat's the next step? Use COMMAND: agent_name or COMMAND: FINISH.`;
              } catch (error) {
                return `ERROR calling ${command}: ${error instanceof Error ? error.message : String(error)}\n\nWhat's the next step? Use COMMAND: agent_name or COMMAND: FINISH.`;
              }
            } else {
              return `ERROR: Agent "${command}" not found. Available agents: ${this.orchestratorAgents.join(', ')}\n\nWhat's the next step? Use COMMAND: agent_name or COMMAND: FINISH.`;
            }
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
   * Generate the instruction for the orchestrator LLM
   */
  private generateOrchestratorInstruction(): string {
    let instruction = `You are an orchestrator that coordinates a multi-step process involving multiple specialized agents.
Your job is to break down complex tasks into smaller steps, decide which agent should handle each step, and integrate the results.

Available agents:
`;
    
    // Add information about each agent
    for (const agentName of this.orchestratorAgents) {
      const agent = this.agents[agentName];
      const agentConfig = (agent as any).config as AgentConfig;
      instruction += `- ${agentName}: ${agentConfig.instruction || 'No description available'}\n`;
    }
    
    instruction += `
To use an agent, respond with:
COMMAND: agent_name
MESSAGE: your message to the agent

When you've completed the task, respond with:
COMMAND: FINISH
MESSAGE: your final response

You can take a maximum of ${this.maxSteps} steps to complete a task.`;
    
    return instruction;
  }
  
  /**
   * Execute the orchestrator with the given input
   * @param input The input to orchestrate
   * @returns The final output after orchestration
   */
  async execute(input: string): Promise<string> {
    if (!this.orchestratorLLM) {
      throw new Error(`Orchestrator ${this.name} has not been initialized`);
    }
    
    // Start the orchestration process
    let currentMessage = `I need your help with the following task:\n\n${input}\n\nWhat's the first step?`;
    let steps = 0;
    
    while (steps < this.maxSteps) {
      steps++;
      
      // Send the current message to the orchestrator
      const response = await this.orchestratorLLM.send(currentMessage);
      
      // Check if the orchestrator is finished
      if (response.includes('COMMAND: FINISH') || response.startsWith('FINISH:')) {
        // Extract the final message
        const finalMessage = response.includes('MESSAGE:') 
          ? response.split('MESSAGE:')[1].trim()
          : response.startsWith('FINISH:')
            ? response.substring('FINISH:'.length).trim()
            : response;
        
        return finalMessage;
      }
      
      // Update the current message with the orchestrator's response
      currentMessage = response;
    }
    
    // If we've reached the maximum number of steps, return a timeout message
    return `Orchestration timed out after ${this.maxSteps} steps. Last state: ${currentMessage}`;
  }
}
