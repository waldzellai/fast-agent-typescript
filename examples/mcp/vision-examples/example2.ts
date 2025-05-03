/**
 * Example 2: Simple interactive vision agent
 * 
 * This example demonstrates a simple FastAgent setup with
 * vision capabilities through the filesystem server.
 */

import { FastAgent } from '../../../src/fastAgent';

// Create the application
const fast = new FastAgent('fast-agent example');

// Define the agent with filesystem server access
fast.agent({
  instruction: 'You are a helpful AI Agent',
  servers: ['filesystem']
}, async (agent) => {
  // Start an interactive session
  await agent.prompt();
});

// Run the agent if this file is executed directly
if (require.main === module) {
  fast.run();
}