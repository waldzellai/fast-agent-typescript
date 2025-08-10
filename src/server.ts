// src/server.ts

import { BaseAgent } from './mcpAgent';
// Assuming FastMCP and MCPContext are part of an external library or need to be defined
// For now, we'll define placeholder interfaces/types to represent them
import { ConsoleProgressDisplay } from './logging/consoleProgressDisplay';
export interface FastMCP {
  tool: (options: {
    name: string;
    description: string;
  }) => (fn: Function) => void;
  prompt: (options: {
    name: string;
    description: string;
  }) => (fn: Function) => void;
  run: (options: { transport: string }) => void;
  run_sse_async: () => Promise<void>;
  run_stdio_async: () => Promise<void>;
  settings: {
    host: string;
    port: number;
  };
}

interface MCPContext {
  report_progress: (progress: number, total?: number) => Promise<void>;
}

/**
 * Exposes FastAgent agents as MCP tools through an MCP server.
 */
export class AgentMCPServer {
  private agents: Record<string, BaseAgent>;
  private mcpServer: FastMCP;

  constructor(
    agents: Record<string, BaseAgent>,
    serverName: string = 'FastAgent-MCP-Server',
    serverDescription?: string
  ) {
    this.agents = agents;
    this.mcpServer = {
      tool: () => () => {},
      prompt: () => () => {},
      run: () => {},
      run_sse_async: async () => {},
      run_stdio_async: async () => {},
      settings: {
        host: '0.0.0.0',
        port: 8000,
      },
    } as unknown as FastMCP; // Placeholder, actual implementation needed
    this.mcpServer = this.initializeMcpServer(serverName, serverDescription);
    this.setupTools();
  }

  private initializeMcpServer(name: string, description?: string): FastMCP {
    // Implementation for initializing FastMCP server
    // This is a placeholder; actual implementation depends on the MCP library in TypeScript
    return {
      tool: (options: { name: string; description: string }) => {
        return (fn: Function) => {
          // Register tool logic here
        };
      },
      prompt: (options: { name: string; description: string }) => {
        return (fn: Function) => {
          // Register prompt logic here
        };
      },
      run: (options: { transport: string }) => {
        // Run logic here
      },
      run_sse_async: async () => {
        // Async SSE run logic here
      },
      run_stdio_async: async () => {
        // Async STDIO run logic here
      },
      settings: {
        host: '0.0.0.0',
        port: 8000,
      },
    } as unknown as FastMCP;
  }

  private setupTools(): void {
    // Register all agents as MCP tools
    for (const [agentName, agent] of Object.entries(this.agents)) {
      this.registerAgentTools(agentName, agent);
    }
  }

  private registerAgentTools(agentName: string, agent: BaseAgent): void {
    // Basic send message tool
    const sendMessageTool = this.mcpServer.tool({
      name: `${agentName}_send`,
      description: `Send a message to the ${agentName} agent`,
    });

    sendMessageTool(async (message: string, ctx: MCPContext) => {
      const agentContext = (agent as any).context || null;
      const executeSend = async () => {
        return await agent.send(message);
      };

      if (agentContext && ctx) {
        return await this.withBridgedContext(agentContext, ctx, executeSend);
      } else {
        return await executeSend();
      }
    });

    // Register a history prompt for this agent
    const historyPrompt = this.mcpServer.prompt({
      name: `${agentName}_history`,
      description: `Conversation history for the ${agentName} agent`,
    });

    historyPrompt(async () => {
      if (!(agent as any)._llm) {
        return [];
      }

      const multipartHistory = (agent as any)._llm.messageHistory;
      // Conversion logic from multipart to standard PromptMessages needed
      // const promptMessages = Prompt.fromMultipart(multipartHistory);
      // Return raw list of messages matching FastMCP structure
      // return promptMessages.map(msg => ({ role: msg.role, content: msg.content }));
      return [];
    });
  }

  public run(
    transport: string = 'sse',
    host: string = '0.0.0.0',
    port: number = 8000
  ): void {
    if (transport === 'sse') {
      this.mcpServer.settings.host = host;
      this.mcpServer.settings.port = port;
    }
    this.mcpServer.run({ transport });
  }

  public async runAsync(
    transport: string = 'sse',
    host: string = '0.0.0.0',
    port: number = 8000
  ): Promise<void> {
    if (transport === 'sse') {
      this.mcpServer.settings.host = host;
      this.mcpServer.settings.port = port;
      try {
        await this.mcpServer.run_sse_async();
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'CancelledError' ||
            error.name === 'KeyboardInterrupt')
        ) {
          console.log('Server Stopped (CTRL+C)');
          return;
        }
        throw error;
      }
    } else {
      try {
        await this.mcpServer.run_stdio_async();
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'CancelledError' ||
            error.name === 'KeyboardInterrupt')
        ) {
          console.log('Server Stopped (CTRL+C)');
          return;
        }
        throw error;
      }
    }
  }

  private async withBridgedContext(
    agentContext: any,
    mcpContext: MCPContext,
    func: Function,
    ...args: any[]
  ): Promise<any> {
    let originalProgressReporter:
      | ((progress: number, total?: number) => Promise<void>)
      | null = null;

    if (agentContext.progress_reporter) {
      originalProgressReporter = agentContext.progress_reporter;
    } else {
      const display = new ConsoleProgressDisplay();
      originalProgressReporter = async (
        progress: number,
        total?: number,
      ): Promise<void> => {
        display.report(progress, total);
      };
      agentContext.progress_reporter = originalProgressReporter;
    }

    agentContext.mcp_context = mcpContext;

    const bridgedProgress = async (progress: number, total?: number) => {
      if (mcpContext) {
        await mcpContext.report_progress(progress, total);
      }
      if (originalProgressReporter) {
        await originalProgressReporter(progress, total);
      }
    };

    agentContext.progress_reporter = bridgedProgress;

    try {
      return await func(...args);
    } finally {
      agentContext.progress_reporter = originalProgressReporter;
      if (agentContext.mcp_context) {
        delete agentContext.mcp_context;
      }
    }
  }

  public async shutdown(): Promise<void> {
    // Gracefully shutdown the MCP server and its resources
    // Additional cleanup code can be added here if needed
  }
}
