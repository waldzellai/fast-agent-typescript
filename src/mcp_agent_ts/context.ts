import consola from 'consola';
import { Settings, loadSettings } from './config';
import { HumanInputCallback, ServerSession } from './app';
import { Executor, createExecutor } from './executor/executor';
import { TaskRegistry, createTaskRegistry } from './executor/taskRegistry';
import { getLogger as createLogger, Logger } from './logging/logger';

export interface Telemetry {
  track(event: string, properties?: Record<string, any>): void;
  flush?(): Promise<void>;
}

class NoopTelemetry implements Telemetry {
  track(_event: string, _properties?: Record<string, any>): void {}
  async flush(): Promise<void> {
    return Promise.resolve();
  }
}

function configureLogging(level: string | undefined): void {
  const levels: Record<string, number> = {
    silent: Number.NEGATIVE_INFINITY,
    fatal: 0,
    error: 0,
    warn: 1,
    log: 2,
    info: 3,
    success: 3,
    debug: 4,
    trace: 5
  };
  if (level) {
    consola.level = levels[level] ?? consola.level;
  }
}

function createTelemetry(): Telemetry {
  return new NoopTelemetry();
}

export class Context {
  public config: Settings;
  public logger: Logger;
  public telemetry: Telemetry;
  public serverRegistry: Map<string, any>;
  public executor: Executor;
  public upstreamSession: ServerSession | null = null;
  public taskRegistry: TaskRegistry;
  public humanInputHandler: HumanInputCallback | null = null;

  constructor(config: Settings = {} as Settings) {
    this.config = config;
    configureLogging(this.config.logLevel);
    this.logger = createLogger(this.config.appName || 'mcp_agent');
    this.telemetry = createTelemetry();
    this.taskRegistry = createTaskRegistry();
    this.executor = createExecutor('default', this.taskRegistry);
    this.serverRegistry = new Map();
  }

  registerServer(name: string, server: any): void {
    this.serverRegistry.set(name, server);
  }

  getServer(name: string): any | undefined {
    return this.serverRegistry.get(name);
  }

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async cleanup(): Promise<void> {
    if (this.telemetry && typeof this.telemetry.flush === 'function') {
      await this.telemetry.flush();
    }
    this.serverRegistry.clear();
  }
}

// Global context management
let CURRENT_CONTEXT: Context | null = null;

export function setCurrentContext(ctx: Context | null): void {
  CURRENT_CONTEXT = ctx;
}

export function getCurrentContext(): Context | null {
  return CURRENT_CONTEXT;
}

export function requireCurrentContext(): Context {
  if (!CURRENT_CONTEXT) {
    throw new Error('Context has not been initialized');
  }
  return CURRENT_CONTEXT;
}

// Convenience getters
export function getContext(): Context {
  return requireCurrentContext();
}

export function getLogger(): Logger {
  return requireCurrentContext().logger;
}

export function getTelemetry(): Telemetry {
  return requireCurrentContext().telemetry;
}

export function getExecutor(): Executor {
  return requireCurrentContext().executor;
}

export function getServerRegistry(): Map<string, any> {
  return requireCurrentContext().serverRegistry;
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
  setCurrentContext(context);
  return context;
}

export async function cleanupContext(context?: Context): Promise<void> {
  const ctx = context ?? CURRENT_CONTEXT;
  if (ctx) {
    await ctx.cleanup();
  }
  if (!context || ctx === CURRENT_CONTEXT) {
    setCurrentContext(null);
  }
}
