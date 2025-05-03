/**
 * Simple FastAgent Example
 * 
 * This example demonstrates how to create a simple agent using FastAgent.
 */

import { FastAgent } from '../src/fastAgent';

// Create a new FastAgent instance
const app = new FastAgent('simple-agent-example');

// Define an agent with a custom instruction
app.agent({
  name: 'simple',
  instruction: 'You are a helpful assistant that provides concise answers.',
  human_input: true
}, async (agent) => {
  console.log('Starting simple agent...');
  
  // Send a message to the agent
  const response = await agent.send('Hello! What can you help me with today?');
  console.log('Agent response:', response);
  
  // Start an interactive prompt session
  await agent.prompt('Ask me anything!');
});

// Run the agent
if (require.main === module) {
  app.run();
}
