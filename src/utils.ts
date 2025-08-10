// mimeUtils.ts
// Utility functions for handling MIME types and message processing in TypeScript

import {
  isPromptMessage,
  isPromptMessageMultipart,
  isTextContent,
  PromptMessage,
  PromptMessageMultipart,
} from './core/prompt';

/**
 * A mapping of file extensions to MIME types.
 * This is a simplified version for common file types.
 */
const mimeTypeMap: { [key: string]: string } = {
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".py": "text/x-python",
  ".php": "application/x-httpd-php",
  ".sh": "application/x-sh",
  ".yaml": "application/yaml",
  ".toml": "application/toml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Known text-based MIME types not starting with "text/".
 */
const TEXT_MIME_TYPES: Set<string> = new Set([
  "application/json",
  "application/javascript",
  "application/xml",
  "application/ld+json",
  "application/xhtml+xml",
  "application/x-httpd-php",
  "application/x-sh",
  "application/ecmascript",
  "application/graphql",
  "application/x-www-form-urlencoded",
  "application/yaml",
  "application/toml",
  "application/x-python-code",
  "application/vnd.api+json",
]);

/**
 * Common text-based MIME type patterns.
 */
const TEXT_MIME_PATTERNS: string[] = ["+xml", "+json", "+yaml", "+text"];

/**
 * Guess the MIME type of a file based on its extension.
 * @param filePath The path or name of the file.
 * @returns The guessed MIME type or 'application/octet-stream' if unknown.
 */
export function guessMimeType(filePath: string): string {
  const extension = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return mimeTypeMap[extension] || "application/octet-stream";
}

/**
 * Determine if a MIME type represents text content.
 * @param mimeType The MIME type to check.
 * @returns True if the MIME type represents text content, false otherwise.
 */
export function isTextMimeType(mimeType: string): boolean {
  if (!mimeType) {
    return false;
  }

  // Standard text types
  if (mimeType.startsWith("text/")) {
    return true;
  }

  // Known text types
  if (TEXT_MIME_TYPES.has(mimeType)) {
    return true;
  }

  // Common text patterns
  if (TEXT_MIME_PATTERNS.some((pattern) => mimeType.endsWith(pattern))) {
    return true;
  }

  return false;
}

/**
 * Check if content should be treated as binary.
 * @param mimeType The MIME type to check.
 * @returns True if the content should be treated as binary, false otherwise.
 */
export function isBinaryContent(mimeType: string): boolean {
  return !isTextMimeType(mimeType);
}

/**
 * Check if a MIME type represents an image.
 * @param mimeType The MIME type to check.
 * @returns True if the MIME type represents an image, false otherwise.
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}

/**
 * Convert various message formats returned by LLMs into a plain string.
 * Supports raw strings and PromptMessage/PromptMessageMultipart objects.
 */
export function messageToString(
  message: string | PromptMessage | PromptMessageMultipart | any,
): string {
  if (typeof message === 'string') {
    return message;
  }

  if (isPromptMessage(message) || isPromptMessageMultipart(message)) {
    const content = (message as any).content;
    if (Array.isArray(content)) {
      return content
        .map((part: any) => (isTextContent(part) ? part.text : ''))
        .join('\n')
        .trim();
    }
    if (typeof content === 'string') {
      return content;
    }
  }

  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}
