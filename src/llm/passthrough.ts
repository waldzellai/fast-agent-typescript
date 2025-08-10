import { AugmentedLLMProtocol } from './types';

export const FIXED_RESPONSE_INDICATOR = '***FIXED_RESPONSE';
export const CALL_TOOL_INDICATOR = '***CALL_TOOL';

/**
 * PassthroughLLM simply returns what it receives. It can also be instructed
 * to return a fixed response using FIXED_RESPONSE_INDICATOR.
 */
export class PassthroughLLM implements AugmentedLLMProtocol {
  messageHistory: any[] = [];
  private fixedResponse?: string;

  async send(message: string): Promise<string> {
    this.messageHistory.push(message);
    if (this.fixedResponse) {
      return this.fixedResponse;
    }

    if (message.startsWith(FIXED_RESPONSE_INDICATOR)) {
      const rest = message.slice(FIXED_RESPONSE_INDICATOR.length).trim();
      this.fixedResponse = rest || FIXED_RESPONSE_INDICATOR;
      return this.fixedResponse;
    }

    return message;
  }

  _parse_tool_command(command: string): { name: string; args?: any } {
    const trimmed = command.replace(CALL_TOOL_INDICATOR, '').trim();
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex === -1) {
      return { name: trimmed || '' };
    }
    const name = trimmed.slice(0, spaceIndex);
    const json = trimmed.slice(spaceIndex + 1).trim();
    try {
      return { name, args: json ? JSON.parse(json) : undefined };
    } catch {
      return { name, args: undefined };
    }
  }

  async applyPrompt(promptName: string, _args: any): Promise<string> {
    return this.send(promptName);
  }

  async listPrompts(): Promise<string[]> {
    return [];
  }

  async listResources(): Promise<string[]> {
    return [];
  }
}
