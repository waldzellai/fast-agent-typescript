# CLI Interface Module

**Purpose Statement**: This document describes the CLI Interface module of the MCP Agent Framework in TypeScript, focusing on the command-line tools for managing and interacting with the framework.

**Last Updated**: April 14, 2025, 12:41 PM (America/Chicago, UTC-5:00)

## Overview

The CLI Interface module, located at `src/cli.ts`, provides a command-line interface for the MCP Agent Framework using the Commander library. It serves as the primary entry point for users to interact with the framework through terminal commands, offering subcommands like `setup` for project initialization and `quickstart` for creating example applications. The module also manages application context such as verbosity and output formatting, and displays a welcome message with available commands when invoked without arguments.

## Key Features

- **Command Structure**: Utilizes Commander to define a structured CLI with subcommands and options.
- **Subcommands**: Includes `setup` for creating new agent projects and `quickstart` for generating example applications.
- **Application Context**: Manages shared settings like verbosity level and console output formatting.
- **Welcome Message**: Displays a helpful overview of available commands and getting started instructions when no specific command is provided.
- **Version Information**: Retrieves and shows the framework version from `package.json`.

## Setup and Configuration

The CLI Interface module is designed to be run directly from the command line and does not require additional setup beyond ensuring the framework is installed. It can be invoked using:

```bash
npx fastagent [command] [options]
```

Or if installed globally:

```bash
fastagent [command] [options]
```

No specific configuration files are needed for basic CLI operations, though subcommands may have their own configuration requirements.

## Usage

### Running the CLI

Invoke the CLI without arguments to see the welcome message and list of available commands:

```bash
fastagent
```

This will display version information, a table of commands, and getting started instructions.

### Setup Command

Initialize a new agent project with configuration files:

```bash
fastagent setup
```

### Quickstart Command

Create example applications to explore the framework's capabilities:

```bash
fastagent quickstart workflow
```

Use the `--help` option with any command for detailed usage information:

```bash
fastagent quickstart --help
```

### Options

Control output verbosity and formatting:

```bash
fastagent --verbose setup  # Enable detailed output
fastagent --quiet setup    # Suppress output
fastagent --no-color setup # Disable color in output
```

## Integration

The CLI Interface module integrates with other components of the framework as follows:

- **MCP Agent**: Provides access to create and manage agents from [MCP Agent](./mcp-agent.md) through command-line operations.
- **Server**: Can initiate or configure server setups from [Server](./server.md) via CLI commands.
- **Utilities**: May use helper functions from [Utilities](./utils.md) for internal operations or data handling.
- **Core Modules**: Leverages types or configurations from [Core Modules](./core-modules.md) for command implementations.
- **Entry Point**: Serves as an alternative user interface to the [Entry Point](./entry-point.md) for framework interaction.

## Cross-References

- For an overview of the framework, refer to [Overview](./overview.md).
- For agent-specific documentation, see [MCP Agent](./mcp-agent.md).
- For server configurations, check [Server](./server.md).
- For utility functions, visit [Utilities](./utils.md).
- For core functionalities, explore [Core Modules](./core-modules.md).
- For entry point details, see [Entry Point](./entry-point.md).

## Conclusion

The CLI Interface module is a crucial part of the MCP Agent Framework, offering a user-friendly command-line toolset for managing agent projects and exploring framework capabilities. Through commands like `setup` and `quickstart`, developers can quickly initialize projects and create example applications, streamlining the process of building effective agents with the Model Context Protocol (MCP).
