#!/usr/bin/env ts-node
/**
 * Event Replay Script
 *
 * Replays events from a JSONL log file with a simple console display.
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

// Simple progress display simulation
class SimpleProgressDisplay {
  private isRunning: boolean = false;

  start(): void {
    this.isRunning = true;
    console.log("Starting event replay...");
  }

  update(event: Event): void {
    if (this.isRunning) {
      console.log(
        `[${event.timestamp.toISOString()}] ${event.type.toUpperCase()} - ${event.namespace}: ${event.message}`,
      );
      if (Object.keys(event.data).length > 0) {
        console.log("  Data:", JSON.stringify(event.data, null, 2));
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log("Event replay completed.");
  }
}

// Main function to replay events
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

  // Initialize progress display
  const progress = new SimpleProgressDisplay();
  progress.start();

  try {
    // Process each event in sequence
    for (const event of events) {
      progress.update(event);
      // Add a small delay to make the replay visible (1000ms = 1 second)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("Error during replay:", error);
  } finally {
    progress.stop();
  }
}

// Execute main function with command line argument
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: event_replay.ts <log_file>");
    process.exit(1);
  }
  main(args[0]).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
