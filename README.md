<p align="center">
<img alt="npm version" src="https://img.shields.io/npm/v/fast-agent-typescript?color=%2334D058&label=npm" />
<a href="#"><img src="https://github.com/evalstate/fast-agent/actions/workflows/main-checks.yml/badge.svg" /></a>
<a href="https://github.com/evalstate/fast-agent/issues"><img src="https://img.shields.io/github/issues-raw/evalstate/fast-agent" /></a>
<a href="https://discord.gg/xg5cJ7ndN6"><img src="https://img.shields.io/discord/1358470293990936787" alt="discord" /></a>
<img alt="NPM Downloads" src="https://img.shields.io/npm/dt/fast-agent-typescript?label=npm%20%7C%20downloads"/>
<a href="https://github.com/evalstate/fast-agent-mcp/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/fast-agent-typescript" /></a>
</p>

## Overview

> [!TIP]
> Documentation site is in production here : https://fast-agent.ai. Feel free to feed back what's helpful and what's not. There is also an LLMs.txt [here](https://fast-agent.ai/llms.txt)

**`fast-agent-typescript`** enables you to create and interact with sophisticated Agents and Workflows in minutes. It is the first framework with complete, end-to-end tested MCP Feature support including Sampling. Both Anthropic (Haiku, Sonnet, Opus) and OpenAI models (gpt-4o/gpt-4.1 family, o1/o3 family) are supported.

The simple declarative syntax lets you concentrate on composing your Prompts and MCP Servers to [build effective agents](https://www.anthropic.com/research/building-effective-agents).

`fast-agent-typescript` is multi-modal, supporting Images and PDFs for both Anthropic and OpenAI endpoints via Prompts, Resources and MCP Tool Call results. The inclusion of passthrough and playback LLMs enable rapid development and test of TypeScript glue-code for your applications.

> [!IMPORTANT]
> The fast-agent documentation repo is here: https://github.com/evalstate/fast-agent-docs. Please feel free to submit PRs for documentation, experience reports or other content you think others may find helpful. All help and feedback warmly received.

### Agent Application Development

Prompts and configurations that define your Agent Applications are stored in simple files, with minimal boilerplate, enabling simple management and version control.

Chat with individual Agents and Components before, during and after workflow execution to tune and diagnose your application. Agents can request human input to get additional context for task completion.

Simple model selection makes testing Model <-> MCP Server interaction painless. You can read more about the motivation behind this project [here](https://llmindset.co.uk/resources/fast-agent/)

![2025-03-23-fast-agent](https://github.com/user-attachments/assets/8f6dbb69-43e3-4633-8e12-5572e9614728)

## Get started:

Install the library using npm:

```bash
npm install fast-agent-typescript   # install fast-agent TypeScript!

npx fastagent setup                 # create an example agent and config files
npx ts-node agent.ts               # run your first agent
npx ts-node agent.ts --model=o3-mini.low # specify a model
```

### Example

```typescript
import { FastAgent } from 'fast-agent-typescript';

// Create a new FastAgent instance
const app = new FastAgent('simple-agent-example');

// Define an agent with a custom instruction
app.agent(
  {
    name: 'simple',
    instruction: 'You are a helpful assistant that provides concise answers.',
  },
  async (agent) => {
    console.log('Starting simple agent...');

    // Send a message to the agent
    const response = await agent.send(
      'Hello! What can you help me with today?'
    );
    console.log('Agent response:', response);

    // Start an interactive prompt session
    await agent.prompt('Ask me anything!');
  }
);

// Run the agent
app.run();
```

Other quickstart examples include a Researcher Agent (with Evaluator-Optimizer workflow) and Data Analysis Agent (similar to the ChatGPT experience), demonstrating MCP Roots support.

> [!TIP]
> Windows Users - there are a couple of configuration changes needed for the Filesystem and Docker MCP Servers - necessary changes are detailed within the configuration files.

### Basic Agents

Defining an agent is as simple as:

```typescript
app.agent({
  instruction: 'Given an object, respond only with an estimate of its size.',
});
```

We can then send messages to the Agent:

```typescript
const agent = await app.run();
const moonSize = await agent.send('the moon');
console.log(moonSize);
```

Or start an interactive chat with the Agent:

```typescript
const agent = await app.run();
await agent.interactive();
```

Here is the complete `sizer.ts` Agent application:

```typescript
import { FastAgent } from 'fast-agent-typescript';

// Create the application
const app = new FastAgent('Agent Example');

app.agent(
  {
    instruction: 'Given an object, respond only with an estimate of its size.',
  },
  async (agent) => {
    await agent.interactive();
  }
);

app.run();
```

The Agent can then be run with `npx ts-node sizer.ts`.

Specify a model with the `--model` switch - for example `npx ts-node sizer.ts --model sonnet`.

### Combining Agents and using MCP Servers

Agents can be chained to build a workflow, using MCP Servers defined in the `fastagent.config.yaml` file:

```typescript
// Define URL fetcher agent
app.agent({
  name: 'url_fetcher',
  instruction: 'Given a URL, provide a complete and comprehensive summary',
  servers: ['fetch'], // Name of an MCP Server defined in fastagent.config.yaml
});

// Define social media agent
app.agent({
  name: 'social_media',
  instruction: `
    Write a 280 character social media post for any given text.
    Respond only with the post, never use hashtags.
  `,
});

// Create a chain workflow
app.chain(
  {
    name: 'post_writer',
    sequence: ['url_fetcher', 'social_media'],
  },
  async (agent) => {
    // using chain workflow
    await agent.post_writer('http://llmindset.co.uk');
  }
);
```

All Agents and Workflows respond to `.send("message")` or `.prompt()` to begin a chat session.

Saved as `social.ts` we can now run this workflow from the command line with:

```bash
npx ts-node social.ts --agent post_writer --message "<url>"
```

Add the `--quiet` switch to disable progress and message display and return only the final response - useful for simple automations.

## Workflows

### Chain

The `chain` workflow offers a more declarative approach to calling Agents in sequence:

```typescript
app.chain({
  name: 'post_writer',
  sequence: ['url_fetcher', 'social_media'],
});

// we can them prompt it directly:
const agent = await app.run();
await agent.post_writer();
```

This starts an interactive session, which produces a short social media post for a given URL. If a _chain_ is prompted it returns to a chat with last Agent in the chain. You can switch the agent to prompt by typing `@agent-name`.

Chains can be incorporated in other workflows, or contain other workflow elements (including other Chains). You can set an `instruction` to precisely describe it's capabilities to other workflow steps if needed.

### Human Input

Agents can request Human Input to assist with a task or get additional context:

```typescript
app.agent({
  instruction:
    'An AI agent that assists with basic tasks. Request Human Input when needed.',
  humanInput: true,
});

const agent = await app.run();
await agent.send('print the next number in the sequence');
```

### Parallel

The Parallel Workflow sends the same message to multiple Agents simultaneously (`fan-out`), then uses the `fan-in` Agent to process the combined content.

```typescript
app.agent({
  name: 'translate_fr',
  instruction: 'Translate the text to French',
});
app.agent({
  name: 'translate_de',
  instruction: 'Translate the text to German',
});
app.agent({
  name: 'translate_es',
  instruction: 'Translate the text to Spanish',
});

app.parallel({
  name: 'translate',
  fanOut: ['translate_fr', 'translate_de', 'translate_es'],
});

app.chain({
  name: 'post_writer',
  sequence: ['url_fetcher', 'social_media', 'translate'],
});
```

If you don't specify a `fanIn` agent, the `parallel` returns the combined Agent results verbatim.

`parallel` is also useful to ensemble ideas from different LLMs.

When using `parallel` in other workflows, specify an `instruction` to describe its operation.

### Evaluator-Optimizer

Evaluator-Optimizers combine 2 agents: one to generate content (the `generator`), and the other to judge that content and provide actionable feedback (the `evaluator`). Messages are sent to the generator first, then the pair run in a loop until either the evaluator is satisfied with the quality, or the maximum number of refinements is reached. The final result from the Generator is returned.

If the Generator has `useHistory` off, the previous iteration is returned when asking for improvements - otherwise conversational context is used.

```typescript
app.evaluatorOptimizer({
  name: 'researcher',
  generator: 'web_searcher',
  evaluator: 'quality_assurance',
  minRating: 'EXCELLENT',
  maxRefinements: 3,
});

const agent = await app.run();
await agent.researcher.send(
  'produce a report on how to make the perfect espresso'
);
```

When used in a workflow, it returns the last `generator` message as the result.

### Router

Routers use an LLM to assess a message, and route it to the most appropriate Agent. The routing prompt is automatically generated based on the Agent instructions and available Servers.

```typescript
app.router({
  name: 'route',
  agents: ['agent1', 'agent2', 'agent3'],
});
```

### Orchestrator

Given a complex task, the Orchestrator uses an LLM to generate a plan to divide the task amongst the available Agents. The planning and aggregation prompts are generated by the Orchestrator, which benefits from using more capable models. Plans can either be built once at the beginning (`planType: "full"`) or iteratively (`planType: "iterative"`).

```typescript
app.orchestrator({
  name: 'orchestrate',
  agents: ['task1', 'task2', 'task3'],
});
```

## Agent Features

### Calling Agents

All definitions allow omitting the name and instructions arguments for brevity:

```typescript
app.agent({ instruction: 'You are a helpful agent' }); // Create an agent with a default name
app.agent({ name: 'greeter', instruction: 'Respond cheerfully!' }); // Create a named agent

const agent = await app.run();
const moonSize = await agent.send('the moon'); // Call the default agent with a message

const result = await agent.greeter('Good morning!'); // Send a message to an agent by name
const result2 = await agent.greeter.send('Hello!'); // You can call 'send' explicitly

await agent.greeter(); // If no message is specified, a chat session opens
await agent.greeter.prompt(); // that can be made more explicit
await agent.greeter.prompt({ defaultPrompt: 'OK' }); // and supports setting a default prompt
```

### Defining Agents

#### Basic Agent

```typescript
app.agent({
  name: 'agent', // name of the agent
  instruction: 'You are a helpful Agent', // base instruction for the agent
  servers: ['filesystem'], // list of MCP Servers for the agent
  model: 'o3-mini.high', // specify a model for the agent
  useHistory: true, // agent maintains chat history
  requestParams: { temperature: 0.7 }, // additional parameters for the LLM
  humanInput: true, // agent can request human input
});
```

#### Chain

```typescript
app.chain({
  name: 'chain', // name of the chain
  sequence: ['agent1', 'agent2'], // list of agents in execution order
  instruction: 'instruction', // instruction to describe the chain for other workflows
  cumulative: false, // whether to accumulate messages through the chain
  continueWithFinal: true, // open chat with agent at end of chain after prompting
});
```

#### Parallel

```typescript
app.parallel({
  name: 'parallel', // name of the parallel workflow
  fanOut: ['agent1', 'agent2'], // list of agents to run in parallel
  fanIn: 'aggregator', // name of agent that combines results (optional)
  instruction: 'instruction', // instruction to describe the parallel for other workflows
  includeRequest: true, // include original request in fan-in message
});
```

#### Evaluator-Optimizer

```typescript
app.evaluatorOptimizer({
  name: 'researcher', // name of the workflow
  generator: 'web_searcher', // name of the content generator agent
  evaluator: 'quality_assurance', // name of the evaluator agent
  minRating: 'GOOD', // minimum acceptable quality (EXCELLENT, GOOD, FAIR, POOR)
  maxRefinements: 3, // maximum number of refinement iterations
});
```

#### Router

```typescript
app.router({
  name: 'route', // name of the router
  agents: ['agent1', 'agent2', 'agent3'], // list of agent names router can delegate to
  model: 'o3-mini.high', // specify routing model
  useHistory: false, // router maintains conversation history
  humanInput: false, // whether router can request human input
});
```

#### Orchestrator

```typescript
app.orchestrator({
  name: 'orchestrator', // name of the orchestrator
  instruction: 'instruction', // base instruction for the orchestrator
  agents: ['agent1', 'agent2'], // list of agent names this orchestrator can use
  model: 'o3-mini.high', // specify orchestrator planning model
  useHistory: false, // orchestrator doesn't maintain chat history (no effect)
  humanInput: false, // whether orchestrator can request human input
  planType: 'full', // planning approach: "full" or "iterative"
  maxIterations: 5, // maximum number of full plan attempts, or iterations
});
```

### Multimodal Support

Add Resources to prompts using either the inbuilt `prompt-server` or MCP Types directly. Convenience class are made available to do so simply, for example:

```typescript
const summary = await agent.withResource(
  'Summarise this PDF please',
  'mcp_server',
  'resource://fast-agent/sample.pdf'
);
```

#### MCP Tool Result Conversion

LLM APIs have restrictions on the content types that can be returned as Tool Calls/Function results via their Chat Completions API's:

- OpenAI supports Text
- Anthropic supports Text and Image

For MCP Tool Results, `ImageResources` and `EmbeddedResources` are converted to User Messages and added to the conversation.

### Prompts

MCP Prompts are supported with `applyPrompt(name, arguments)`, which always returns an Assistant Message. If the last message from the MCP Server is a 'User' message, it is sent to the LLM for processing. Prompts applied to the Agent's Context are retained - meaning that with `useHistory: false`, Agents can act as finely tuned responders.

Prompts can also be applied interactively through the interactive interface by using the `/prompt` command.

### Sampling

Sampling LLMs are configured per Client/Server pair. Specify the model name in fastagent.config.yaml as follows:

```yaml
mcp:
  servers:
    sampling_resource:
      command: 'npx'
      args: ['ts-node', 'sampling_resource_server.ts']
      sampling:
        model: 'haiku'
```

### Secrets File

> [!TIP]
> fast-agent will look recursively for a fastagent.secrets.yaml file, so you only need to manage this at the root folder of your agent definitions.

### Interactive Shell

![fast-agent](https://github.com/user-attachments/assets/3e692103-bf97-489a-b519-2d0fee036369)

## Project Notes

`fast-agent-typescript` builds on the [`mcp-agent`](https://github.com/lastmile-ai/mcp-agent) project by Sarmad Qadri.

### Contributing

Contributions and PRs are welcome - feel free to raise issues to discuss. Full guidelines for contributing and roadmap coming very soon. Get in touch!
