// Context functionality for MCP Agent in TypeScript

// This file provides context capabilities similar to those in the Python context.py

import { Settings, loadSettings } from './config';
import { ServerSession } from './app';
import { HumanInputCallback } from './humanInput/types';
import { Executor, createExecutor } from './executor/executor';
import { TaskRegistry, createTaskRegistry } from './executor/taskRegistry';

export class Context {
  public config: Settings;
  public serverRegistry: any = null;
  public executor: Executor;
  public upstreamSession: ServerSession | null = null;
  public taskRegistry: TaskRegistry;
  public humanInputHandler: HumanInputCallback | null = null;

  constructor(config: Settings = {} as Settings) {
    this.config = config;
    // Create a shared task registry so workflows and executor use the same
    // registry instance.
    this.taskRegistry = createTaskRegistry();
    this.executor = createExecutor('default', this.taskRegistry);
    // For now serverRegistry is a plain object map, can be replaced later.
    this.serverRegistry = {};
  }

  async initialize(): Promise<void> {
    // Placeholder async preparation; hook for future DB/Telemetry init.
    return Promise.resolve();
  }

  async cleanup(): Promise<void> {
    // Future: close DB connections etc.
    this.serverRegistry = null;
  }
}

export async function initializeContext(configOrPath: Settings | string | null = null): Promise<Context> {
  let settings: Settings;
  if (configOrPath === null) {
    settings = loadSettings();
  } else if (typeof configOrPath === 'string') {
    settings = loadSettings(configOrPath);
  } else {
    settings = configOrPath;
  }
  const context = new Context(settings);
  await context.initialize();
  return context;
}

export async function cleanupContext(context: Context): Promise<void> {
  await context.cleanup();
}
