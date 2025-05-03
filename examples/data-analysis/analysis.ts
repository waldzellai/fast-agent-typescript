#!/usr/bin/env node
/**
 * Data Analysis Example Script
 * This script demonstrates setting up an agent for data analysis tasks.
 */

import { Agent } from "../../src/mcpAgent";
import { BaseRequestParams } from "../../src/core/requestParams";

// Create the application
const fast = new Agent("Data Analysis (Roots)");

/**
 * Main function to run the data analysis agent.
 */
async function main(): Promise<void> {
  // Define agent configuration for data analysis
  const agentConfig = {
    name: "data_analysis",
    instruction: `
      You have access to tools for data analysis and processing.
      Common analysis packages or equivalents are assumed to be available.
      You can add further packages or tools if needed.
      Data files are accessible from the /mnt/data/ directory (this is the current working directory).
      Visualizations should be saved as .png files in the current working directory.
    `,
    servers: ["interpreter"], // Placeholder for actual server or service integration
    requestParams: { maxTokens: 8192 },
  };

  // Use the app's context manager to run the agent
  // Use send or prompt method as an alternative to run
  const response = await fast.send("Initialize data analysis agent");

  try {
    await fast.send(
      "There is a csv file in the current directory. " +
        "Analyze the file, produce a detailed description of the data, and any patterns it contains.",
    );

    await fast.send(
      "Consider the data, and how to usefully group it for presentation to a Human. Find insights, using available tools as needed.\n" +
        "Use visualization libraries to produce insightful visualizations. Save them as '.png' files in the current directory. Be sure to run the code and save the files.\n" +
        "Produce a summary with major insights to the data",
    );

    // Placeholder for additional interaction or follow-up
    await fast.send("");
  } catch (error) {
    console.error("Error during data analysis:", error);
  } finally {
    // No close method available, skipping for now
    // await fast.close();
  }
}

// Run the script
if (require.main === module) {
  main().catch((err) => {
    console.error("Data analysis script failed:", err);
    process.exit(1);
  });
}

/*
 * Note: This script is a TypeScript adaptation of the original Python script.
 * The actual implementation of a Python interpreter or equivalent data analysis tool integration
 * would need to be developed or referenced from the MCP Agent framework.
 */

/*
 * Example of evaluator/optimizer flow (commented out as in the original)
 * This could be implemented similarly in TypeScript with appropriate framework support.
 */
// const evaluatorConfig = {
//   name: 'evaluator',
//   instruction: `
//     You are collaborating with a Data Analysis tool that has the capability to analyze data and produce visualizations.
//     You must make sure that the tool has:
//      - Considered the best way for a Human to interpret the data
//      - Produced insightful visualizations.
//      - Provided a high level summary report for the Human.
//      - Has had its findings challenged, and justified
//   `,
//   requestParams: new RequestParams({ maxTokens: 8192 }),
// };

// const evaluatorOptimizerConfig = {
//   name: 'analysis_tool',
//   generator: 'data_analysis',
//   evaluator: 'evaluator',
//   maxRefinements: 3,
//   minRating: 'EXCELLENT',
// };
