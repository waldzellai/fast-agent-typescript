/**
 * Minimal types for sampling agent configuration.
 */
export interface TextContent {
  type: 'text';
  text: string;
}

export interface SamplingMessage {
  role: string;
  content: TextContent;
}

export interface CreateMessageRequestParams {
  maxTokens?: number;
  messages?: SamplingMessage[];
  systemPrompt?: string;
}

export interface AgentConfig {
  name: string;
  instruction: string;
  servers: string[];
}

/**
 * Build a basic AgentConfig for sampling requests.
 */
export function samplingAgentConfig(params?: CreateMessageRequestParams | null): AgentConfig {
  const instruction = params?.systemPrompt !== undefined ? params.systemPrompt : 'You are a helpful AI Agent.';
  return {
    name: 'sampling_agent',
    instruction,
    servers: [],
  };
}

/**
 * Simple helpers to manage connections to MCP servers. These are lightweight
 * wrappers around expected connect/close methods, making it easy to ensure
 * servers are opened and closed as needed.
 */
export interface MCPServerConnection {
  isConnected?: () => boolean;
  connect: () => Promise<void>;
  close: () => Promise<void>;
}

export async function ensureConnected(server: MCPServerConnection): Promise<void> {
  if (server.isConnected && server.isConnected()) {
    return;
  }
  await server.connect();
}

export async function disconnect(server: MCPServerConnection): Promise<void> {
  try {
    await server.close();
  } catch {
    /* ignore */
  }
}
