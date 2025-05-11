// Task Registry functionality for MCP Agent in TypeScript

// This file provides task registry capabilities similar to those in the Python
// executor/task_registry.py but simplified for the initial TypeScript port.

export interface TaskMetadata {
  /** Optional description shown in UI */
  description?: string;
  /** Arbitrary data for schedulers/executors */
  [key: string]: any;
}

export interface TaskRegistry {
  register(
    name: string,
    task: (...args: any[]) => Promise<any>,
    metadata?: TaskMetadata
  ): void;
  getTask(name: string): ((...args: any[]) => Promise<any>) | null;
  getMetadata(name: string): TaskMetadata | undefined;
  listActivities(): string[];
}

export class DefaultTaskRegistry implements TaskRegistry {
  private tasks: Map<string, (...args: any[]) => Promise<any>> = new Map();
  private meta: Map<string, TaskMetadata> = new Map();

  register(
    name: string,
    task: (...args: any[]) => Promise<any>,
    metadata: TaskMetadata = {}
  ): void {
    if (this.tasks.has(name)) {
      throw new Error(`TaskRegistry already contains a task named "${name}"`);
    }
    this.tasks.set(name, task);
    this.meta.set(name, metadata);
  }

  getTask(name: string): ((...args: any[]) => Promise<any>) | null {
    return this.tasks.get(name) || null;
  }

  getMetadata(name: string): TaskMetadata | undefined {
    return this.meta.get(name);
  }

  listActivities(): string[] {
    return Array.from(this.tasks.keys());
  }
}

export function createTaskRegistry(): TaskRegistry {
  return new DefaultTaskRegistry();
}
