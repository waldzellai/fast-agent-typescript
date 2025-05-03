/**
 * Parallel Workflow Example
 * 
 * This example demonstrates how to create a parallel workflow using FastAgent.
 * The parallel workflow executes multiple agents in parallel and then aggregates their results.
 */

import { FastAgent } from '../src/fastAgent';

// Create a new FastAgent instance
const app = new FastAgent('parallel-workflow-example');

// Define a pros agent
app.agent({
  name: 'pros',
  instruction: 'You are an assistant that lists the pros or advantages of a given topic or decision.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Pros agent started directly.');
  const response = await agent.send('What are the pros of remote work?');
  console.log('Pros response:', response);
});

// Define a cons agent
app.agent({
  name: 'cons',
  instruction: 'You are an assistant that lists the cons or disadvantages of a given topic or decision.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Cons agent started directly.');
  const response = await agent.send('What are the cons of remote work?');
  console.log('Cons response:', response);
});

// Define a neutral agent
app.agent({
  name: 'neutral',
  instruction: 'You are an assistant that provides a balanced, neutral perspective on a given topic or decision.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Neutral agent started directly.');
  const response = await agent.send('What is a balanced view of remote work?');
  console.log('Neutral response:', response);
});

// Define a summarizer agent for fan-in
app.agent({
  name: 'summarizer',
  instruction: 'You are a summarization assistant that combines multiple perspectives into a comprehensive overview.',
}, async (agent) => {
  // This function is called when the agent is run directly
  console.log('Summarizer agent started directly.');
  const response = await agent.send('Summarize these perspectives on remote work.');
  console.log('Summarizer response:', response);
});

// Define a parallel workflow that executes the three perspective agents in parallel
app.parallel({
  name: 'perspective-analysis',
  instruction: 'A parallel workflow that analyzes a topic from multiple perspectives.',
  fan_out: ['pros', 'cons', 'neutral'],
  fan_in: 'summarizer',
  include_request: true // Include the original request in the fan-in message
}, async (parallel) => {
  console.log('Starting perspective analysis workflow...');
  
  // Execute the parallel workflow with a topic
  const topics = [
    'remote work',
    'artificial intelligence',
    'electric vehicles'
  ];
  
  for (const topic of topics) {
    console.log(`\nAnalyzing topic: "${topic}"`);
    const response = await parallel.execute(`Analyze ${topic} from different perspectives.`);
    console.log('Comprehensive analysis:', response);
  }
});

// Run the application
if (require.main === module) {
  app.run();
}
