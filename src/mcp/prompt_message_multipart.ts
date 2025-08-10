import { PromptMessage, TextContent, ImageContent, EmbeddedResource } from '../core/mcpContent';

export type MultipartContent = TextContent | ImageContent | EmbeddedResource;

export interface GetPromptResult {
  messages: PromptMessage[];
}

export class PromptMessageMultipart {
  role: string;
  content: MultipartContent[];

  constructor(role: string, content: MultipartContent[] = []) {
    this.role = role;
    this.content = content;
  }

  /**
   * Convert a list of PromptMessages into a list of PromptMessageMultipart
   * by merging consecutive messages with the same role.
   */
  static toMultipart(messages: PromptMessage[]): PromptMessageMultipart[] {
    const result: PromptMessageMultipart[] = [];
    let current: PromptMessageMultipart | null = null;

    for (const msg of messages) {
      if (current && current.role === msg.role) {
        current.content.push(msg.content as MultipartContent);
      } else {
        if (current) result.push(current);
        current = new PromptMessageMultipart(msg.role, [msg.content as MultipartContent]);
      }
    }

    if (current) result.push(current);
    return result;
  }

  /**
   * Convert this multipart message back into a sequence of PromptMessages.
   */
  fromMultipart(): PromptMessage[] {
    return this.content.map((c) => ({ role: this.role, content: c }));
  }

  /**
   * Parse a GetPromptResult into multipart messages.
   */
  static parseGetPromptResult(result: GetPromptResult): PromptMessageMultipart[] {
    return result && result.messages ? this.toMultipart(result.messages) : [];
  }

  /**
   * Convenience method to handle optional GetPromptResult objects.
   */
  static fromGetPromptResult(result?: GetPromptResult | null): PromptMessageMultipart[] {
    if (!result || !result.messages || result.messages.length === 0) {
      return [];
    }
    return this.toMultipart(result.messages);
  }

  /**
   * Return the last text content in this multipart message, or "<no text>" if none.
   */
  lastText(): string {
    for (let i = this.content.length - 1; i >= 0; i--) {
      const part = this.content[i];
      if ((part as TextContent).type === 'text') {
        return (part as TextContent).text;
      }
    }
    return '<no text>';
  }

  /**
   * Append a new TextContent item to this multipart message.
   */
  addText(text: string): void {
    this.content.push({ type: 'text', text });
  }
}
