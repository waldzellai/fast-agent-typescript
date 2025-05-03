import { Agent } from "../../src/mcpAgent";

/**
 * This demonstrates creating an optimizer and evaluator to iteratively improve content.
 */

// Create agent instances
const generator = new Agent({
  name: "generator",
  instruction: `You are a career coach specializing in cover letter writing.
  You are tasked with generating a compelling cover letter given the job posting,
  candidate details, and company information. Tailor the response to the company and job requirements.`,
  servers: ["fetch"],
  model: "haiku3",
  use_history: true,
});

const evaluator = new Agent({
  name: "evaluator",
  instruction: `Evaluate the following response based on the criteria below:
  1. Clarity: Is the language clear, concise, and grammatically correct?
  2. Specificity: Does the response include relevant and concrete details tailored to the job description?
  3. Relevance: Does the response align with the prompt and avoid unnecessary information?
  4. Tone and Style: Is the tone professional and appropriate for the context?
  5. Persuasiveness: Does the response effectively highlight the candidate's value?
  6. Grammar and Mechanics: Are there any spelling or grammatical issues?
  7. Feedback Alignment: Has the response addressed feedback from previous iterations?

  For each criterion:
  - Provide a rating (EXCELLENT, GOOD, FAIR, or POOR).
  - Offer specific feedback or suggestions for improvement.

  Summarize your evaluation as a structured response with:
  - Overall quality rating.
  - Specific feedback and areas for improvement.`,
  model: "gpt-4o",
});

async function main(): Promise<void> {
  const jobPosting =
    "Software Engineer at LastMile AI. Responsibilities include developing AI systems, collaborating with cross-functional teams, and enhancing scalability. Skills required: Python, distributed systems, and machine learning.";
  const candidateDetails =
    "Alex Johnson, 3 years in machine learning, contributor to open-source AI projects, proficient in Python and TensorFlow. Motivated by building scalable AI systems to solve real-world problems.";
  const companyInformation =
    "Look up from the LastMile AI About page: https://lastmileai.dev/about";

  const initialPrompt = `Write a cover letter for the following job posting: ${jobPosting}\n\nCandidate Details: ${candidateDetails}\n\nCompany information: ${companyInformation}`;

  let currentDraft = "";
  let feedback = "";
  const maxRefinements = 3;
  let achievedExcellent = false;

  try {
    // Initial draft
    console.log("Generating initial cover letter...");
    currentDraft = await generator.send(initialPrompt);
    console.log("Initial draft received.");

    // Iterative refinement loop
    for (let i = 0; i < maxRefinements && !achievedExcellent; i++) {
      console.log(`Evaluation round ${i + 1} of ${maxRefinements}...`);
      feedback = await evaluator.send(currentDraft);
      console.log(`Feedback received: ${feedback}`);

      // Check if feedback contains "EXCELLENT" rating
      if (
        feedback.toUpperCase().includes("OVERALL QUALITY RATING: EXCELLENT")
      ) {
        console.log("Achieved EXCELLENT rating. Stopping refinements.");
        achievedExcellent = true;
      } else {
        // Refine based on feedback
        console.log(`Refining draft based on feedback (iteration ${i + 1})...`);
        const refinePrompt = `Revise the cover letter based on the following feedback:\n\n${feedback}\n\nOriginal prompt: ${initialPrompt}`;
        currentDraft = await generator.send(refinePrompt);
        console.log(`Revised draft ${i + 1} received.`);
      }
    }

    console.log("Final cover letter:");
    console.log(currentDraft);
    if (!achievedExcellent) {
      console.log(
        "Maximum refinements reached without achieving EXCELLENT rating.",
      );
    }
  } catch (error) {
    console.error("Error in evaluator-optimizer workflow:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
