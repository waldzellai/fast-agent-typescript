/**
 * Evaluator-Optimizer workflow implementation
 * 
 * An Evaluator-Optimizer workflow uses an evaluator agent to assess the quality of a response
 * from a worker agent, and an optimizer agent to improve the response if needed.
 */
import { Agent, BaseAgent, AugmentedLLMProtocol } from '../mcpAgent';
import { AgentConfig, AgentType } from '../core/agentTypes';
import { BaseWorkflow } from './workflow';

export interface EvaluatorOptimizerConfig extends AgentConfig {
  /**
   * The name of the worker agent that generates the initial response
   */
  worker: string;
  
  /**
   * The name of the evaluator agent that assesses the quality of the response
   */
  evaluator: string;
  
  /**
   * The name of the optimizer agent that improves the response if needed
   */
  optimizer: string;
  
  /**
   * The minimum score (0-10) required to accept a response without optimization
   */
  min_score?: number;
  
  /**
   * The maximum number of optimization iterations
   */
  max_iterations?: number;
}

export class EvaluatorOptimizer extends BaseWorkflow {
  private worker: string;
  private evaluator: string;
  private optimizer: string;
  private minScore: number = 7; // Default to 7 out of 10
  private maxIterations: number = 3; // Default to 3 iterations
  
  constructor(config: EvaluatorOptimizerConfig, agents: Record<string, BaseAgent>) {
    super(
      config.name,
      'evaluator_optimizer',
      {
        ...config,
        agent_type: AgentType.EVALUATOR_OPTIMIZER
      }
    );
    
    this.worker = config.worker;
    this.evaluator = config.evaluator;
    this.optimizer = config.optimizer;
    this.minScore = config.min_score || 7;
    this.maxIterations = config.max_iterations || 3;
    
    // Validate that all required agents exist
    if (!agents[this.worker]) {
      throw new Error(`EvaluatorOptimizer ${this.name} references non-existent worker agent: ${this.worker}`);
    }
    if (!agents[this.evaluator]) {
      throw new Error(`EvaluatorOptimizer ${this.name} references non-existent evaluator agent: ${this.evaluator}`);
    }
    if (!agents[this.optimizer]) {
      throw new Error(`EvaluatorOptimizer ${this.name} references non-existent optimizer agent: ${this.optimizer}`);
    }
    
    // Add the agents to the workflow
    this.agents[this.worker] = agents[this.worker];
    this.agents[this.evaluator] = agents[this.evaluator];
    this.agents[this.optimizer] = agents[this.optimizer];
  }
  
  async initialize(): Promise<void> {
    // Nothing to initialize for an evaluator-optimizer workflow
    return Promise.resolve();
  }
  
  /**
   * Execute the evaluator-optimizer workflow with the given input
   * @param input The input to the workflow
   * @returns The optimized output
   */
  async execute(input: string): Promise<string> {
    // Get the worker agent
    const workerAgent = this.agents[this.worker];
    if (!workerAgent) {
      throw new Error(`Worker agent ${this.worker} not found in evaluator-optimizer workflow ${this.name}`);
    }
    
    // Get the evaluator agent
    const evaluatorAgent = this.agents[this.evaluator];
    if (!evaluatorAgent) {
      throw new Error(`Evaluator agent ${this.evaluator} not found in evaluator-optimizer workflow ${this.name}`);
    }
    
    // Get the optimizer agent
    const optimizerAgent = this.agents[this.optimizer];
    if (!optimizerAgent) {
      throw new Error(`Optimizer agent ${this.optimizer} not found in evaluator-optimizer workflow ${this.name}`);
    }
    
    // Generate the initial response from the worker
    let currentResponse = await workerAgent.send(input);
    let iterations = 0;
    
    while (iterations < this.maxIterations) {
      // Evaluate the current response
      const evaluationPrompt = `
Original request: ${input}

Response to evaluate:
${currentResponse}

Evaluate the quality of this response on a scale of 0-10, where 10 is perfect.
First, provide a score as a single number between 0 and 10.
Then, provide a brief explanation of your evaluation, including specific areas for improvement.

Format your response as:
SCORE: [number]
EVALUATION: [your evaluation]
`;
      
      const evaluationResult = await evaluatorAgent.send(evaluationPrompt);
      
      // Parse the score from the evaluation
      const scoreMatch = evaluationResult.match(/SCORE:\s*(\d+(\.\d+)?)/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
      
      // If the score is above the minimum, we're done
      if (score >= this.minScore) {
        console.log(`Response achieved score ${score}, which is above the minimum threshold of ${this.minScore}. Accepting response.`);
        break;
      }
      
      // Otherwise, optimize the response
      console.log(`Response achieved score ${score}, which is below the minimum threshold of ${this.minScore}. Optimizing...`);
      
      const optimizationPrompt = `
Original request: ${input}

Current response:
${currentResponse}

Evaluation:
${evaluationResult}

Please improve the response based on the evaluation. Focus on addressing the specific areas for improvement mentioned in the evaluation.
`;
      
      // Get the optimized response
      currentResponse = await optimizerAgent.send(optimizationPrompt);
      
      // Increment the iteration counter
      iterations++;
      
      if (iterations >= this.maxIterations) {
        console.log(`Reached maximum number of iterations (${this.maxIterations}). Returning current response.`);
      }
    }
    
    return currentResponse;
  }
}
