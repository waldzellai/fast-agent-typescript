import { PromptMessageMultipart, MultipartContent } from './prompt_message_multipart';
import { TextContent, ImageContent, EmbeddedResource } from '../core/mcpContent';

/**
 * Render a PromptMessageMultipart into a human-readable string.
 */
export function renderMultipartMessage(message: PromptMessageMultipart): string {
  const lines: string[] = [];

  for (const part of message.content) {
    if ((part as TextContent).type === 'text') {
      lines.push((part as TextContent).text);
      continue;
    }

    if ((part as ImageContent).type === 'image') {
      const img = part as ImageContent;
      lines.push(`[IMAGE: ${img.mimeType} (${img.data.length} bytes)]`);
      continue;
    }

    if ((part as EmbeddedResource).type === 'resource') {
      const res = (part as EmbeddedResource).resource as any;
      if ('text' in res && typeof res.text === 'string') {
        const preview = res.text.length > 300 ? res.text.slice(0, 300) + '...' : res.text;
        lines.push(
          `[EMBEDDED TEXT RESOURCE: ${res.mimeType || 'unknown'} ${res.uri} (${res.text.length} chars)]\n${preview}`,
        );
      } else {
        const data = res.blob || res.data || '';
        lines.push(
          `[EMBEDDED BLOB RESOURCE: ${res.mimeType || 'unknown'} ${res.uri} (${data.length} bytes)]`,
        );
      }
      continue;
    }
  }

  return lines.join('\n');
}
