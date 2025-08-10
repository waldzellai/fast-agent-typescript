// Workflow functionality for MCP Agent in TypeScript

// This file provides workflow capabilities similar to those in the Python executor/workflow.py
import { Executor } from './executor';
import {
  ElicitationForm,
  FormResponse,
  HumanInputCallback,
  HumanInputRequest,
  HumanInputResponse,
} from '../humanInput/types';
import { consoleInputCallback } from '../humanInput/handler';

/**
 * Represents an application-like object that provides an executor.
 */
export interface AgentLike {
  executor: Executor;
  // Potentially other shared properties like taskRegistry, logger, etc.
}

/**
 * Defines the external contract for a workflow.
 */
export interface Workflow {
  readonly name: string;
  readonly description?: string;
  run(...args: any[]): Promise<any>;
}

/**
 * Base class for all workflow implementations.
 * Provides common structure including an executor and abstract execution logic.
 */
export abstract class BaseWorkflow implements Workflow {
  protected readonly app: AgentLike;
  protected readonly executor: Executor;
  public readonly name: string;
  public readonly description?: string;

  constructor(app: AgentLike, name?: string, description?: string) {
    this.app = app;
    this.executor = app.executor;
    this.name = name || this.constructor.name;
    this.description = description;
  }

  private getHumanInputHandler(): HumanInputCallback {
    const ctx = (this.app as any)?.getContext?.();
    return ctx?.humanInputHandler ?? consoleInputCallback;
  }

  protected async humanInput(
    prompt: HumanInputRequest
  ): Promise<HumanInputResponse> {
    const handler = this.getHumanInputHandler();
    return handler(prompt);
  }

  protected async elicitForm(form: ElicitationForm): Promise<FormResponse> {
    const result = await this.humanInput(form);
    return typeof result === 'string' ? { value: result } : result;
  }

  /**
   * Runs the workflow. This is the main entry point.
   * @param args Arguments to be passed to the workflow's execute method.
   * @returns The result of the workflow execution.
   */
  async run(...args: any[]): Promise<any> {
    // TODO: Add any common pre-execution logic (e.g., logging, context setup)
    try {
      const result = await this.execute(...args);
      // TODO: Add any common post-execution logic (e.g., logging, result transformation)
      return result;
    } catch (error) {
      // TODO: Add common error handling/logging
      console.error(`Error executing workflow "${this.name}":`, error);
      throw error;
    }
  }

  /**
   * Abstract method to be implemented by concrete workflow subclasses.
   * This method contains the specific logic for the workflow.
   * @param args Arguments for the workflow execution.
   * @returns The result of the workflow's specific execution logic.
   */
  protected abstract execute(...args: any[]): Promise<any>;
}
