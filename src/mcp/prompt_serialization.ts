import { PromptMessage, TextContent, EmbeddedResource } from '../core/mcpContent';
import { PromptMessageMultipart } from './prompt_message_multipart';

/** Serialize multipart messages to JSON string. */
export function multipartMessagesToJson(messages: PromptMessageMultipart[]): string {
  return JSON.stringify(messages);
}

/** Deserialize multipart messages from JSON string. */
export function jsonToMultipartMessages(jsonStr: string): PromptMessageMultipart[] {
  const data = JSON.parse(jsonStr) as Array<{ role: string; content: any[] }>;
  return data.map((m) => new PromptMessageMultipart(m.role, m.content as any));
}

/**
 * Convert multipart messages into a simple delimited text format.
 * Each role section is prefixed with ---ROLE and text content is joined with blank lines.
 * Embedded resources are emitted as JSON after a ---RESOURCE delimiter.
 */
export function multipartMessagesToDelimitedFormat(messages: PromptMessageMultipart[]): string[] {
  const result: string[] = [];

  for (const msg of messages) {
    result.push(`---${msg.role.toUpperCase()}`);

    const textParts: string[] = [];
    const resourceParts: EmbeddedResource[] = [];

    for (const part of msg.content) {
      if ((part as TextContent).type === 'text') {
        textParts.push((part as TextContent).text);
      } else if ((part as EmbeddedResource).type === 'resource') {
        resourceParts.push(part as EmbeddedResource);
      }
    }

    result.push(textParts.join('\n\n'));

    for (const res of resourceParts) {
      result.push('---RESOURCE');
      result.push(JSON.stringify(res));
    }
  }

  return result;
}
