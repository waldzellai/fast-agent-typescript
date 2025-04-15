# Server Module

**Purpose Statement**: This document outlines the Server module of the MCP Agent Framework in TypeScript, focusing on the `AgentMCPServer` class for exposing agent functionalities as MCP tools through an MCP server.

**Last Updated**: April 14, 2025, 12:42 PM (America/Chicago, UTC-5:00)

## Overview

The Server module, located at `src/server.ts`, implements the `AgentMCPServer` class, which serves as a bridge between FastAgent agents and external systems via the Model Context Protocol (MCP). This class allows agents to be exposed as MCP tools, enabling interactions through defined tools and prompts. It supports multiple transport methods such as Server-Sent Events (SSE) and Standard Input/Output (STDIO), and provides configurable server settings like host and port.

## Key Features

- **Agent Exposure as MCP Tools**: Registers agents as tools within an MCP server, allowing external systems to interact with agent functionalities.
- **Tool and Prompt Registration**: Supports registering tools for sending messages to agents and prompts for accessing conversation history.
- **Transport Options**: Offers flexibility with transport methods including SSE for web-based interactions and STDIO for command-line interactions.
- **Context Bridging**: Manages context between MCP and agent environments, facilitating progress reporting and interaction continuity.
- **Configurable Settings**: Allows customization of server host and port for network configurations.

## Setup and Configuration

To use the Server module, follow these steps:

1. **Import the Module**: Include the `AgentMCPServer` class in your project:
   ```typescript
   import { AgentMCPServer } from "./src/server";
   ```
2. **Prepare Agents**: Ensure you have a set of initialized agents to expose:
   ```typescript
   import { Agent } from "./src/mcpAgent";
   const agents = {
     researchAgent: new Agent("ResearchAgent"),
     workflowAgent: new Agent("WorkflowAgent"),
   };
   ```
3. **Initialize the Server**: Create an instance of `AgentMCPServer` with the agents:
   ```typescript
   const server = new AgentMCPServer(
     agents,
     "MyMCPServer",
     "A server for agent interactions",
   );
   ```
4. **Configure Server Settings**: Optionally adjust host and port settings before running the server:
   ```typescript
   // Default is '0.0.0.0:8000'
   const customHost = "localhost";
   const customPort = 8080;
   ```

## Usage

### Running the Server with SSE Transport

Start the server using Server-Sent Events for web-based interactions:

```typescript
import { AgentMCPServer } from "./src/server";
import { Agent } from "./src/mcpAgent";

const agents = {
  dataAgent: new Agent("DataAgent"),
};
const server = new AgentMCPServer(agents);
server.run("sse", "localhost", 8080);
console.log("Server running with SSE transport on localhost:8080");
```

### Running the Server with STDIO Transport

Start the server using STDIO for command-line interactions (asynchronously):

```typescript
import { AgentMCPServer } from "./src/server";
import { Agent } from "./src/mcpAgent";

const agents = {
  interactiveAgent: new Agent("InteractiveAgent"),
};
const server = new AgentMCPServer(agents);
await server.runAsync("stdio");
console.log("Server running with STDIO transport");
```

### Shutting Down the Server

Gracefully shutdown the server when needed:

```typescript
import { AgentMCPServer } from "./src/server";
import { Agent } from "./src/mcpAgent";

const agents = {
  tempAgent: new Agent("TempAgent"),
};
const server = new AgentMCPServer(agents);
await server.runAsync("sse", "localhost", 8080);
// Later, when shutdown is required
await server.shutdown();
console.log("Server shutdown complete");
```

## Integration

The Server module integrates with other components of the framework as follows:

- **MCP Agent**: Directly interfaces with agents from [MCP Agent](./mcp-agent.md) to expose their functionalities as MCP tools.
- **CLI Interface**: Can be initiated or managed through commands in [CLI Interface](./cli.md) for server operations.
- **Utilities**: May utilize helper functions from [Utilities](./utils.md) for data processing or context management.
- **Core Modules**: Relies on types and configurations from [Core Modules](./core-modules.md) for server and agent interactions.
- **Entry Point**: Often started via [Entry Point](./entry-point.md) as part of the broader application setup.

## Cross-References

- For an overview of the framework, refer to [Overview](./overview.md).
- For agent-specific documentation, see [MCP Agent](./mcp-agent.md).
- For command-line interactions, consult [CLI Interface](./cli.md).
- For utility functions, visit [Utilities](./utils.md).
- For core functionalities, explore [Core Modules](./core-modules.md).
- For entry point details, see [Entry Point](./entry-point.md).

## Conclusion

The Server module is a vital component of the MCP Agent Framework, providing the `AgentMCPServer` class to expose agent capabilities through an MCP server. By supporting various transport methods and context bridging, it enables seamless interaction between agents and external systems, making it an essential tool for distributed agent-based applications.
