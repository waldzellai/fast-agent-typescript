import { EmbeddedResource, ImageContent, TextResourceContents, BlobResourceContents } from '../core/mcpContent';

export function createTextResource(uri: string, text: string, mimeType: string): EmbeddedResource {
  const resource: TextResourceContents = { uri, text, mimeType };
  return { type: 'resource', resource };
}

export function createBlobResource(uri: string, blob: string, mimeType: string): EmbeddedResource {
  const resource: BlobResourceContents = { uri, blob, mimeType };
  return { type: 'resource', resource };
}

export function createImageContent(data: string, mimeType: string): ImageContent {
  return { type: 'image', data, mimeType };
}
