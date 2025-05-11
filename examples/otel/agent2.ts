/**
 * OTEL Generate Example
 *
 * This example demonstrates how to use FastAgent with the generate method
 * and OpenTelemetry for tracing.
 */

import { FastAgent } from '../../src/fastAgent';
import { Prompt } from '../../src/core/prompt';

// Create the application
const fast = new FastAgent('fast-agent example');

// Define the agent with OpenTelemetry tracing enabled
fast.agent(
  {
    name: 'chat',
    instruction: 'You are a helpful AI Agent',
    servers: ['fetch'],
  },
  async (agent) => {
    // Generate a response using the standard generate method
    const [thinking, response] = await agent.send([
      Prompt.user("Let's talk about guitars. Fetch from wikipedia"),
    ]);

    console.log('Thinking:', thinking);
    console.log('Response:', response);
  }
);

// Run the agent if this file is executed directly
if (require.main === module) {
  fast.run();
}
