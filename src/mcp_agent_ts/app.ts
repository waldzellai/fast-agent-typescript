// Main application class for MCP Agent in TypeScript

// This file is a conversion of the Python app.py to TypeScript, maintaining original functionality.

export interface Settings {
  // Placeholder for configuration settings
}

export interface HumanInputCallback {
  (prompt: string): Promise<string>;
}

export interface SignalWaitCallback {
  (signal: string): Promise<void>;
}

export interface ServerSession {
  // Placeholder for server session interface
}

// Removed placeholder Context class, now imported from context.ts
import { Context, initializeContext } from './context';

export class MCPApp {
  private name: string;
  private initialized: boolean = false;
  private context: Context | null = null;
  private workflows: Map<string, any> = new Map();
  private logger: any = null;
  private configOrPath: Settings | string | null = null;
  private humanInputCallback: HumanInputCallback | null = null;
  private signalNotification: SignalWaitCallback | null = null;
  private upstreamSession: ServerSession | null = null;

  constructor(
    name: string = 'mcp_application',
    settings: Settings | string | null = null,
    humanInputCallback: HumanInputCallback | null = null,
    signalNotification: SignalWaitCallback | null = null,
    upstreamSession: ServerSession | null = null
  ) {
    this.name = name;
    this.configOrPath = settings;
    this.humanInputCallback = humanInputCallback;
    this.signalNotification = signalNotification;
    this.upstreamSession = upstreamSession;
  }

  getContext(): Context {
    if (this.context === null) {
      throw new Error('MCPApp not initialized, please call initialize() first, or use async with app.run().');
    }
    return this.context;
  }

  getConfig(): Settings {
    return this.getContext().config;
  }

  getServerRegistry(): any {
    return this.getContext().serverRegistry;
  }

  getExecutor(): any {
    return this.getContext().executor;
  }

  getEngine(): any {
    return this.getExecutor().executionEngine;
  }

  getUpstreamSession(): ServerSession | null {
    return this.getContext().upstreamSession;
  }

  setUpstreamSession(value: ServerSession): void {
    this.getContext().upstreamSession = value;
  }

  getWorkflows(): Map<string, any> {
    return this.workflows;
  }

  getTasks(): any[] {
    return this.getContext().taskRegistry.listActivities();
  }

  getLogger(): any {
    if (this.logger === null) {
      this.logger = getLogger(`mcp_agent.${this.name}`);
    }
    return this.logger;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.context = await initializeContext(this.configOrPath);
    // Set additional context properties if provided
    if (this.humanInputCallback) {
      this.context.humanInputHandler = this.humanInputCallback;
    }
    if (this.upstreamSession) {
      this.context.upstreamSession = this.upstreamSession;
    }
    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.cleanup();
    }
    this.initialized = false;
    this.context = null;
  }

  async run(): Promise<MCPApp> {
    await this.initialize();
    return this;
  }

  workflow(cls: any, workflowId: string | null = null, ...args: any[]): any {
    // Acts like @app.workflow decorator. Registers workflow class for later use.
    const id = workflowId || cls.name;
    this.workflows.set(id, { cls, args });
    cls.app = this;
    return cls;
  }

  workflowRun(fn: (...args: any[]) => any): (...args: any[]) => any {
    // Marks a free function as a workflow ‘run’ entrypoint.
    Reflect.set(fn, 'isWorkflowRun', true);
    return fn;
  }

  workflowTask(
    name: string | null = null,
    scheduleToCloseTimeout: number | null = null,
    retryPolicy: Record<string, any> | null = null,
    ...kwargs: any[]
  ): (fn: (...args: any[]) => Promise<any>) => (...args: any[]) => Promise<any> {
    return (fn: (...args: any[]) => Promise<any>) => {
      Reflect.set(fn, 'isWorkflowTask', true);
      if (name) Reflect.set(fn, 'taskName', name);
      if (scheduleToCloseTimeout)
        Reflect.set(fn, 'scheduleToCloseTimeout', scheduleToCloseTimeout);
      if (retryPolicy) Reflect.set(fn, 'retryPolicy', retryPolicy);
      return fn;
    };
  }

  isWorkflowTask(func: (...args: any[]) => any): boolean {
    return Reflect.get(func, 'isWorkflowTask') === true;
  }
}

// Placeholder for logger function
import { getLogger } from './logging/logger';
