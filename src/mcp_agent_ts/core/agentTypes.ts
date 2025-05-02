// Type definitions for MCP Agent in TypeScript

// This file mirrors the structure of agent_types.py from the Python codebase

export interface Agent {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
}

export interface AgentContext {
  agent: Agent;
  state: Record<string, any>;
}
