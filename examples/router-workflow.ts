/**
 * Router Workflow Example
 * 
 * This example demonstrates how to create a router workflow using FastAgent.
 * The router selects between different specialized agents based on the query.
 */

import { FastAgent } from '../src/fastAgent';

// Create a new FastAgent instance
const app = new FastAgent('router-workflow-example');

// Define a programming agent
app.agent({
  name: 'programming',
  instruction: 'You are a programming expert that helps with coding questions and provides code examples.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Programming agent started directly.');
  const response = await agent.send('How do I create a simple HTTP server in Node.js?');
  console.log('Programming response:', response);
});

// Define a history agent
app.agent({
  name: 'history',
  instruction: 'You are a history expert that provides detailed information about historical events and figures.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('History agent started directly.');
  const response = await agent.send('Tell me about the Industrial Revolution.');
  console.log('History response:', response);
});

// Define a science agent
app.agent({
  name: 'science',
  instruction: 'You are a science expert that explains scientific concepts and discoveries.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Science agent started directly.');
  const response = await agent.send('Explain quantum entanglement.');
  console.log('Science response:', response);
});

// Define a router workflow that selects between the specialized agents
app.router({
  name: 'knowledge-router',
  instruction: 'A router that directs queries to the appropriate specialized agent.',
  router_agents: ['programming', 'history', 'science']
}, async (router) => {
  console.log('Starting knowledge router workflow...');
  
  // Test the router with different queries
  const queries = [
    'How do I implement a binary search tree in TypeScript?',
    'What were the main causes of World War I?',
    'Explain how nuclear fusion works.'
  ];
  
  for (const query of queries) {
    console.log(`\nRouting query: "${query}"`);
    const response = await router.execute(query);
    console.log('Response:', response);
  }
  
  // Interactive mode
  console.log('\nStarting interactive mode with the router...');
  await router.prompt('Ask me anything about programming, history, or science!');
});

// Run the application
if (require.main === module) {
  app.run();
}
