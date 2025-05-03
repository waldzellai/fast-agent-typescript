import {
  agent,
  orchestrator,
  parallel,
  evaluatorOptimizer,
} from "../../src/core/directDecorators";

/**
 * Custom application class to manage agents and workflows for data analysis and campaign generation.
 */
class FastAgentApp {
  agents: { [key: string]: any } = {};

  constructor(public name: string) {}

  // Data Analysis Agent
  @agent(
    this,
    "data_analysis",
    "You have access to a Node.js environment where you can use JavaScript to analyze and process data. Common analysis packages such as 'd3' or 'chart.js' can be used if needed. Data files are accessible from the /mnt/data/ directory (this is the current working directory). Visualizations should be saved as .png files in the current working directory. Extract key insights that would be compelling for a social media campaign.",
    {
      servers: ["interpreter"],
      model: "sonnet",
      use_history: true,
    },
  )
  dataAnalysis(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Analyzed data: ${input}`;
  }

  // Evaluator Agent
  @agent(
    this,
    "evaluator",
    "You are collaborating with a Data Analysis tool that has the capability to analyze data and produce visualizations. You must make sure that the tool has: - Considered the best way for a Human to interpret the data - Produced insightful visualizations. - Provided a high level summary report for the Human. - Has had its findings challenged, and justified - Extracted compelling insights suitable for social media promotion",
    {
      model: "gpt-4o",
      use_history: true,
    },
  )
  evaluator(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Evaluated data analysis: ${input}`;
  }

  // Analysis Tool (Evaluator-Optimizer)
  @evaluatorOptimizer(this, "analysis_tool", {
    generator: "data_analysis",
    evaluator: "evaluator",
    max_refinements: 3,
    min_rating: "EXCELLENT",
  })
  analysisTool(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Optimized analysis for: ${input}`;
  }

  // Context Researcher Agent
  @agent(
    this,
    "context_researcher",
    "You are a research specialist who provides cultural context for different regions. For any given data insight and target language/region, research: 1. Cultural sensitivities related to presenting this type of data 2. Local social media trends and preferences 3. Region-specific considerations for marketing campaigns Always provide actionable recommendations for adapting content to each culture.",
    {
      servers: ["fetch", "brave"],
      model: "gpt-4o",
      use_history: true,
    },
  )
  contextResearcher(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Cultural context for: ${input}`;
  }

  // Campaign Generator Agent
  @agent(
    this,
    "campaign_generator",
    "Generate engaging social media content based on data insights. Create compelling, shareable content that: - Highlights key research findings in an accessible way - Uses appropriate tone for the platform (Twitter/X, LinkedIn, Instagram, etc.) - Is concise and impactful - Includes suggested hashtags and posting schedule Format your response with clear sections for each platform. Save different campaign elements as separate files in the current directory.",
    {
      servers: ["filesystem"],
      model: "sonnet",
      use_history: false,
    },
  )
  campaignGenerator(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Generated campaign content for: ${input}`;
  }

  // Translation Agents with Cultural Adaptation
  @agent(
    this,
    "translate_fr",
    "Translate social media content to French with cultural adaptation. Consider French cultural norms, expressions, and social media preferences. Ensure the translation maintains the impact of the original while being culturally appropriate. Save the translated content to a file with appropriate naming.",
    {
      model: "haiku",
      use_history: false,
      servers: ["filesystem"],
    },
  )
  translateFr(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Translated content to French: ${input}`;
  }

  @agent(
    this,
    "translate_es",
    "Translate social media content to Spanish with cultural adaptation. Consider Spanish-speaking cultural contexts, expressions, and social media preferences. Ensure the translation maintains the impact of the original while being culturally appropriate. Save the translated content to a file with appropriate naming.",
    {
      model: "haiku",
      use_history: false,
      servers: ["filesystem"],
    },
  )
  translateEs(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Translated content to Spanish: ${input}`;
  }

  @agent(
    this,
    "translate_de",
    "Translate social media content to German with cultural adaptation. Consider German cultural norms, expressions, and social media preferences. Ensure the translation maintains the impact of the original while being culturally appropriate. Save the translated content to a file with appropriate naming.",
    {
      model: "haiku",
      use_history: false,
      servers: ["filesystem"],
    },
  )
  translateDe(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Translated content to German: ${input}`;
  }

  @agent(
    this,
    "translate_ja",
    "Translate social media content to Japanese with cultural adaptation. Consider Japanese cultural norms, expressions, and social media preferences. Ensure the translation maintains the impact of the original while being culturally appropriate. Save the translated content to a file with appropriate naming.",
    {
      model: "haiku",
      use_history: false,
      servers: ["filesystem"],
    },
  )
  translateJa(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Translated content to Japanese: ${input}`;
  }

  // Parallel Workflow for Translations
  @parallel(this, "translate_campaign", {
    fan_out: ["translate_fr", "translate_es", "translate_de", "translate_ja"],
    instruction:
      "Translates content to French, Spanish, German and Japanese. Supply the content to translate, translations will be saved to the filesystem.",
    include_request: true,
  })
  translateCampaign(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Translated campaign content: ${input}`;
  }

  // Cultural Sensitivity Reviewer Agent
  @agent(
    this,
    "cultural_reviewer",
    "Review all translated content for cultural sensitivity and appropriateness. For each language version, evaluate: - Cultural appropriateness - Potential misunderstandings or sensitivities - Effectiveness for the target culture Provide specific recommendations for any needed adjustments and save a review report.",
    {
      servers: ["filesystem"],
      use_history: true,
    },
  )
  culturalReviewer(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Reviewed cultural sensitivity for: ${input}`;
  }

  // Campaign Optimization Workflow
  @evaluatorOptimizer(this, "campaign_optimizer", {
    generator: "campaign_generator",
    evaluator: "cultural_reviewer",
    max_refinements: 2,
    min_rating: "EXCELLENT",
  })
  campaignOptimizer(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Optimized campaign content for: ${input}`;
  }

  // Main Workflow Orchestration
  @orchestrator(this, "research_campaign_creator", {
    agents: [
      "analysis_tool",
      "context_researcher",
      "campaign_optimizer",
      "translate_campaign",
    ],
    instruction:
      "Create a complete multi-lingual social media campaign based on data analysis results. The workflow will: 1. Analyze the provided data and extract key insights 2. Research cultural contexts for target languages 3. Generate appropriate social media content 4. Translate and culturally adapt the content 5. Review and optimize all materials 6. Save all campaign elements to files",
    model: "sonnet",
    plan_type: "full",
  })
  researchCampaignCreator(input: string): string | Promise<string> {
    // Placeholder for actual implementation
    return `Created research campaign for: ${input}`;
  }

  async run(): Promise<FastAgentApp> {
    // Placeholder for actual runtime initialization
    console.log(`Running ${this.name} with agents:`, Object.keys(this.agents));
    return this;
  }
}

async function main(): Promise<void> {
  console.log(
    "WARNING: This workflow will likely run for >10 minutes and consume a lot of tokens. Press Enter to accept the default prompt and proceed",
  );

  const fast = new FastAgentApp("Data Analysis & Campaign Generator");
  await fast.run();
  const result = await fast.researchCampaignCreator(
    "Analyze the CSV file in the current directory and create a comprehensive multi-lingual social media campaign based on the findings. Save all campaign elements as separate files.",
  );
  console.log(result);
}

if (require.main === module) {
  main().catch(console.error);
}
