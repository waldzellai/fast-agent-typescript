# Core Modules

**Purpose Statement**: This document provides an overview and detailed explanation of the Core Modules within the MCP Agent Framework in TypeScript, covering their functionalities, usage, and integration points.

**Last Updated**: April 14, 2025, 12:38 PM (America/Chicago, UTC-5:00)

## Overview

The Core Modules, located in the `src/core/` directory, form the foundational components of the MCP Agent Framework. These modules define essential types, interfaces, validation logic, decorators, factory functions, and prompt utilities that are critical for building and managing agent-based systems.

## Key Core Modules

### Agent Types (`agentTypes.ts`)

- **Description**: Defines the types and interfaces for different agent configurations, such as `AgentType` and `AgentConfig`, which categorize agents based on their roles (e.g., Orchestrator, Router).
- **Purpose**: Provides a structured way to define agent properties and behaviors.

### Direct Decorators (`directDecorators.ts`)

- **Description**: Contains decorators like `agent`, `orchestrator`, `router`, `chain`, `parallel`, and `evaluatorOptimizer` for annotating classes to specify agent behaviors and workflow patterns.
- **Purpose**: Simplifies the definition of agent roles and interactions through declarative programming.

### Direct Factory (`directFactory.ts`)

- **Description**: Includes factory functions such as `getModelFactory`, `createAgentsByType`, and `createAgentsInDependencyOrder` for creating agent instances based on configurations.
- **Purpose**: Facilitates the instantiation of agents in a controlled and dependency-aware manner.

### Enhanced Prompt (`enhancedPrompt.ts`)

- **Description**: Offers advanced prompt utilities like `getEnhancedInput`, `handleSpecialCommands`, `getSelectionInput`, and `getArgumentInput` for interactive user input handling.
- **Purpose**: Enhances user interaction with agents through sophisticated input processing.

### Exceptions (`exceptions.ts`)

- **Description**: Defines custom error classes including `AgentConfigError`, `CircularDependencyError`, `ServerConfigError`, and `PromptExitError` for specific error handling.
- **Purpose**: Enables precise error management within the framework.

### MCP Content (`mcpContent.ts`)

- **Description**: Manages content structures specific to MCP agents, likely handling data formats or payloads for agent communications.
- **Purpose**: Supports content processing and formatting for agent operations.

### Prompt (`prompt.ts`)

- **Description**: Provides basic prompt functionalities for user interactions, which are extended by the enhanced prompt module.
- **Purpose**: Forms the base for user input mechanisms within the framework.

### Request Parameters (`requestParams.ts`)

- **Description**: Defines `BaseRequestParams` and related interfaces for structuring requests to and from agents.
- **Purpose**: Standardizes request formats for consistent communication.

### Validation (`validation.ts`)

- **Description**: Contains validation functions like `validateServerReferences`, `validateWorkflowReferences`, and `getDependenciesGroups` to ensure configuration integrity.
- **Purpose**: Prevents configuration errors and circular dependencies in agent setups.

## Setup and Configuration

To utilize the Core Modules, follow these steps:

1. **Import Specific Modules**: Import only the necessary components from the entry point or directly from core modules if needed:
   ```typescript
   import { AgentType, AgentConfig } from "../index";
   // or directly
   import { AgentType } from "./agentTypes";
   ```
2. **No Additional Configuration**: Most core modules do not require setup beyond importing, as they provide types, functions, or decorators used programmatically.

## Usage

### Defining Agent Types

Use types to configure agents:

```typescript
import { AgentType, AgentConfig } from "../index";

const config: AgentConfig = {
  type: AgentType.Orchestrator,
  name: "MainOrchestrator",
};
```

### Applying Decorators

Define agent behavior with decorators:

```typescript
import { orchestrator } from "../index";

@orchestrator
class MainOrchestrator {
  // Implementation
}
```

### Creating Agents

Instantiate agents using factory functions:

```typescript
import { createAgentsByType } from "../index";

const agents = createAgentsByType(AgentType.Router, { name: "MyRouter" });
```

### Handling User Input

Enhance interaction with prompt utilities:

```typescript
import { getEnhancedInput } from "../index";

async function getUserCommand() {
  return await getEnhancedInput("Enter command:");
}
```

## Integration

The Core Modules integrate with other components as follows:

- **Entry Point**: All core functionalities are exported through the [Entry Point](./entry-point.md) module for centralized access.
- **Agent Implementation**: Directly used by the [MCP Agent](./mcp-agent.md) module to build agent logic.
- **Server and CLI**: Provide underlying support for configurations and operations in the [Server](./server.md) and [CLI Interface](./cli.md) modules.

## Cross-References

- For an overview of the framework, refer to [Overview](./overview.md).
- For agent-specific documentation, see [MCP Agent](./mcp-agent.md).
- For server configurations, check [Server](./server.md).
- For utility functions, consult [Utilities](./utils.md).
- For entry point details, visit [Entry Point](./entry-point.md).

## Conclusion

The Core Modules are the backbone of the MCP Agent Framework, providing essential tools, types, and functionalities for agent development. By understanding and leveraging these modules, developers can create robust, scalable agent systems tailored to specific needs.
