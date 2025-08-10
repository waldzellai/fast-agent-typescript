import { AgentType, AgentConfig } from './src/core/agentTypes';
import {
  AgentConfigError,
  CircularDependencyError,
  ServerConfigError,
  PromptExitError,
} from './src/core/exceptions';
import {
  validateServerReferences,
  validateWorkflowReferences,
  getDependenciesGroups,
} from './src/core/validation';
import {
  agent,
  orchestrator,
  router,
  chain,
  parallel,
  evaluatorOptimizer,
} from './src/core/directDecorators';
import {
  getModelFactory,
  createAgentsByType,
  createAgentsInDependencyOrder,
} from './src/core/directFactory';
import {
  getEnhancedInput,
  handleSpecialCommands,
  getSelectionInput,
  getArgumentInput,
} from './src/core/enhancedPrompt';
import { BaseRequestParams } from './src/core/requestParams';
import { Agent, BaseAgent, getLogger, Logger } from './src/mcpAgent';
import { configureOtel } from './src/telemetry/otel';
import { trackUsage } from './src/llm/usageTracking';
import { FastAgent } from './src/fastAgent';
import {
  Workflow,
  BaseWorkflow,
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
} from './src/workflows';

export {
  // Main Classes
  FastAgent,
  Agent,
  BaseAgent,
  getLogger,
  Logger,

  // Types and Interfaces
  AgentType,
  AgentConfig,
  BaseRequestParams,

  // Exceptions
  AgentConfigError,
  CircularDependencyError,
  ServerConfigError,
  PromptExitError,

  // Validation Functions
  validateServerReferences,
  validateWorkflowReferences,
  getDependenciesGroups,

  // Decorators
  agent,
  orchestrator,
  router,
  chain,
  parallel,
  evaluatorOptimizer,

  // Factory Functions
  getModelFactory,
  createAgentsByType,
  createAgentsInDependencyOrder,

  // Prompt Functions
  getEnhancedInput,
  handleSpecialCommands,
  getSelectionInput,
  getArgumentInput,

  // Workflow Types
  Workflow,
  BaseWorkflow,
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
  configureOtel,
  trackUsage,
};
