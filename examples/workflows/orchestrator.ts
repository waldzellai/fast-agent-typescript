/**
 * This demonstrates creating multiple agents and an orchestrator to coordinate them.
 */

import { MultiAgentOrchestrator } from "../../agent-orchestrator-ts/src/orchestrator";
import { Agent as MCPAgent } from "../../src/mcpAgent";
import { Agent as OrchestratorAgent } from "../../agent-orchestrator-ts/src/agents/agent";
import { ConversationMessage } from "../../agent-orchestrator-ts/src/types";

// Create agent instances
class AgentAdapter extends OrchestratorAgent {
  private mcpAgent: MCPAgent;
  private agentServers: string[] = [];

  constructor(config: {
    name: string;
    instruction: string;
    servers?: string[];
  }) {
    super({
      name: config.name,
      description: config.instruction,
    });
    this.mcpAgent = new MCPAgent({
      name: config.name,
      instruction: config.instruction,
    });
    this.agentServers = config.servers || [];
  }

  async processRequest(
    inputText: string,
    userId: string,
    sessionId: string,
    chatHistory: ConversationMessage[],
    additionalParams?: Record<string, any>,
  ): Promise<ConversationMessage | AsyncIterable<any>> {
    // Use the 'send' method from MCPAgent to process the input text
    const responseText = await this.mcpAgent.send(inputText);
    return {
      role: "AGENT" as any, // Adjusted to match expected ParticipantRole type
      content: [responseText], // Adjusted to match expected content type as array
    };
  }

  getModel(): string {
    return "custom-mcp-model";
  }

  getChilds(): { [key: string]: any } {
    return {};
  }

  get servers(): string[] {
    return this.agentServers;
  }
}

const author = new AgentAdapter({
  name: "author",
  instruction: `You are to role play a poorly skilled writer,
    who makes frequent grammar, punctuation, and spelling errors. You enjoy
    writing short stories, but the narrative doesn't always make sense`,
  servers: ["filesystem"],
});

const finder = new AgentAdapter({
  name: "finder",
  instruction: `You are an agent with access to the filesystem,
    as well as the ability to fetch URLs. Your job is to identify
    the closest match to a user's request, make the appropriate tool calls,
    and return the URI and CONTENTS of the closest match.`,
  servers: ["fetch", "filesystem"],
});

const writer = new AgentAdapter({
  name: "writer",
  instruction: `You are an agent that can write to the filesystem.
    You are tasked with taking the user's input, addressing it, and
    writing the result to disk in the appropriate location.`,
  servers: ["filesystem"],
});

const proofreader = new AgentAdapter({
  name: "proofreader",
  instruction: `Review the short story for grammar, spelling, and punctuation errors.
    Identify any awkward phrasing or structural issues that could improve clarity.
    Provide detailed feedback on corrections.`,
  servers: ["fetch"],
});

// Define the orchestrator to coordinate the other agents
const orchestrator = new MultiAgentOrchestrator();

orchestrator.addAgent(finder);
orchestrator.addAgent(writer);
orchestrator.addAgent(proofreader);

async function main(): Promise<void> {
  try {
    // Step 1: Author writes a short story
    console.log(
      "Author is writing a short story about kittens discovering a castle...",
    );
    const storyRequest =
      "write a 250 word short story about kittens discovering a castle, and save it to short_story.md";
    const storyResponse = await author.processRequest(
      storyRequest,
      "user1",
      "session1",
      [],
    );
    if ("content" in storyResponse) {
      console.log(
        "Story written:",
        storyResponse.content?.[0] || "No content available",
      );
    } else {
      console.log(
        "Story written: Response is an async iterable, content not directly accessible.",
      );
    }

    // Step 2: Use the orchestrator to coordinate the review and feedback process
    const orchestrateTask = `Load the student's short story from short_story.md, 
      and generate a report with feedback across proofreading, 
      factuality/logical consistency and style adherence. Use the style rules from 
      https://apastyle.apa.org/learn/quick-guide-on-formatting and 
      https://apastyle.apa.org/learn/quick-guide-on-references.
      Write the graded report to graded_report.md in the same directory as short_story.md`;
    console.log("Starting orchestration for feedback and report generation...");

    // Use the orchestrator to handle the task
    const orchestrateResponse = await orchestrator.routeRequest(
      orchestrateTask,
      "user1",
      "session1",
    );
    console.log("Orchestration completed:", orchestrateResponse);
  } catch (error) {
    console.error("Error in workflow:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
