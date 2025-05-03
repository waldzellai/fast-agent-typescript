import { Agent } from "../../src/mcpAgent";

// Create agent instances
const urlFetcher = new Agent({
  name: "url_fetcher",
  instruction: "Given a URL, provide a complete and comprehensive summary",
  servers: ["fetch"],
});

const socialMedia = new Agent({
  name: "social_media",
  instruction: `
    Write a 280 character social media post for any given text. 
    Respond only with the post, never use hashtags.
  `,
});

async function main(): Promise<void> {
  try {
    // Simulate chaining by passing the output of one agent to another
    const url = "https://llmindset.co.uk";
    console.log(`Fetching summary for URL: ${url}`);
    const summary = await urlFetcher.send(url);
    console.log(`Summary received: ${summary}`);

    console.log("Generating social media post...");
    const post = await socialMedia.send(summary);
    console.log(`Social media post: ${post}`);
  } catch (error) {
    console.error("Error in workflow:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
