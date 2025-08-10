import { PromptMessageMultipart } from '../core/prompt';

export interface AugmentedLLMProtocol {
  send(message: string | PromptMessageMultipart | PromptMessageMultipart[]): Promise<string>;
  applyPrompt(promptName: string, args: any): Promise<string>;
  listPrompts(): Promise<string[]>;
  listResources(): Promise<string[]>;
  messageHistory: any[];
}
