/**
 * Orchestrator Workflow Example
 * 
 * This example demonstrates how to create an orchestrator workflow using FastAgent.
 * The orchestrator coordinates a multi-step process involving multiple specialized agents.
 */

import { FastAgent } from '../src/fastAgent';

// Create a new FastAgent instance
const app = new FastAgent('orchestrator-workflow-example');

// Define a research agent
app.agent({
  name: 'researcher',
  instruction: 'You are a research assistant that gathers information on topics.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Researcher agent started directly.');
  const response = await agent.send('Research the history of artificial intelligence.');
  console.log('Researcher response:', response);
});

// Define an outline agent
app.agent({
  name: 'outliner',
  instruction: 'You are an assistant that creates structured outlines for content.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Outliner agent started directly.');
  const response = await agent.send('Create an outline for an article about artificial intelligence.');
  console.log('Outliner response:', response);
});

// Define a writer agent
app.agent({
  name: 'writer',
  instruction: 'You are a content writer that creates well-written articles based on outlines and research.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Writer agent started directly.');
  const response = await agent.send('Write a short article based on this outline: I. Introduction to AI II. History of AI III. Modern Applications IV. Future Directions');
  console.log('Writer response:', response);
});

// Define an editor agent
app.agent({
  name: 'editor',
  instruction: 'You are an editor that improves and polishes written content for clarity, grammar, and style.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Editor agent started directly.');
  const response = await agent.send('Edit and improve this article for clarity and style: [article text]');
  console.log('Editor response:', response);
});

// Define an orchestrator workflow that coordinates the content creation process
app.orchestrator({
  name: 'content-creator',
  instruction: 'An orchestrator that coordinates the process of researching, outlining, writing, and editing content.',
  orchestrator_agents: ['researcher', 'outliner', 'writer', 'editor'],
  max_steps: 10 // Maximum number of steps the orchestrator can take
}, async (orchestrator) => {
  console.log('Starting content creation orchestrator workflow...');
  
  // Execute the orchestrator with a content request
  const topics = [
    'The Impact of Artificial Intelligence on Modern Society',
    'Climate Change: Causes, Effects, and Solutions',
    'The Future of Remote Work in a Post-Pandemic World'
  ];
  
  for (const topic of topics) {
    console.log(`\nCreating content on: "${topic}"`);
    const response = await orchestrator.execute(`Create a comprehensive, well-researched article about "${topic}". The article should be informative, engaging, and well-structured.`);
    console.log('\nFinal Content:');
    console.log(response);
  }
});

// Run the application
if (require.main === module) {
  app.run();
}
