// src/server.ts

import { BaseAgent } from './mcpAgent';
import { ToolDefinition, ToolSchema } from './tools/toolDefinition';

import { FastMCP, type Context } from 'fastmcp';
import { z } from 'zod';
import { Prompt } from './core/prompt';

export { FastMCP, type Context };

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
    this.mcpServer = this.initializeMcpServer(serverName, serverDescription);
    this.setupTools();
  }

  private initializeMcpServer(name: string, description?: string): FastMCP {
    return new FastMCP({
      name,
      instructions: description,
      version: '1.0.0',
    });
  }

  private setupTools(): void {
    for (const [agentName, agent] of Object.entries(this.agents)) {
      this.registerAgentTools(agentName, agent);
    }
  }

  private registerAgentTools(agentName: string, agent: BaseAgent): void {
    this.mcpServer.addTool({
      name: `${agentName}_send`,
      description: `Send a message to the ${agentName} agent`,

      parameters: z.object({ message: z.string() }),
      execute: async (args: { message: string }, ctx: Context<any>) => {
        const agentContext = (agent as any).context || null;
        const executeSend = async () => await agent.send(args.message);

        if (agentContext && ctx) {
          return await this.withBridgedContext(agentContext, ctx, executeSend);
        }
        return await executeSend();
      },
    });

    this.mcpServer.addPrompt({
      name: `${agentName}_history`,
      description: `Conversation history for the ${agentName} agent`,
      load: async () => {
        if (!(agent as any)._llm) {
          return '[]';
        }
        const multipartHistory = (agent as any)._llm.messageHistory;
        const promptMessages = Prompt.fromMultipart(multipartHistory);
        const history = promptMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
        return JSON.stringify(history);
      },
    });

    if (agent.tools) {
      for (const tool of agent.tools as ToolDefinition[]) {
        const registeredTool = this.mcpServer.tool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          response: tool.response,
        });

        registeredTool(async (args: any, ctx: MCPContext) => {
          return await tool.handler(args, ctx);
        });
      }
    }
  }

  public run(
    transport: string = 'sse',
    _host: string = '0.0.0.0',
    port: number = 8000
  ): void {
    if (transport === 'sse') {
      this.mcpServer
        .start({ transportType: 'sse', sse: { port, endpoint: '/sse' } })
        .catch((err) => console.error(err));
    } else {
      this.mcpServer
        .start({ transportType: 'stdio' })
        .catch((err) => console.error(err));
    }
  }

  public async runAsync(
    transport: string = 'sse',
    _host: string = '0.0.0.0',
    port: number = 8000
  ): Promise<void> {
    try {
      if (transport === 'sse') {
        await this.mcpServer.start({
          transportType: 'sse',
          sse: { port, endpoint: '/sse' },
        });
      } else {
        await this.mcpServer.start({ transportType: 'stdio' });
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'CancelledError' || error.name === 'KeyboardInterrupt')
      ) {
        console.log('Server Stopped (CTRL+C)');
        return;
      }
      throw error;
    }
  }

  private async withBridgedContext(
    agentContext: any,
    mcpContext: Context<any>,
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
        await mcpContext.reportProgress({ progress, total });
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
    await this.mcpServer.stop();
  }
}

