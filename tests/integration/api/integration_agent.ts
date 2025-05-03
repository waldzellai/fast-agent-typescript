/**
 * Simple test agent for integration testing.
 * TypeScript port of integration_agent.py
 */

import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import * as readline from 'readline';

// Create the application
const fast = new FastAgent('Integration Test Agent');

// Define a simple agent
fast.agent({
  name: 'test', // Important: This name matches what we use in the CLI test
  instruction: 'You are a test agent that simply echoes back any input received.'
}, async (agent: BaseAgent) => {
  // This executes only for interactive mode, not needed for command-line testing
  if (process.stdin.isTTY) { // Only run interactive mode if attached to a terminal
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Enter a message: ', async (userInput) => {
      const response = await agent.send(userInput);
      console.log(`Agent response: ${response}`);
      rl.close();
    });
  }
});

// Run the agent if this file is executed directly
if (require.main === module) {
  fast.run().catch(err => {
    console.error('Error running agent:', err);
    process.exit(1);
  });
}

// Export for testing
export { fast };
