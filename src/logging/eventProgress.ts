/**
 * Utilities for converting log events into user-friendly progress events.
 * Ported from the Python implementation in event_progress.py.
 */

// Basic structure of a log event coming from the logger
export interface LogEvent {
  namespace: string;
  data?: { data?: Record<string, any> };
}

// Progress actions available in the system
export enum ProgressAction {
  STARTING = "Starting",
  LOADED = "Loaded",
  INITIALIZED = "Initialized",
  CHATTING = "Chatting",
  STREAMING = "Streaming",
  ROUTING = "Routing",
  PLANNING = "Planning",
  READY = "Ready",
  CALLING_TOOL = "Calling Tool",
  TOOL_PROGRESS = "Tool Progress",
  UPDATED = "Updated",
  FINISHED = "Finished",
  SHUTDOWN = "Shutdown",
  AGGREGATOR_INITIALIZED = "Running",
  FATAL_ERROR = "Error",
}

// Progress event converted from a log event
export class ProgressEvent {
  constructor(
    public action: ProgressAction,
    public target: string,
    public details?: string,
    public agentName?: string,
    public streamingTokens?: string,
    public progress?: number,
    public total?: number,
  ) {}

  toString(): string {
    // Special handling for streaming token counts
    if (this.action === ProgressAction.STREAMING && this.streamingTokens) {
      const actionDisplay = this.streamingTokens.padEnd(11);
      let base = `${actionDisplay}. ${this.target}`;
      if (this.details) {
        base += ` - ${this.details}`;
      }
      return this.agentName ? `[${this.agentName}] ${base}` : base;
    }

    let base = `${this.action.padEnd(11)}. ${this.target}`;
    if (this.details) {
      base += ` - ${this.details}`;
    }
    return this.agentName ? `[${this.agentName}] ${base}` : base;
  }
}

/**
 * Convert a raw log event to a ProgressEvent if applicable.
 */
export function convertLogEvent(event: LogEvent): ProgressEvent | null {
  if (!event.data || typeof event.data.data !== "object") {
    return null;
  }

  const eventData = event.data.data as Record<string, any>;
  const progressAction = eventData["progress_action"] as string | undefined;
  if (!progressAction) {
    return null;
  }

  const namespace = event.namespace || "";
  const agentName = eventData["agent_name"] as string | undefined;
  let target = agentName;
  let details = "";

  if (progressAction === ProgressAction.FATAL_ERROR) {
    details = eventData["error_message"] || "An error occurred";
  } else if (namespace.includes("mcp_aggregator")) {
    const serverName = eventData["server_name"] || "";
    const toolName = eventData["tool_name"] as string | undefined;
    if (progressAction === ProgressAction.TOOL_PROGRESS) {
      const progressMessage = eventData["details"] || "";
      details = progressMessage || (toolName ? `${serverName} (${toolName})` : `${serverName}`);
    } else {
      details = toolName ? `${serverName} (${toolName})` : `${serverName}`;
    }
  } else if (namespace.includes("augmented_llm")) {
    const model = eventData["model"] || "";
    const chatTurn = eventData["chat_turn"];
    details = chatTurn !== undefined ? `${model} turn ${chatTurn}` : `${model}`;
  } else {
    if (!target) {
      target = (eventData["target"] as string) || "unknown";
    }
  }

  // Streaming token count for STREAMING actions
  let streamingTokens: string | undefined;
  if (progressAction === ProgressAction.STREAMING) {
    streamingTokens = eventData["details"] || "";
  }

  // Progress values for TOOL_PROGRESS actions
  let progress: number | undefined;
  let total: number | undefined;
  if (progressAction === ProgressAction.TOOL_PROGRESS) {
    progress = eventData["progress"] as number | undefined;
    total = eventData["total"] as number | undefined;
  }

  return new ProgressEvent(
    progressAction as ProgressAction,
    target || "unknown",
    details || undefined,
    agentName,
    streamingTokens,
    progress,
    total,
  );
}
