/**
 * Example 3: Vision agent with webcam and Hugging Face space servers
 * 
 * This example demonstrates how to create a FastAgent with webcam and
 * Hugging Face space server connections for interactive image tasks.
 */

import { FastAgent } from '../../../src/fastAgent';

// Create the application
const fast = new FastAgent('fast-agent example');

// Define the agent with webcam and Hugging Face space servers
fast.agent({
  instruction: 'You are a helpful AI Agent',
  servers: ['webcam', 'hfspace']
}, async (agent) => {
  // Start an interactive session with a default prompt
  await agent.prompt(
    'take an image with the webcam, describe it to flux to ' +
    'reproduce it and then judge the quality of the result'
  );
});

// Run the agent if this file is executed directly
if (require.main === module) {
  fast.run();
}