// Task Registry functionality for MCP Agent in TypeScript

// This file provides task registry capabilities similar to those in the Python executor/task_registry.py

export interface TaskRegistry {
  register(name: string, task: (...args: any[]) => Promise<any>, metadata?: Record<string, any>): void;
  getTask(name: string): ((...args: any[]) => Promise<any>) | null;
  listActivities(): string[];
}

export class DefaultTaskRegistry implements TaskRegistry {
  private tasks: Map<string, (...args: any[]) => Promise<any>> = new Map();

  register(name: string, task: (...args: any[]) => Promise<any>, metadata?: Record<string, any>): void {
    // TODO: Implement metadata handling if necessary
    this.tasks.set(name, task);
  }

  getTask(name: string): ((...args: any[]) => Promise<any>) | null {
    return this.tasks.get(name) || null;
  }

  listActivities(): string[] {
    return Array.from(this.tasks.keys());
  }
}

export function createTaskRegistry(): TaskRegistry {
  return new DefaultTaskRegistry();
}
