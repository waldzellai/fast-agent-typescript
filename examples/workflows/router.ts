/**
 * Example MCP Agent application showing router workflow.
 * Demonstrates router's ability to either:
 * 1. Use tools directly to handle requests
 * 2. Delegate requests to specialized agents
 */

import { Agent } from "../../src/mcpAgent";

// Create specialized agent instances
const fetcher = new Agent({
  name: "fetcher",
  instruction: "You are an agent with a tool enabling you to fetch URLs.",
  servers: ["fetch"],
});

const codeExpert = new Agent({
  name: "code_expert",
  instruction: `You are an expert in code analysis and software engineering.
  When asked about code, architecture, or development practices,
  you provide thorough and practical insights.`,
  servers: ["filesystem"],
});

const generalAssistant = new Agent({
  name: "general_assistant",
  instruction: `You are a knowledgeable assistant that provides clear,
  well-reasoned responses about general topics, concepts, and principles.`,
});

// Create the router agent
const router = new Agent({
  name: "router",
  instruction: `You are a router that delegates requests to the appropriate specialized agent based on the content of the request.
  - If the request involves fetching a URL or downloading content, delegate to 'fetcher'.
  - If the request is about code, programming, or software analysis, delegate to 'code_expert'.
  - For general knowledge or other topics, delegate to 'general_assistant'.
  Respond with a message indicating which agent you are delegating to, formatted as: "Delegating to [agent_name] for: [original request]"`,
  model: "sonnet",
});

// Sample requests demonstrating direct tool use vs agent delegation
const SAMPLE_REQUESTS = [
  "Download and summarize https://llmindset.co.uk/posts/2024/12/mcp-build-notes/", // Should be delegated to fetcher
  "Analyze the quality of the Python codebase in the current working directory", // Should be delegated to code expert
  "What are the key principles of effective beekeeping?", // Should be delegated to general assistant
];

async function main(): Promise<void> {
  try {
    console.log("Starting router workflow...");
    for (const request of SAMPLE_REQUESTS) {
      console.log(`Processing request: ${request}`);
      const routerResponse = await router.send(request);
      console.log(`Router response: ${routerResponse}`);

      // Parse the router's response to determine which agent to delegate to
      if (routerResponse.includes("Delegating to fetcher")) {
        const fetcherResponse = await fetcher.send(request);
        console.log(`Fetcher response: ${fetcherResponse}`);
      } else if (routerResponse.includes("Delegating to code_expert")) {
        const codeExpertResponse = await codeExpert.send(request);
        console.log(`Code Expert response: ${codeExpertResponse}`);
      } else if (routerResponse.includes("Delegating to general_assistant")) {
        const generalResponse = await generalAssistant.send(request);
        console.log(`General Assistant response: ${generalResponse}`);
      } else {
        console.log(
          "No delegation detected, handling directly by router if possible.",
        );
      }
    }
  } catch (error) {
    console.error("Error in router workflow:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
