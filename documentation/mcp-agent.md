# MCP Agent Module

**Purpose Statement**: This document details the MCP Agent module of the MCP Agent Framework in TypeScript, focusing on the `Agent` class for interacting with MCP servers and managing agent-based operations.

**Last Updated**: April 14, 2025, 12:43 PM (America/Chicago, UTC-5:00)

## Overview

The MCP Agent module, located at `src/mcpAgent.ts`, implements the `Agent` class, a core component of the MCP Agent Framework. This class represents an entity capable of interacting with Model Context Protocol (MCP) servers, adhering to the `AgentProtocol` while delegating Language Model (LLM) operations to an attached `AugmentedLLMProtocol` instance. It provides methods for sending messages, applying prompts, listing available prompts and resources, and initiating interactive prompt sessions.

## Key Features

- **Agent Identity and Type**: Defines agents with a unique name and type, allowing for specialized configurations.
- **Message Sending**: Facilitates communication by sending messages to MCP servers and receiving responses.
- **Prompt Application**: Supports applying specific prompts with arguments for tailored interactions.
- **Prompt and Resource Listing**: Allows querying of available prompts and resources for agent operations.
- **Interactive Prompt Session**: Enables interactive sessions with users through a prompt loop, supporting default messages and agent-specific interactions.

## Setup and Configuration

To use the MCP Agent module, follow these steps:

1. **Import the Module**: Include the `Agent` class in your project:
   ```typescript
   import { Agent } from "./src/mcpAgent";
   ```
2. **Initialize an Agent**: Create an instance of the `Agent` class with a configuration or name:

   ```typescript
   // Using a simple string name for backward compatibility
   const simpleAgent = new Agent("SimpleAgent");

   // Using a detailed configuration object
   import { AgentConfig } from "./src/core/agentTypes";
   const config: AgentConfig = {
     name: "ResearchAgent",
     type: { name: "ResearchType" },
   };
   const researchAgent = new Agent(config);
   ```

3. **Optional Parameters**: Provide additional parameters like functions, connection persistence, human input callbacks, and context if needed:
   ```typescript
   const customAgent = new Agent(
     "CustomAgent",
     [],
     true,
     async (input) => `Response to ${input}`,
   );
   ```

## Usage

### Sending a Message

Send a message to an MCP server and receive a response:

```typescript
import { Agent } from "./src/mcpAgent";

const agent = new Agent("MessageAgent");
const response = await agent.send("Hello, how can you help me today?");
console.log(response); // Outputs the server's response
```

### Applying a Prompt

Apply a specific prompt with arguments for a tailored response:

```typescript
import { Agent } from "./src/mcpAgent";

const agent = new Agent("PromptAgent");
const result = await agent.applyPrompt("generateReport", {
  topic: "AI Trends",
});
console.log(result); // Outputs the generated report content
```

### Listing Prompts and Resources

Retrieve lists of available prompts and resources:

```typescript
import { Agent } from "./src/mcpAgent";

const agent = new Agent("ResourceAgent");
const prompts = await agent.listPrompts();
console.log(prompts); // Outputs array of prompt names

const resources = await agent.listResources();
console.log(resources); // Outputs array of resource identifiers
```

### Starting an Interactive Prompt Session

Initiate an interactive session with a default prompt:

```typescript
import { Agent } from "./src/mcpAgent";

const agent = new Agent("InteractiveAgent");
const sessionResult = await agent.prompt(
  "Ask me anything about data analysis.",
);
console.log(sessionResult); // Outputs the result of the interactive session
```

## Integration

The MCP Agent module integrates with other components of the framework as follows:

- **Server**: Works with [Server](./server.md) to expose agent functionalities as MCP tools for external interactions.
- **CLI Interface**: Can be managed or invoked through [CLI Interface](./cli.md) for command-line operations.
- **Utilities**: Utilizes helper functions from [Utilities](./utils.md) for content handling or data processing.
- **Core Modules**: Relies on types and configurations from [Core Modules](./core-modules.md) for agent setup and operation.
- **Entry Point**: Often instantiated or used via [Entry Point](./entry-point.md) as part of the broader application setup.

## Cross-References

- For an overview of the framework, refer to [Overview](./overview.md).
- For server configurations, check [Server](./server.md).
- For command-line interactions, consult [CLI Interface](./cli.md).
- For utility functions, visit [Utilities](./utils.md).
- For core functionalities, explore [Core Modules](./core-modules.md).
- For entry point details, see [Entry Point](./entry-point.md).

## Conclusion

The MCP Agent module is a fundamental part of the MCP Agent Framework, providing the `Agent` class to manage interactions with MCP servers. By supporting message sending, prompt application, resource listing, and interactive sessions, it enables developers to create versatile agent-based applications that can communicate effectively with external systems and users.
