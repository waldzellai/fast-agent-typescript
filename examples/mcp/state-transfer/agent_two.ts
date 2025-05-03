#!/usr/bin/env node
/**
 * Agent Two Example Script
 * This script demonstrates setting up a simple agent for interaction with a connection to agent_one.
 */

import { Agent } from "../../../src/mcpAgent";

/**
 * Main function to run the agent.
 */
async function main(): Promise<void> {
  // Create the application
  const fast = new Agent("fast-agent agent_two (mcp client)");

  // Run the agent interactively
  try {
    console.log(
      "Starting agent two interactive session with connection to agent_one...",
    );
    await fast.prompt();
  } catch (error) {
    console.error("Error during agent interaction:", error);
  }
}

// Run the script
if (require.main === module) {
  main().catch((err) => {
    console.error("Agent two script failed:", err);
    process.exit(1);
  });
}
