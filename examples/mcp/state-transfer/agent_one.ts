#!/usr/bin/env node
/**
 * Agent One Example Script
 * This script demonstrates setting up a simple agent for interaction.
 */

import { Agent } from "../../../src/mcpAgent";

/**
 * Main function to run the agent.
 */
async function main(): Promise<void> {
  // Create the application
  const fast = new Agent("fast-agent agent_one (mcp server)");

  // Run the agent interactively
  try {
    console.log("Starting agent one interactive session...");
    await fast.prompt();
  } catch (error) {
    console.error("Error during agent interaction:", error);
  }
}

// Run the script
if (require.main === module) {
  main().catch((err) => {
    console.error("Agent one script failed:", err);
    process.exit(1);
  });
}
