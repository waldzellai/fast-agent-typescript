/**
 * OTEL Structured Output Example
 * 
 * This example demonstrates how to use FastAgent with structured outputs
 * and OpenTelemetry for tracing.
 */

import { FastAgent } from '../../src/fastAgent';
import { Prompt } from '../../src/core/prompt';
import { RequestParams } from '../../src/core/requestParams';

// Create the application
const fast = new FastAgent('fast-agent example');

// Define the structured response interface
interface FormattedResponse {
  thinking: string; // Reflection not seen by the user
  message: string;  // Response to send to the user
}

// Define the agent with OpenTelemetry tracing enabled
fast.agent({
  name: 'chat',
  instruction: 'You are a helpful AI Agent',
  servers: ['fetch'],
  // Set maxTokens parameter for the request
  default_request_params: {
    maxTokens: 8192
  }
}, async (agent) => {
  // Generate a structured response with thinking and message fields
  // The equivalent of Python's structured() method
  const [thinking, response] = await agent.sendWithSchema<FormattedResponse>(
    [Prompt.user("Let's talk about guitars.")],
    {
      thinking: "Your reflection on the conversation that is not seen by the user.",
      message: "string"
    }
  );

  console.log('Thinking:', thinking);
  console.log('Response:', response);
});

// Run the agent if this file is executed directly
if (require.main === module) {
  fast.run();
}