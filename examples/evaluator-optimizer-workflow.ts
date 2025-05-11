/**
 * Evaluator-Optimizer Workflow Example
 *
 * This example demonstrates how to create an evaluator-optimizer workflow using FastAgent.
 * The workflow uses an evaluator to assess the quality of a response from a worker agent,
 * and an optimizer to improve the response if needed.
 */

import { FastAgent } from '../src/fastAgent';

// Create a new FastAgent instance
const app = new FastAgent('evaluator-optimizer-workflow-example');

// Define a worker agent that generates initial responses
app.agent(
  {
    name: 'content-writer',
    instruction:
      'You are a content writer that creates articles, blog posts, and other written content.',
  },
  async (agent) => {
    // This function is called when the agent is run directly
    console.log('Content writer agent started directly.');
    const response = await agent.send(
      'Write a blog post about the benefits of meditation.'
    );
    console.log('Content writer response:', response);
  }
);

// Define an evaluator agent that assesses the quality of responses
app.agent(
  {
    name: 'content-evaluator',
    instruction:
      'You are a content evaluator that assesses the quality of written content based on clarity, engagement, accuracy, and relevance. You provide a score from 0-10 and specific feedback for improvement.',
  },
  async (agent) => {
    // This function is called when the agent is run directly
    console.log('Content evaluator agent started directly.');
    const response = await agent.send(
      'Evaluate this blog post: [blog post content]'
    );
    console.log('Content evaluator response:', response);
  }
);

// Define an optimizer agent that improves responses based on evaluation
app.agent(
  {
    name: 'content-optimizer',
    instruction:
      'You are a content optimizer that improves written content based on specific feedback. You focus on enhancing clarity, engagement, accuracy, and relevance while maintaining the original message.',
  },
  async (agent) => {
    // This function is called when the agent is run directly
    console.log('Content optimizer agent started directly.');
    const response = await agent.send(
      'Improve this blog post based on the following evaluation: [evaluation feedback]'
    );
    console.log('Content optimizer response:', response);
  }
);

// Define an evaluator-optimizer workflow that improves content quality
app.evaluatorOptimizer(
  {
    name: 'content-improver',
    instruction:
      'A workflow that evaluates and optimizes content to ensure high quality.',
    worker: 'content-writer',
    evaluator: 'content-evaluator',
    optimizer: 'content-optimizer',
    min_score: 8, // Minimum score (0-10) required to accept a response without optimization
    max_iterations: 3, // Maximum number of optimization iterations
  },
  async (workflow) => {
    console.log('Starting content improvement workflow...');

    // Execute the workflow with different content requests
    const topics = [
      'Write a blog post about the benefits of meditation for stress reduction.',
      'Create an article explaining how artificial intelligence is changing healthcare.',
      'Compose a short essay on the importance of environmental conservation.',
    ];

    for (const topic of topics) {
      console.log(`\nProcessing content request: "${topic}"`);
      const response = await (workflow as any).execute(topic);
      console.log('\nFinal Optimized Content:');
      console.log(response);
    }
  }
);

// Run the application
if (require.main === module) {
  app.run();
}
