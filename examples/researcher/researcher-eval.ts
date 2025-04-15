import { Agent } from "../../src/mcpAgent";

// Define the Researcher agent
const researcher = new Agent(
  {
    name: "Researcher",
    agent_type: "agent",
    instruction: `
You are a research assistant, with access to internet search (via Brave),
website fetch, a python interpreter (you can install packages with uv) and a filesystem.
Use the current working directory to save and create files with both the Interpreter and Filesystem tools.
The interpreter has numpy, pandas, matplotlib and seaborn already installed.

You must always provide a summary of the specific sources you have used in your research.
    `,
    servers: ["brave", "interpreter", "filesystem", "fetch"],
  },
  [],
  true,
);

// Define the Evaluator agent
const evaluator = new Agent(
  {
    name: "Evaluator",
    agent_type: "agent",
    model: "sonnet",
    instruction: `
Evaluate the response from the researcher based on the criteria:
 - Sources cited. Has the researcher provided a summary of the specific sources used in the research?
 - Validity. Has the researcher cross-checked and validated data and assumptions.
 - Alignment. Has the researcher acted and addressed feedback from any previous assessments?
 
For each criterion:
- Provide a rating (EXCELLENT, GOOD, FAIR, or POOR).
- Offer specific feedback or suggestions for improvement.

Summarize your evaluation as a structured response with:
- Overall quality rating.
- Specific feedback and areas for improvement.
    `,
  },
  [],
  true,
);

async function main(): Promise<void> {
  const maxRefinements = 5;
  const minRating = "EXCELLENT";
  let refinements = 0;
  let researcherResponse = "";
  let evaluation = "";

  // Initial prompt to Researcher
  const initialPrompt =
    "Please conduct research on a topic of your choice and provide a detailed report.";
  console.log("Sending initial prompt to Researcher...");
  researcherResponse = await researcher.prompt(initialPrompt);

  // Evaluation loop
  while (refinements < maxRefinements) {
    console.log(`Evaluation round ${refinements + 1} of ${maxRefinements}`);
    const evaluationPrompt = `Please evaluate the following response from the Researcher:\n\n${researcherResponse}`;
    evaluation = await evaluator.prompt(evaluationPrompt);

    console.log("Evaluation:", evaluation);

    // Check if the evaluation meets the minimum rating
    if (evaluation.toUpperCase().includes(minRating)) {
      console.log("Evaluation meets the minimum rating of", minRating);
      break;
    }

    // If not, refine the research based on feedback
    refinements++;
    const refinementPrompt = `Based on the following evaluation, please refine your research:\n\n${evaluation}`;
    console.log(`Refinement ${refinements}: Sending feedback to Researcher...`);
    researcherResponse = await researcher.prompt(refinementPrompt);
  }

  console.log("Final Researcher Response:", researcherResponse);
  console.log("Final Evaluation:", evaluation);

  console.log("Ask follow up questions to the Researcher?");
  await researcher.prompt("STOP");
}

if (require.main === module) {
  main().catch(console.error);
}
