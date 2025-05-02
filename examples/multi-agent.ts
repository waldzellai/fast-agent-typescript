/**
 * Multi-Agent FastAgent Example
 * 
 * This example demonstrates how to create multiple agents using FastAgent.
 */

import { FastAgent } from '../src/fastAgent';

// Create a new FastAgent instance
const app = new FastAgent('multi-agent-example');

// Define a researcher agent
app.agent({
  name: 'researcher',
  instruction: 'You are a research assistant that provides detailed information on topics.',
}, async (agent) => {
  console.log('Starting researcher agent...');
  
  // Send a message to the agent
  const response = await agent.send('What are the key benefits of TypeScript over JavaScript?');
  console.log('Researcher response:', response);
});

// Define a summarizer agent
app.agent({
  name: 'summarizer',
  instruction: 'You are a summarization assistant that condenses information into concise points.',
}, async (agent) => {
  console.log('Starting summarizer agent...');
  
  // Send a message to the agent
  const response = await agent.send('Summarize the key benefits of TypeScript over JavaScript in 3 bullet points.');
  console.log('Summarizer response:', response);
});

// Define an interactive agent
app.agent({
  name: 'interactive',
  instruction: 'You are a helpful assistant that engages in conversation with the user.',
  human_input: true
}, async (agent) => {
  console.log('Starting interactive agent...');
  
  // Start an interactive prompt session
  await agent.prompt('Ask me anything about programming languages!');
});

// Run the agents
if (require.main === module) {
  app.run();
}
