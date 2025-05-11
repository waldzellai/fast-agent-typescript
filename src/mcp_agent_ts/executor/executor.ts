// Executor functionality for MCP Agent in TypeScript

// Provides a thin asynchronous execution layer; by default just runs workflows
// locally. Can be swapped in the future for Temporal or Workers.

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
    if (typeof workflow?.run !== 'function') {
      throw new Error('Provided workflow does not implement a run() method');
    }
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

export function createExecutor(
  type: string = 'default',
  taskRegistry?: TaskRegistry
): Executor {
  // Future: switch on `type` to return etc.
  const registry = taskRegistry ?? createTaskRegistry();
  return new DefaultExecutor(registry);
}
