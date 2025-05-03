#!/usr/bin/env ts-node
/**
 * MCP Event Viewer Script
 *
 * Interactively views events from a JSONL log file with a simple console display.
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

// Class to manage event display and navigation
class EventDisplay {
  private events: Event[];
  private total: number;
  private current: number;
  private currentIteration: number | null;
  private toolCalls: number;
  private progressEvents: ProgressEvent[];

  constructor(events: Event[]) {
    this.events = events;
    this.total = events.length;
    this.current = 0;
    this.currentIteration = null;
    this.toolCalls = 0;
    this.progressEvents = [];
    this.processCurrent();
  }

  next(steps: number = 1): void {
    for (let i = 0; i < steps; i++) {
      if (this.current < this.total - 1) {
        this.current++;
        this.processCurrent();
      }
    }
  }

  prev(steps: number = 1): void {
    if (this.current > 0) {
      this.current = Math.max(0, this.current - steps);
      this.rebuildProgressEvents();
    }
  }

  private rebuildProgressEvents(): void {
    this.progressEvents = [];
    for (let i = 0; i <= this.current; i++) {
      const progressEvent = convertLogEvent(this.events[i]);
      if (progressEvent) {
        if (
          this.progressEvents.length === 0 ||
          `${progressEvent.action}${progressEvent.target}${progressEvent.details}` !==
            `${this.progressEvents[this.progressEvents.length - 1].action}${this.progressEvents[this.progressEvents.length - 1].target}${this.progressEvents[this.progressEvents.length - 1].details}`
        ) {
          this.progressEvents.push(progressEvent);
        }
      }
    }
  }

  private processCurrent(): void {
    const event = this.events[this.current];
    const message = event.message;

    if (message.includes("Iteration")) {
      try {
        const iterationPart = message
          .split("Iteration")[1]
          .split(":")[0]
          .trim();
        this.currentIteration = parseInt(iterationPart, 10);
      } catch (error) {
        // Ignore parsing errors
      }
    }

    if (message.includes("Tool call") || message.includes("Calling tool")) {
      this.toolCalls++;
    }

    const progressEvent = convertLogEvent(event);
    if (progressEvent) {
      if (
        this.progressEvents.length === 0 ||
        `${progressEvent.action}${progressEvent.target}${progressEvent.details}` !==
          `${this.progressEvents[this.progressEvents.length - 1].action}${this.progressEvents[this.progressEvents.length - 1].target}${this.progressEvents[this.progressEvents.length - 1].details}`
      ) {
        this.progressEvents.push(progressEvent);
      }
    }
  }

  render(): void {
    console.clear();
    console.log("=== MCP Event Viewer ===");

    // Status Section
    console.log("\n--- Status ---");
    console.log(`Iteration: ${this.currentIteration || "None"}`);
    console.log(`Event: ${this.current + 1}/${this.total}`);
    console.log(`Tool Calls: ${this.toolCalls}`);
    if (this.events.length > 0) {
      const event = this.events[this.current];
      const eventStr = `[${event.type}] ${event.namespace}: ${event.message}`;
      console.log(eventStr);
    }

    // Progress Section
    console.log("\n--- Progress ---");
    if (this.progressEvents.length > 0) {
      const latestEvent = this.progressEvents[this.progressEvents.length - 1];
      console.log(`Action: ${latestEvent.action}`);
      console.log(`Target: ${latestEvent.target}`);
      try {
        const currentEvent = this.events[this.current];
        let agent = currentEvent.data?.data?.agent_name || "";
        if (!agent) {
          agent = currentEvent.namespace.split(".").pop() || "";
        }
        if (agent) {
          console.log(`Agent: ${agent}`);
        }
      } catch (error) {
        // Skip agent display if data is malformed
      }
      if (latestEvent.details) {
        console.log(`Details: ${latestEvent.details}`);
      }
    } else {
      console.log("No progress events yet");
    }

    // Controls Section
    console.log("\n--- Controls ---");
    console.log("[h] prev • [l] next • [H] prev x10 • [L] next x10 • [q] quit");
    console.log("==================");
  }
}

// Main function to view events interactively
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

  if (events.length === 0) {
    console.log("No events loaded!");
    return;
  }

  const display = new EventDisplay(events);

  // Set up readline for keyboard input
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  display.render();

  process.stdin.on("keypress", (str, key) => {
    if (key.name === "l") {
      display.next();
      display.render();
    } else if (key.name === "L") {
      display.next(10);
      display.render();
    } else if (key.name === "h") {
      display.prev();
      display.render();
    } else if (key.name === "H") {
      display.prev(10);
      display.render();
    } else if (key.name === "q" || (key.ctrl && key.name === "c")) {
      console.clear();
      console.log("Exiting MCP Event Viewer.");
      process.exit(0);
    }
  });
}

// Execute main function with command line argument
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: event_viewer.ts <log_file>");
    process.exit(1);
  }
  main(args[0]).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
