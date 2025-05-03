/**
 * Parallel Workflow showing Fan Out and Fan In agents, using different models
 */

import { Agent } from "../../src/mcpAgent";

// Create agent instances for the parallel workflow
const proofreader = new Agent({
  name: "proofreader",
  instruction: `Review the short story for grammar, spelling, and punctuation errors.
    Identify any awkward phrasing or structural issues that could improve clarity. 
    Provide detailed feedback on corrections.`,
  servers: ["fetch"],
  model: "gpt-4o",
});

const factChecker = new Agent({
  name: "fact_checker",
  instruction: `Verify the factual consistency within the story. Identify any contradictions,
    logical inconsistencies, or inaccuracies in the plot, character actions, or setting. 
    Highlight potential issues with reasoning or coherence.`,
  servers: ["fetch"],
  model: "gpt-4o",
});

const styleEnforcer = new Agent({
  name: "style_enforcer",
  instruction: `Analyze the story for adherence to style guidelines.
    Evaluate the narrative flow, clarity of expression, and tone. Suggest improvements to 
    enhance storytelling, readability, and engagement.`,
  servers: ["fetch"],
  model: "sonnet",
});

const grader = new Agent({
  name: "grader",
  instruction: `Compile the feedback from the Proofreader, Fact Checker, and Style Enforcer
    into a structured report. Summarize key issues and categorize them by type. 
    Provide actionable recommendations for improving the story, 
    and give an overall grade based on the feedback.`,
  servers: ["filesystem"],
  model: "o3-mini.low",
});

async function main(): Promise<void> {
  try {
    // Step 1: Load the short story content
    console.log("Loading student short story submission...");
    const storyRequest = "Student short story submission from short_story.txt";

    // Step 2: Fan-out - Send the story to multiple agents in parallel for review
    console.log("Sending story for parallel review by multiple agents...");
    const [proofreaderResponse, factCheckerResponse, styleEnforcerResponse] =
      await Promise.all([
        proofreader.send(storyRequest).then((response) => {
          console.log("Proofreader feedback received:", response);
          return response;
        }),
        factChecker.send(storyRequest).then((response) => {
          console.log("Fact Checker feedback received:", response);
          return response;
        }),
        styleEnforcer.send(storyRequest).then((response) => {
          console.log("Style Enforcer feedback received:", response);
          return response;
        }),
      ]);

    // Step 3: Fan-in - Compile feedback from all agents into a final report
    console.log("Compiling feedback into a final graded report...");
    const combinedFeedback = `Feedback Compilation:
      Proofreader Feedback: ${proofreaderResponse}
      Fact Checker Feedback: ${factCheckerResponse}
      Style Enforcer Feedback: ${styleEnforcerResponse}`;

    const graderResponse = await grader.send(combinedFeedback);
    console.log("Graded report compiled:", graderResponse);
  } catch (error) {
    console.error("Error in parallel workflow:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
