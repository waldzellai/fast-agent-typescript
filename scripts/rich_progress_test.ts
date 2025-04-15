#!/usr/bin/env node
/**
 * Test script for demonstrating progress display in a terminal.
 */

import { setTimeout } from "timers/promises";

/**
 * Interface representing an event for progress tracking.
 */
interface Event {
  namespace: string;
  type: string;
  message: string;
  data: Record<string, any>;
}

/**
 * Class to listen and display progress events.
 */
class ProgressListener {
  private isRunning: boolean = false;

  async start(): Promise<void> {
    this.isRunning = true;
    console.log("Progress Listener started.");
  }

  async handleEvent(event: Event): Promise<void> {
    if (this.isRunning) {
      console.log(`[${event.namespace}] ${event.type}: ${event.message}`);
      if (Object.keys(event.data).length > 0) {
        console.log("  Data:", event.data);
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log("Progress Listener stopped.");
  }
}

/**
 * Generates synthetic progress events for testing.
 */
async function* generateTestEvents(): AsyncGenerator<Event, void, unknown> {
  const mcpNames = ["Assistant-1", "Helper-2", "Agent-3"];
  const models = ["gpt-4", "claude-2", "mistral"];
  const tools = [
    "developer__shell",
    "platform__read_resource",
    "computercontroller__web_search",
  ];

  for (const mcpName of mcpNames) {
    // Starting up
    yield {
      namespace: "mcp_connection_manager",
      type: "info",
      message: `${mcpName}: Initializing server session`,
      data: {},
    };
    console.log(`Debug: Connection established for ${mcpName}`);
    await setTimeout(500);

    // Initialized
    yield {
      namespace: "mcp_connection_manager",
      type: "info",
      message: `${mcpName}: Session initialized`,
      data: {},
    };
    await setTimeout(500);

    // Simulate some chat turns
    for (let turn = 1; turn <= 3; turn++) {
      const model = models[Math.floor(Math.random() * models.length)];

      // Start chat turn
      yield {
        namespace: "mcp_agent.workflow.llm.augmented_llm_openai.myagent",
        type: "info",
        message: `Calling ${model}`,
        data: { model, chat_turn: turn },
      };
      await setTimeout(1000);

      // Maybe call a tool
      if (Math.random() < 0.7) {
        const tool = tools[Math.floor(Math.random() * tools.length)];
        console.log(`Debug: Executing tool ${tool}`);
        yield {
          namespace: "mcp_aggregator",
          type: "info",
          message: `Requesting tool call '${tool}'`,
          data: {},
        };
        await setTimeout(800);
      }

      // Finish chat turn
      yield {
        namespace: "augmented_llm",
        type: "info",
        message: "Finished processing response",
        data: { model },
      };
      await setTimeout(500);
    }

    // Shutdown
    console.log(`Debug: Shutting down ${mcpName}`);
    yield {
      namespace: "mcp_connection_manager",
      type: "info",
      message: `${mcpName}: _lifecycle_task is exiting`,
      data: {},
    };
    await setTimeout(1000);
  }
}

/**
 * Main function to run the progress display test.
 */
async function main(): Promise<void> {
  const listener = new ProgressListener();
  await listener.start();

  try {
    for await (const event of generateTestEvents()) {
      await listener.handleEvent(event);
    }
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    await listener.stop();
  }
}

// Run the script
if (require.main === module) {
  main().catch((err) => {
    console.error("Test interrupted or failed:", err);
    process.exit(1);
  });
}
