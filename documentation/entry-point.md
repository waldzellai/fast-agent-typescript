# Entry Point Module

**Purpose Statement**: This document describes the Entry Point module of the MCP Agent Framework in TypeScript, detailing its role as the central export hub for core functionalities and how it integrates with other components.

**Last Updated**: April 14, 2025, 12:37 PM (America/Chicago, UTC-5:00)

## Overview

The Entry Point module, located at `index.ts`, serves as the primary export interface for the MCP Agent Framework. It consolidates and exposes key types, interfaces, exceptions, validation functions, decorators, factory functions, and prompt utilities from the core modules, making them accessible for use throughout the framework and by external applications.

## Key Features

- **Type and Interface Exports**: Provides access to essential types like `AgentType`, `AgentConfig`, and `BaseRequestParams` for defining agent structures and request parameters.
- **Exception Exports**: Exposes custom error classes such as `AgentConfigError`, `CircularDependencyError`, `ServerConfigError`, and `PromptExitError` for error handling.
- **Validation Functions**: Includes utilities like `validateServerReferences`, `validateWorkflowReferences`, and `getDependenciesGroups` for ensuring configuration integrity.
- **Decorator Exports**: Offers decorators such as `agent`, `orchestrator`, `router`, `chain`, `parallel`, and `evaluatorOptimizer` for defining agent behaviors and workflows.
- **Factory Functions**: Provides creation utilities like `getModelFactory`, `createAgentsByType`, and `createAgentsInDependencyOrder` for instantiating agents.
- **Prompt Functions**: Exports interactive prompt utilities including `getEnhancedInput`, `handleSpecialCommands`, `getSelectionInput`, and `getArgumentInput` for user interaction.

## Setup and Configuration

To use the Entry Point module, follow these steps:

1. **Import the Module**: Include the necessary exports in your project or module:
   ```typescript
   import { AgentType, AgentConfig, agent, createAgentsByType } from "./index";
   ```
2. **No Additional Configuration**: The module does not require setup beyond importing, as it acts solely as an export aggregator for core framework functionalities.

## Usage

### Importing Types and Interfaces

Use the exported types to define agent configurations:

```typescript
import { AgentType, AgentConfig } from "./index";

const config: AgentConfig = {
  type: AgentType.Orchestrator,
  name: "MainOrchestrator",
  // other configuration properties
};
```

### Handling Exceptions

Catch and handle framework-specific errors:

```typescript
import { AgentConfigError } from "./index";

try {
  // Agent configuration logic
} catch (error) {
  if (error instanceof AgentConfigError) {
    console.error("Configuration error:", error.message);
  }
}
```

### Using Decorators

Apply decorators to define agent behavior:

```typescript
import { agent } from "./index";

@agent
class MyAgent {
  // Agent implementation
}
```

### Creating Agents with Factory Functions

Instantiate agents using factory functions:

```typescript
import { createAgentsByType } from "./index";

const agents = createAgentsByType(AgentType.Router, { name: "MyRouter" });
console.log(agents);
```

### Interactive Prompts

Utilize prompt functions for user input:

```typescript
import { getEnhancedInput } from "./index";

async function promptUser() {
  const input = await getEnhancedInput("Enter command:");
  console.log("User input:", input);
}
promptUser();
```

## Integration

The Entry Point module integrates with other components of the framework as follows:

- **Core Modules**: Acts as the gateway to [Core Modules](./core-modules.md), exporting their functionalities for use across the framework.
- **Agent Implementation**: Provides necessary tools for the [MCP Agent](./mcp-agent.md) module to define and manage agents.
- **Server and CLI**: Supplies types and functions that may be used by the [Server](./server.md) and [CLI Interface](./cli.md) modules for configuration and operation.

## Cross-References

- For an overview of the framework, refer to [Overview](./overview.md).
- For agent-specific documentation, see [MCP Agent](./mcp-agent.md).
- For server configurations, check [Server](./server.md).
- For utility functions, consult [Utilities](./utils.md).
- For core functionalities, explore [Core Modules](./core-modules.md).

## Conclusion

The Entry Point module is crucial for accessing the core functionalities of the MCP Agent Framework. By exporting essential types, exceptions, decorators, and utility functions, it enables developers to build and manage agent-based applications efficiently, serving as the central hub for framework interactions.
