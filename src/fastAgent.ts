/**
 * FastAgent - Main entry point for the FastAgent TypeScript library
 *
 * This class provides a simple interface for creating and running agents.
 */

import { Agent, BaseAgent, HumanInputCallback, Context } from './mcpAgent';
import { AgentConfig, AgentType } from './core/agentTypes';
import {
  validateServerReferences,
  validateWorkflowReferences,
} from './core/validation';
import { getModelFactory } from './core/directFactory';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Import workflow types
import {
  Chain,
  ChainConfig,
  Router,
  RouterConfig,
  Parallel,
  ParallelConfig,
  Orchestrator,
  OrchestratorConfig,
  EvaluatorOptimizer,
  EvaluatorOptimizerConfig,
  BaseWorkflow,
} from './workflows';

// Type for agent function
type AgentFunction = (agent: BaseAgent) => Promise<void>;

// Type for agent decorator options
interface AgentOptions {
  name?: string;
  instruction?: string;
  servers?: string[];
  model?: string;
  use_history?: boolean;
  human_input?: boolean;
}

// Type for chain workflow options
interface ChainOptions extends AgentOptions {
  sequence: string[];
  cumulative?: boolean;
}

// Type for router workflow options
interface RouterOptions extends AgentOptions {
  router_agents: string[];
}

// Type for parallel workflow options
interface ParallelOptions extends AgentOptions {
  fan_out: string[];
  fan_in?: string;
  include_request?: boolean;
}

// Type for orchestrator workflow options
interface OrchestratorOptions extends AgentOptions {
  orchestrator_agents: string[];
  max_steps?: number;
}

// Type for evaluator-optimizer workflow options
interface EvaluatorOptimizerOptions extends AgentOptions {
  worker: string;
  evaluator: string;
  optimizer: string;
  min_score?: number;
  max_iterations?: number;
}

/**
 * FastAgent - Main entry point for the FastAgent TypeScript library
 */
export class FastAgent {
  private name: string;
  private agents: Record<string, { config: AgentConfig; func: AgentFunction }> =
    {};
  private workflows: Record<string, { config: AgentConfig; type: string }> = {};
  private context: Context = { config: { mcp: { servers: {} } } };
  private cliModel?: string;
  private createdAgents: Record<string, BaseAgent> = {};

  /**
   * Create a new FastAgent instance
   * @param name Name of the FastAgent instance
   */
  constructor(name: string) {
    this.name = name;
    this.loadConfig();
  }

  /**
   * Load configuration from fastagent.config.yaml and fastagent.secrets.yaml
   */
  private loadConfig(): void {
    try {
      // Try to load fastagent.config.yaml
      const configPath = path.resolve(process.cwd(), 'fastagent.config.yaml');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(configContent) as any;
        this.context.config = config;
        console.log(`Loaded configuration from ${configPath}`);
      }

      // Try to load fastagent.secrets.yaml
      const secretsPath = path.resolve(process.cwd(), 'fastagent.secrets.yaml');
      if (fs.existsSync(secretsPath)) {
        const secretsContent = fs.readFileSync(secretsPath, 'utf8');
        const secrets = yaml.load(secretsContent) as any;

        // Set API keys as environment variables
        if (secrets.openai?.api_key) {
          process.env.OPENAI_API_KEY = secrets.openai.api_key;
        }
        if (secrets.anthropic?.api_key) {
          process.env.ANTHROPIC_API_KEY = secrets.anthropic.api_key;
        }
        if (secrets.deepseek?.api_key) {
          process.env.DEEPSEEK_API_KEY = secrets.deepseek.api_key;
        }
        if (secrets.openrouter?.api_key) {
          process.env.OPENROUTER_API_KEY = secrets.openrouter.api_key;
        }

        // Merge MCP server environment variables
        if (secrets.mcp?.servers) {
          // Ensure nested structure exists
          if (!this.context.config) {
            this.context.config = {};
          }
          if (!this.context.config.mcp) {
            this.context.config.mcp = { servers: {} };
          } else if (!this.context.config.mcp.servers) {
            this.context.config.mcp.servers = {};
          }

          // Only proceed if servers object is confirmed to exist
          if (this.context.config.mcp.servers) {
            const servers = this.context.config.mcp.servers; // Now TS knows 'servers' is defined

            for (const [serverName, serverConfig] of Object.entries(
              secrets.mcp.servers
            )) {
              // Use the guaranteed non-undefined local variable 'servers'
              if (!servers[serverName]) {
                servers[serverName] = {};
              }
              servers[serverName].env = (
                serverConfig as any
              ).env;
            }
          }
        }

        console.log(`Loaded secrets from ${secretsPath}`);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  /**
   * Define an agent with the given options and function
   * @param options Agent options
   * @param func Agent function
   */
  agent(options: AgentOptions | string, func: AgentFunction): void {
    let config: AgentConfig;

    if (typeof options === 'string') {
      // If options is a string, use it as the instruction
      config = {
        name: 'default',
        instruction: options,
        agent_type: AgentType.BASIC,
        use_history: true,
        servers: [],
        human_input: false,
      };
    } else {
      // Otherwise, use the options object
      config = {
        name: options.name || 'default',
        instruction: options.instruction || 'You are a helpful agent.',
        agent_type: AgentType.BASIC,
        use_history:
          options.use_history !== undefined ? options.use_history : true,
        servers: options.servers || [],
        model: options.model,
        human_input: options.human_input || false,
      };
    }

    this.agents[config.name] = { config, func };
  }

  /**
   * Define a chain workflow
   * @param options Chain options
   * @param func Function to execute with the chain
   */
  chain(options: ChainOptions, func: AgentFunction): void {
    const config: ChainConfig = {
      name: options.name || 'chain',
      instruction: options.instruction || 'Chain workflow',
      agent_type: AgentType.CHAIN,
      use_history:
        options.use_history !== undefined ? options.use_history : true,
      servers: options.servers || [],
      model: options.model,
      sequence: options.sequence,
      cumulative: options.cumulative,
    };

    this.workflows[config.name] = { config, type: 'chain' };
    this.agents[config.name] = { config, func };
  }

  /**
   * Define a router workflow
   * @param options Router options
   * @param func Function to execute with the router
   */
  router(options: RouterOptions, func: AgentFunction): void {
    const config: RouterConfig = {
      name: options.name || 'router',
      instruction: options.instruction || 'Router workflow',
      agent_type: AgentType.ROUTER,
      use_history:
        options.use_history !== undefined ? options.use_history : true,
      servers: options.servers || [],
      model: options.model,
      router_agents: options.router_agents,
    };

    this.workflows[config.name] = { config, type: 'router' };
    this.agents[config.name] = { config, func };
  }

  /**
   * Define a parallel workflow
   * @param options Parallel options
   * @param func Function to execute with the parallel workflow
   */
  parallel(options: ParallelOptions, func: AgentFunction): void {
    const config: ParallelConfig = {
      name: options.name || 'parallel',
      instruction: options.instruction || 'Parallel workflow',
      agent_type: AgentType.PARALLEL,
      use_history:
        options.use_history !== undefined ? options.use_history : true,
      servers: options.servers || [],
      model: options.model,
      fan_out: options.fan_out,
      fan_in: options.fan_in,
      include_request: options.include_request,
    };

    this.workflows[config.name] = { config, type: 'parallel' };
    this.agents[config.name] = { config, func };
  }

  /**
   * Define an orchestrator workflow
   * @param options Orchestrator options
   * @param func Function to execute with the orchestrator
   */
  orchestrator(options: OrchestratorOptions, func: AgentFunction): void {
    const config: OrchestratorConfig = {
      name: options.name || 'orchestrator',
      instruction: options.instruction || 'Orchestrator workflow',
      agent_type: AgentType.ORCHESTRATOR,
      use_history:
        options.use_history !== undefined ? options.use_history : true,
      servers: options.servers || [],
      model: options.model,
      orchestrator_agents: options.orchestrator_agents,
      max_steps: options.max_steps,
    };

    this.workflows[config.name] = { config, type: 'orchestrator' };
    this.agents[config.name] = { config, func };
  }

  /**
   * Define an evaluator-optimizer workflow
   * @param options Evaluator-optimizer options
   * @param func Function to execute with the evaluator-optimizer
   */
  evaluatorOptimizer(
    options: EvaluatorOptimizerOptions,
    func: AgentFunction
  ): void {
    const config: EvaluatorOptimizerConfig = {
      name: options.name || 'evaluator_optimizer',
      instruction: options.instruction || 'Evaluator-Optimizer workflow',
      agent_type: AgentType.EVALUATOR_OPTIMIZER,
      use_history:
        options.use_history !== undefined ? options.use_history : true,
      servers: options.servers || [],
      model: options.model,
      worker: options.worker,
      evaluator: options.evaluator,
      optimizer: options.optimizer,
      min_score: options.min_score,
      max_iterations: options.max_iterations,
    };

    this.workflows[config.name] = { config, type: 'evaluator_optimizer' };
    this.agents[config.name] = { config, func };
  }

  /**
   * Run the FastAgent instance
   * @param options Run options
   */
  async run(options: { model?: string } = {}): Promise<void> {
    // Parse command line arguments
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--model' && i + 1 < args.length) {
        this.cliModel = args[i + 1];
        i++;
      }
    }

    // Override with options if provided
    if (options.model) {
      this.cliModel = options.model;
    }

    // Validate server references
    const agentConfigs: Record<string, any> = {};
    for (const [name, agent] of Object.entries(this.agents)) {
      agentConfigs[name] = {
        type: agent.config.agent_type,
        config: agent.config,
      };
    }

    try {
      if (this.context.config && this.context.config.mcp) {
        validateServerReferences(this.context as any, agentConfigs);
      } else {
        console.warn(
          'Skipping server validation: context.config or context.config.mcp is missing.'
        );
      }
      validateWorkflowReferences(agentConfigs);
    } catch (error) {
      console.error('Validation error:', error);
      return;
    }

    // First, create all the agents
    for (const [name, agent] of Object.entries(this.agents)) {
      if (this.workflows[name]) {
        // Skip workflows for now, we'll create them after all agents are created
        continue;
      }

      try {
        // Create the agent
        const agentInstance = new Agent(
          agent.config,
          [],
          true,
          undefined,
          this.context
        );

        // Initialize the agent
        await agentInstance.initialize();

        // Create a model factory
        const modelFactory = getModelFactory(
          this.context,
          agent.config.model ?? undefined, // Handle null case for model
          (agent.config.default_request_params ?? undefined) as any, // Cast to 'any' to satisfy BaseRequestParams requirement, assuming runtime compatibility
          this.context.config?.default_model, // Use optional chaining
          this.cliModel
        );

        // Attach the LLM to the agent
        await agentInstance.attachLlm(modelFactory as any);

        // Store the agent instance
        this.createdAgents[name] = agentInstance;
      } catch (error) {
        console.error(`Error creating agent ${name}:`, error);
      }
    }

    // Now create the workflows
    for (const [name, workflow] of Object.entries(this.workflows)) {
      try {
        let workflowInstance: BaseAgent;
        let workflowInstanceSpecific: BaseWorkflow;

        // Create the workflow based on its type
        switch (workflow.type) {
          case 'chain':
            workflowInstanceSpecific = new Chain(
              workflow.config as ChainConfig,
              this.createdAgents
            );
            break;
          case 'router':
            workflowInstanceSpecific = new Router(
              workflow.config as RouterConfig,
              this.createdAgents
            );
            break;
          case 'parallel':
            workflowInstanceSpecific = new Parallel(
              workflow.config as ParallelConfig,
              this.createdAgents
            );
            break;
          case 'orchestrator':
            workflowInstanceSpecific = new Orchestrator(
              workflow.config as OrchestratorConfig,
              this.createdAgents
            );
            break;
          case 'evaluator_optimizer':
            workflowInstanceSpecific = new EvaluatorOptimizer(
              workflow.config as EvaluatorOptimizerConfig,
              this.createdAgents
            );
            break;
          default:
            throw new Error(`Unknown workflow type: ${workflow.type}`);
        }

        workflowInstance = workflowInstanceSpecific;

        // Initialize the workflow
        await workflowInstanceSpecific.initialize();

        // Store the workflow instance
        this.createdAgents[name] = workflowInstance;
      } catch (error) {
        console.error(`Error creating workflow ${name}:`, error);
      }
    }

    // Now run all agents and workflows
    for (const [name, agent] of Object.entries(this.agents)) {
      try {
        const instance = this.createdAgents[name];
        if (instance) {
          // Run the agent function
          await agent.func(instance);
        } else {
          console.error(`Agent ${name} was not created successfully`);
        }
      } catch (error) {
        console.error(`Error running agent ${name}:`, error);
      }
    }
  }
}
