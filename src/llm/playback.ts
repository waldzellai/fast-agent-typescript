import { AugmentedLLMProtocol } from './types';

/**
 * PlaybackLLM replays a predefined sequence of assistant messages.
 * This is primarily useful for testing where deterministic behaviour is desired.
 */
export class PlaybackLLM implements AugmentedLLMProtocol {
  messageHistory: any[] = [];
  private queue: string[] = [];

  /** Load a series of assistant responses that will be returned sequentially */
  loadResponses(responses: string[]): void {
    this.queue = [...responses];
  }

  async send(_message: string): Promise<string> {
    this.messageHistory.push(_message);
    if (this.queue.length === 0) {
      return 'MESSAGES EXHAUSTED';
    }
    return this.queue.shift() as string;
  }

  async applyPrompt(promptName: string, _args: any): Promise<string> {
    // For playback we just return the next message as-is
    return this.send(promptName);
  }

  async listPrompts(): Promise<string[]> {
    return [];
  }

  async listResources(): Promise<string[]> {
    return [];
  }
}
