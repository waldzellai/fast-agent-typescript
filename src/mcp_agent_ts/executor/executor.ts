// Executor functionality for MCP Agent in TypeScript

// This file provides executor capabilities similar to those in the Python executor directory

import { TaskRegistry, createTaskRegistry } from './taskRegistry';

export interface Executor {
  executeWorkflow(workflow: any, ...args: any[]): Promise<any>;
  executeTask(taskName: string, ...args: any[]): Promise<any>;
}

export class DefaultExecutor implements Executor {
  private taskRegistry: TaskRegistry;

  constructor(taskRegistry: TaskRegistry) {
    this.taskRegistry = taskRegistry;
  }

  async executeWorkflow(workflow: any, ...args: any[]): Promise<any> {
    // TODO: Implement workflow execution logic
    return workflow.run(...args);
  }

  async executeTask(taskName: string, ...args: any[]): Promise<any> {
    const task = this.taskRegistry.getTask(taskName);
    if (!task) {
      throw new Error(`Task "${taskName}" not found in registry.`);
    }
    return task(...args);
  }
}

export function createExecutor(type: string = 'default'): Executor {
  // TODO: Implement factory for different executor types (e.g., Temporal)
  const taskRegistry = createTaskRegistry(); // Create a task registry instance
  return new DefaultExecutor(taskRegistry);
}
