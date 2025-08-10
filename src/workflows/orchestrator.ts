/**
 * Orchestrator workflow implementation
 * 
 * An Orchestrator workflow uses an LLM to coordinate a multi-step process involving
 * multiple agents. The orchestrator decides which agent to call at each step and
 * what to do with the results.
 */
import { Agent, BaseAgent } from '../mcpAgent';
import { AgentConfig, AgentType } from '../core/agentTypes';
import { BaseWorkflow } from './workflow';
import { getModelFactory } from '../core/directFactory';
import { messageToString } from '../utils';

export interface AgentTask {
  description: string;
  agent: string;
  result?: string;
}

export interface Step {
  description: string;
  tasks: AgentTask[];
}

export interface Plan {
  steps: Step[];
  is_complete: boolean;
}

export interface NextStep {
  description: string;
  tasks: AgentTask[];
  is_complete: boolean;
}

export interface TaskResult {
  agent: string;
  description: string;
  result: string;
}

export interface StepResult {
  description: string;
  task_results: TaskResult[];
}

export interface PlanResult {
  step_results: StepResult[];
  is_complete: boolean;
  max_iterations_reached?: boolean;
}

export interface OrchestratorConfig extends AgentConfig {
  /**
   * The names of the agents that this orchestrator can use
   */
  orchestrator_agents: string[];
  
  /**
   * Maximum number of steps the orchestrator can take
   */
  max_steps?: number;

  /**
   * Planning mode: 'full' for upfront plan or 'iterative' for step-by-step
   */
  plan_type?: 'full' | 'iterative';
}

export class Orchestrator extends BaseWorkflow {
  private orchestratorAgents: string[] = [];
  private maxSteps: number = 10; // Default to 10 steps
  private orchestratorLLM?: Agent;
  private planType: 'full' | 'iterative' = 'full';
  planResult: PlanResult | null = null;
  
  constructor(config: OrchestratorConfig, agents: Record<string, BaseAgent>) {
    super(
      config.name,
      'orchestrator',
      AgentType.ORCHESTRATOR, // Pass agentType
      config // Pass config
    );
    
    this.orchestratorAgents = config.orchestrator_agents || [];
    this.maxSteps = config.max_steps || 10;
    this.planType = config.plan_type || 'full';
    
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
    // Attach real LLM
    if ('attachLlm' in this.orchestratorLLM) {
      const factory = getModelFactory(
        (this.orchestratorLLM as any).context || {},
        this.config.model,
      );
      await (this.orchestratorLLM as any).attachLlm(factory as any);
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

    for (const agentName of this.orchestratorAgents) {
      const agent = this.agents[agentName];
      const agentConfig = (agent as any).config as AgentConfig;
      instruction += `- ${agentName}: ${agentConfig.instruction || 'No description available'}\n`;
    }

    instruction += `
When planning, respond with JSON. For a full plan respond with {"steps": [{"description": str, "tasks": [{"description": str, "agent": str}]}], "is_complete": bool}.
For iterative planning respond with {"description": str, "tasks": [{"description": str, "agent": str}], "is_complete": bool}.`;

    return instruction;
  }

  private async _get_full_plan(request: string): Promise<Plan> {
    if (!this.orchestratorLLM) {
      throw new Error('Orchestrator not initialized');
    }
    const resp = await this.orchestratorLLM.send(
      `Create a complete plan for the following request. Respond with JSON.\n${request}`,
    );
    const text = messageToString(resp);
    return JSON.parse(text);
  }

  private async _get_next_step(
    request: string,
    previousSteps: StepResult[],
  ): Promise<NextStep> {
    if (!this.orchestratorLLM) {
      throw new Error('Orchestrator not initialized');
    }
    const summary = previousSteps
      .map((s, i) => {
        const tasks = s.task_results
          .map((t) => `${t.agent}: ${t.result}`)
          .join('; ');
        return `Step ${i + 1} (${s.description}): ${tasks}`;
      })
      .join('\n');
    const prompt = `Given the task: ${request}\nPrevious steps:\n${summary}\nProvide the next step as JSON.`;
    const resp = await this.orchestratorLLM.send(prompt);
    const text = messageToString(resp);
    return JSON.parse(text);
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

    this.planResult = { step_results: [], is_complete: false };

    if (this.planType === 'full') {
      const plan = await this._get_full_plan(input);
      for (const step of plan.steps) {
        const stepRes: StepResult = { description: step.description, task_results: [] };
        for (const task of step.tasks) {
          const agent = this.agents[task.agent];
          if (!agent) {
            stepRes.task_results.push({
              agent: task.agent,
              description: task.description,
              result: `ERROR: Agent ${task.agent} not found`,
            });
            continue;
          }
          const result = await agent.send(task.description);
          stepRes.task_results.push({
            agent: task.agent,
            description: task.description,
            result: messageToString(result),
          });
        }
        this.planResult.step_results.push(stepRes);
      }
      this.planResult.is_complete = plan.is_complete;
    } else {
      let iterations = 0;
      while (iterations < this.maxSteps) {
        iterations++;
        const next = await this._get_next_step(input, this.planResult.step_results);
        const stepRes: StepResult = { description: next.description, task_results: [] };
        for (const task of next.tasks) {
          const agent = this.agents[task.agent];
          if (!agent) {
            stepRes.task_results.push({
              agent: task.agent,
              description: task.description,
              result: `ERROR: Agent ${task.agent} not found`,
            });
            continue;
          }
          const result = await agent.send(task.description);
          stepRes.task_results.push({
            agent: task.agent,
            description: task.description,
            result: messageToString(result),
          });
        }
        this.planResult.step_results.push(stepRes);
        if (next.is_complete) {
          this.planResult.is_complete = true;
          break;
        }
      }
      if (!this.planResult.is_complete) {
        this.planResult.max_iterations_reached = true;
      }
    }

    const summary = this.planResult.step_results
      .map(
        (s, i) =>
          `Step ${i + 1} (${s.description}): ` +
          s.task_results.map((t) => `${t.agent}: ${t.result}`).join('; '),
      )
      .join('\n');
    const finalResp = await this.orchestratorLLM.send(
      `Task: ${input}\nResults:\n${summary}\nProvide final answer.`,
    );
    return messageToString(finalResp);
  }
}
