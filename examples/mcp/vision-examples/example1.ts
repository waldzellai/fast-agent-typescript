/**
 * Example 1: Vision example using FastAgent
 * 
 * This example demonstrates how to use FastAgent with vision capabilities
 * by sending an image file to the agent and instructing it to write a report.
 */

import { resolve } from 'path';
import { FastAgent } from '../../../src/fastAgent';
import { Prompt } from '../../../src/core/prompt';

// Create the application
const fast = new FastAgent('fast-agent example');

// Define the agent with filesystem server access
fast.agent({
  instruction: 'You are a helpful AI Agent',
  servers: ['filesystem']
}, async (agent) => {
  // Use image file from the current directory
  const imagePath = resolve(__dirname, 'cat.png');
  
  // Send the image to the agent with instructions
  await agent.send([
    Prompt.user(imagePath, 'Write a report on the content of the image to \'report.md\'')
  ]);
  
  // Start interactive session
  await agent.prompt();
});

// Run the agent if this file is executed directly
if (require.main === module) {
  fast.run();
}