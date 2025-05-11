/**
 * Chain Workflow Example
 *
 * This example demonstrates how to create a chain workflow using FastAgent.
 * The chain consists of three agents: a researcher, a summarizer, and a formatter.
 */

import { FastAgent } from '../src/fastAgent';

// Create a new FastAgent instance
const app = new FastAgent('chain-workflow-example');

// Define a researcher agent
app.agent(
  {
    name: 'researcher',
    instruction:
      'You are a research assistant that provides detailed information on topics.',
  },
  async (agent) => {
    // This function is called when the agent is run directly
    console.log('Researcher agent started directly.');
    const response = await agent.send(
      'What are the key benefits of TypeScript over JavaScript?'
    );
    console.log('Researcher response:', response);
  }
);

// Define a summarizer agent
app.agent(
  {
    name: 'summarizer',
    instruction:
      'You are a summarization assistant that condenses information into concise points.',
  },
  async (agent) => {
    // This function is called when the agent is run directly
    console.log('Summarizer agent started directly.');
    const response = await agent.send(
      'Summarize the key benefits of TypeScript over JavaScript in 3 bullet points.'
    );
    console.log('Summarizer response:', response);
  }
);

// Define a formatter agent
app.agent(
  {
    name: 'formatter',
    instruction:
      'You are a formatting assistant that formats text into a professional presentation.',
  },
  async (agent) => {
    // This function is called when the agent is run directly
    console.log('Formatter agent started directly.');
    const response = await agent.send(
      'Format the following bullet points into a professional presentation:\n- Static typing\n- Better tooling\n- Object-oriented features'
    );
    console.log('Formatter response:', response);
  }
);

// Define a chain workflow that combines the three agents
app.chain(
  {
    name: 'research-chain',
    instruction:
      'A chain that researches, summarizes, and formats information.',
    sequence: ['researcher', 'summarizer', 'formatter'],
    cumulative: false, // Don't include the original input in each step
  },
  async (chain) => {
    console.log('Starting research chain workflow...');

    // Execute the chain with a query
    const response = await (chain as any).execute(
      'What are the key benefits of TypeScript over JavaScript?'
    );

    console.log('\nFinal Chain Result:');
    console.log(response);
  }
);

// Run the application
if (require.main === module) {
  app.run();
}
