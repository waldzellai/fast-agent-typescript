import { AugmentedLLMProtocol } from './types';

/** LLM implementation that ignores input and returns an empty string */
export class SilentLLM implements AugmentedLLMProtocol {
  messageHistory: any[] = [];

  async send(message: string): Promise<string> {
    this.messageHistory.push(message);
    return '';
  }

  async applyPrompt(_promptName: string, _args: any): Promise<string> {
    return '';
  }

  async listPrompts(): Promise<string[]> {
    return [];
  }

  async listResources(): Promise<string[]> {
    return [];
  }
}
