import { Agent, HumanInputCallback } from "../../src/mcpAgent";

/**
 * Agent which demonstrates Human Input tool
 */

// Define a simple human input callback
const humanInputCallback: HumanInputCallback = async (
  input: string,
): Promise<string> => {
  console.log(`Human input requested for: ${input}`);
  return `Human response to: ${input}`;
};

// Create agent instance with human input enabled
const agent = new Agent(
  {
    name: "human_input_agent",
    instruction:
      "An AI agent that assists with basic tasks. Request Human Input when needed.",
  },
  [],
  true,
  humanInputCallback,
);

async function main(): Promise<void> {
  try {
    // Send a message that usually causes the LLM to request Human Input
    console.log("Sending message to agent...");
    const response = await agent.send("print the next number in the sequence");
    console.log(`Agent response: ${response}`);

    // Use prompt with a default message to stop interaction
    console.log("Starting interactive prompt session...");
    const promptResult = await agent.prompt("STOP");
    console.log(`Prompt session result: ${promptResult}`);
  } catch (error) {
    console.error("Error in human input workflow:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
