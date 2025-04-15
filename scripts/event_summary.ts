#!/usr/bin/env ts-node
/**
 * MCP Event Summary Script
 *
 * Summarizes events from a JSONL log file with a formatted console display.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Define the Event interface
interface Event {
  type: string;
  namespace: string;
  message: string;
  timestamp: Date;
  data: Record<string, any>;
}

// Define ProgressAction enum
enum ProgressAction {
  CHATTING = "Chatting",
  CALLING_TOOL = "Tool Call",
  // Add other actions if needed based on convertLogEvent logic
}

// Define ProgressEvent interface
interface ProgressEvent {
  action: ProgressAction;
  target: string;
  details: string;
}

// Function to load events from a JSONL file
function loadEvents(filePath: string): Promise<Event[]> {
  return new Promise((resolve, reject) => {
    const events: Event[] = [];
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      if (line.trim()) {
        try {
          const rawEvent = JSON.parse(line);
          const event: Event = {
            type: rawEvent.level?.toLowerCase() || "info",
            namespace: rawEvent.namespace || "",
            message: rawEvent.message || "",
            timestamp: new Date(rawEvent.timestamp),
            data: rawEvent.data || {},
          };
          events.push(event);
        } catch (error) {
          console.error(`Error parsing line: ${line}`, error);
        }
      }
    });

    rl.on("error", (error) => {
      reject(error);
    });

    rl.on("close", () => {
      resolve(events);
    });
  });
}

// Simplified conversion of log event to progress event
function convertLogEvent(event: Event): ProgressEvent | null {
  // This is a placeholder. In a real implementation, you would
  // analyze the event message or data to determine the action.
  if (event.type === "info") {
    if (event.message.includes("chat") || event.message.includes("message")) {
      return {
        action: ProgressAction.CHATTING,
        target: event.namespace || "Unknown",
        details: event.message,
      };
    } else if (
      event.message.includes("tool") ||
      event.message.includes("call")
    ) {
      return {
        action: ProgressAction.CALLING_TOOL,
        target: event.namespace || "Unknown",
        details: event.message,
      };
    }
  }
  return null;
}

// Function to create a summary of events
function createSummary(events: Event[]): {
  mcps: Set<string>;
  chatting: number;
  toolCalls: number;
} {
  const mcps = new Set<string>();
  let chatting = 0;
  let toolCalls = 0;

  for (const event of events) {
    if (event.type === "info") {
      if (event.namespace.includes("mcp_connection_manager")) {
        const message = event.message;
        if (message.includes(": ")) {
          const mcpName = message.split(": ")[0];
          mcps.add(mcpName);
        }
      }
    }

    const progressEvent = convertLogEvent(event);
    if (progressEvent) {
      if (progressEvent.action === ProgressAction.CHATTING) {
        chatting++;
      } else if (progressEvent.action === ProgressAction.CALLING_TOOL) {
        toolCalls++;
      }
    }
  }

  return { mcps, chatting, toolCalls };
}

// Function to display summary
function displaySummary(summary: {
  mcps: Set<string>;
  chatting: number;
  toolCalls: number;
}): void {
  console.log("\n=== Event Statistics ===");
  console.log("Summary:\n");
  console.log(`MCPs: ${Array.from(summary.mcps).sort().join(", ")}`);
  console.log(`Chat Turns: ${summary.chatting}`);
  console.log(`Tool Calls: ${summary.toolCalls}`);
  console.log("=======================\n");
}

// Function to display event table
function displayEventTable(events: Event[]): void {
  // Convert events to progress events and filter duplicates
  const progressEvents: Array<{
    progressEvent: ProgressEvent;
    originalEvent: Event;
  }> = [];
  for (const event of events) {
    const progressEvent = convertLogEvent(event);
    if (progressEvent) {
      const lastEvent =
        progressEvents.length > 0
          ? progressEvents[progressEvents.length - 1].progressEvent
          : null;
      if (
        !lastEvent ||
        `${progressEvent.action}${progressEvent.target}${progressEvent.details}` !==
          `${lastEvent.action}${lastEvent.target}${lastEvent.details}`
      ) {
        progressEvents.push({ progressEvent, originalEvent: event });
      }
    }
  }

  console.log("=== Progress Events ===");
  // Simple table header
  const header = [
    "Agent".padEnd(20),
    "Action".padEnd(12),
    "Target".padEnd(30),
    "Details".padEnd(30),
  ].join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  // Table rows
  for (const { progressEvent, originalEvent } of progressEvents) {
    let agent = "";
    try {
      agent = originalEvent.data?.data?.agent_name || "";
      if (!agent) {
        agent = originalEvent.namespace.split(".").pop() || "";
      }
    } catch (error) {
      agent = originalEvent.namespace.split(".").pop() || "";
    }
    const row = [
      agent.padEnd(20).slice(0, 20),
      progressEvent.action.padEnd(12).slice(0, 12),
      progressEvent.target.padEnd(30).slice(0, 30),
      (progressEvent.details || "").padEnd(30).slice(0, 30),
    ].join(" | ");
    console.log(row);
  }
  console.log("=======================\n");
}

// Main function to summarize events
async function main(logFile: string): Promise<void> {
  // Validate file path
  const filePath = path.resolve(logFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Log file not found: ${filePath}`);
    process.exit(1);
  }

  // Load events from file
  console.log(`Loading events from ${filePath}...`);
  const events = await loadEvents(filePath);
  console.log(`Loaded ${events.length} events.`);

  // Create and display summary
  const summary = createSummary(events);
  displaySummary(summary);

  // Display event table
  displayEventTable(events);
}

// Execute main function with command line argument
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: event_summary.ts <log_file>");
    process.exit(1);
  }
  main(args[0]).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
