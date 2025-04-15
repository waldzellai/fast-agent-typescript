/**
 * Helper functions for creating MCP content types with minimal code.
 *
 * This module provides simple functions to create TextContent, ImageContent,
 * EmbeddedResource, and other MCP content types with minimal boilerplate.
 */

import * as fs from "fs";
import * as path from "path";
import { URL } from "url"; // Using Node.js URL class for AnyUrl equivalent

// Assuming these utils exist or will be created based on the Python version
// import { guessMimeType, isBinaryContent, isImageMimeType } from './mimeUtils';
// Placeholder implementations - replace with actual imports/logic
function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  // Basic mime type guessing based on extension
  const mimeTypes: { [key: string]: string } = {
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".xml": "application/xml",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml", // Treat SVG as image for MCPImage, but text for MCPFile
    ".pdf": "application/pdf",
    // Add more common types as needed
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function isBinaryContent(mimeType: string): boolean {
  if (!mimeType) return true; // Default to binary if unknown
  const textTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "image/svg+xml",
  ];
  return !textTypes.some((prefix) => mimeType.startsWith(prefix));
}

function isImageMimeType(mimeType: string): boolean {
  // Consider SVG as non-image for MCPImage context to align with Python code's MCPFile handling
  return mimeType?.startsWith("image/") && mimeType !== "image/svg+xml";
}

// Import necessary error type
import { FastAgentError } from "./exceptions";

// --- Define MCP Types locally (based on Python mcp.types) ---
// Define a simple type for AnyUrl for now, or use a validation library like zod if needed
type AnyUrl = string;

export type Role = "user" | "assistant";

// Define Annotations type (adjust based on actual structure if known)
export type Annotations = Record<string, any> | null | undefined;

export interface TextContent {
  type: "text";
  text: string;
  annotations?: Annotations;
}

export interface ImageContent {
  type: "image";
  data: string; // Base64 encoded data
  mimeType: string;
  annotations?: Annotations;
}

export interface TextResourceContents {
  uri: AnyUrl;
  text: string;
  mimeType?: string;
}

export interface BlobResourceContents {
  uri: AnyUrl;
  blob: string; // Base64 encoded blob
  mimeType?: string;
}

export type ResourceContents = TextResourceContents | BlobResourceContents;

export interface EmbeddedResource {
  type: "resource";
  resource: ResourceContents;
  annotations?: Annotations;
}

// Define MCPContentType union type
export type MCPContent = TextContent | ImageContent | EmbeddedResource;

export interface PromptMessage {
  role: Role;
  content: MCPContent; // Simplified to single content part based on Python helpers
}

// Represents the result of reading a resource, potentially multiple parts
export interface ReadResourceResult {
  contents: ResourceContents[];
  // Add other fields if necessary based on Python's ReadResourceResult
}
// --- End MCP Type Definitions ---

/**
 * Create a message with text content.
 *
 * @param text - The text content
 * @param role - Role of the message, defaults to "user"
 * @param annotations - Optional annotations
 * @returns A dictionary with role and content that can be used in a prompt
 */
export function MCPText(
  text: string,
  role: Role = "user",
  annotations?: Annotations,
): PromptMessage {
  const content: TextContent = { type: "text", text };
  if (annotations) {
    content.annotations = annotations;
  }
  return {
    role,
    content,
  };
}

/**
 * Create a message with image content.
 *
 * @param options - Options object containing path or data, mimeType, role, annotations
 * @returns A dictionary with role and content that can be used in a prompt
 */
export function MCPImage(options: {
  path?: string;
  data?: Buffer;
  mimeType?: string;
  role?: Role;
  annotations?: Annotations;
}): PromptMessage {
  const {
    path: filePath,
    data: inputData,
    role = "user",
    annotations,
  } = options;
  let { mimeType } = options;
  let data: Buffer;

  if (filePath === undefined && inputData === undefined) {
    throw new FastAgentError(
      "Either path or data must be provided for MCPImage",
    );
  }

  if (filePath !== undefined && inputData !== undefined) {
    throw new FastAgentError(
      "Only one of path or data can be provided for MCPImage",
    );
  }

  if (filePath !== undefined) {
    try {
      if (!mimeType) {
        mimeType = guessMimeType(filePath);
      }
      data = fs.readFileSync(filePath);
    } catch (error: any) {
      throw new FastAgentError(
        `Error reading image file ${filePath}: ${error.message}`,
      );
    }
  } else if (inputData !== undefined) {
    data = inputData;
  } else {
    // This case should technically be unreachable due to earlier checks
    throw new FastAgentError("Missing image source (path or data)");
  }

  if (!mimeType) {
    mimeType = "image/png"; // Default
  }

  const b64Data = data.toString("base64");

  const content: ImageContent = {
    type: "image",
    data: b64Data,
    mimeType: mimeType,
  };
  if (annotations) {
    content.annotations = annotations;
  }

  return {
    role,
    content,
  };
}

/**
 * Create a message with an embedded resource from a file.
 *
 * @param filePath - Path to the resource file
 * @param role - Role of the message, defaults to "user"
 * @param options - Optional mime type and annotations
 * @returns A dictionary with role and content that can be used in a prompt
 */
export function MCPFile(
  filePath: string,
  role: Role = "user",
  options?: { mimeType?: string; annotations?: Annotations },
): PromptMessage {
  const { annotations } = options ?? {};
  let { mimeType } = options ?? {};
  let resource: ResourceContents;

  try {
    const absolutePath = path.resolve(filePath); // Ensure absolute path for file URI
    const uri = `file://${absolutePath.replace(/\\/g, "/")}`; // Use forward slashes for URI

    if (!mimeType) {
      mimeType = guessMimeType(filePath);
    }

    const isBinary = isBinaryContent(mimeType);

    if (isBinary) {
      const binaryData = fs.readFileSync(filePath);
      const b64Data = binaryData.toString("base64");
      resource = {
        uri: uri as AnyUrl,
        blob: b64Data,
        mimeType: mimeType,
      };
    } else {
      try {
        const textData = fs.readFileSync(filePath, "utf-8");
        resource = {
          uri: uri as AnyUrl,
          text: textData,
          mimeType: mimeType,
        };
      } catch (error: any) {
        // Fallback to binary if text read fails (e.g., encoding issue)
        console.warn(
          `Warning: Failed to read ${filePath} as UTF-8, falling back to binary. Error: ${error.message}`,
        );
        const binaryData = fs.readFileSync(filePath);
        const b64Data = binaryData.toString("base64");
        resource = {
          uri: uri as AnyUrl,
          blob: b64Data,
          mimeType: mimeType || "application/octet-stream",
        };
      }
    }
  } catch (error: any) {
    throw new FastAgentError(
      `Error processing file ${filePath}: ${error.message}`,
    );
  }

  const content: EmbeddedResource = { type: "resource", resource };
  if (annotations) {
    content.annotations = annotations;
  }

  return {
    role,
    content,
  };
}

// Helper type guards
function isPromptMessage(item: any): item is PromptMessage {
  return (
    typeof item === "object" &&
    item !== null &&
    "role" in item &&
    "content" in item
  );
}

function isTextContent(item: any): item is TextContent {
  return typeof item === "object" && item !== null && item.type === "text";
}

function isImageContent(item: any): item is ImageContent {
  return typeof item === "object" && item !== null && item.type === "image";
}

function isEmbeddedResource(item: any): item is EmbeddedResource {
  return (
    typeof item === "object" &&
    item !== null &&
    item.type === "resource" &&
    "resource" in item
  );
}

function isResourceContents(item: any): item is ResourceContents {
  return (
    typeof item === "object" &&
    item !== null &&
    "uri" in item &&
    ("text" in item || "blob" in item)
  );
}

function isReadResourceResult(item: any): item is ReadResourceResult {
  // Check if item is an object, has a 'contents' property that is an array,
  // and every element in 'contents' satisfies isResourceContents
  return (
    typeof item === "object" &&
    item !== null &&
    Array.isArray((item as any).contents) &&
    (item as any).contents.every(isResourceContents)
  );
}

type MCPPromptInputItem =
  | PromptMessage
  | string
  | Buffer // Represents Python bytes
  | MCPContent // Includes TextContent, ImageContent, EmbeddedResource
  | ResourceContents // Standalone ResourceContents
  | ReadResourceResult; // Represents Python ReadResourceResult

/**
 * Create one or more prompt messages with various content types.
 * This function processes a list of content items and returns an array of PromptMessage objects.
 * It handles different input types like strings, Buffers, file paths (as strings),
 * and pre-defined MCP content types.
 *
 * @param role - The role for the messages ('user' or 'assistant').
 * @param contentItems - Variable number of content items to process.
 * @returns An array of PromptMessage objects.
 */
export function MCPPrompt(
  role: Role = "user",
  ...contentItems: MCPPromptInputItem[]
): PromptMessage[] {
  const result: PromptMessage[] = [];

  for (const item of contentItems) {
    if (isPromptMessage(item)) {
      // Already a fully formed message
      result.push(item);
    } else if (typeof item === "string") {
      // Could be simple text or a file path
      try {
        // Attempt to treat as file path first
        if (fs.existsSync(item) && fs.statSync(item).isFile()) {
          const mimeType = guessMimeType(item);
          if (isImageMimeType(mimeType)) {
            result.push(MCPImage({ path: item, role }));
          } else {
            result.push(MCPFile(item, role));
          }
        } else {
          // If it doesn't exist or isn't a file, treat as plain text
          result.push(MCPText(item, role));
        }
      } catch (error) {
        // If fs operations fail, treat as plain text
        console.warn(
          `Treating string as text because file check failed for "${item}": ${error instanceof Error ? error.message : error}`,
        );
        result.push(MCPText(item, role));
      }
    } else if (Buffer.isBuffer(item)) {
      // Raw binary data, assume image
      result.push(MCPImage({ data: item, role }));
    } else if (
      isTextContent(item) ||
      isImageContent(item) ||
      isEmbeddedResource(item)
    ) {
      // It's one of the MCPContent types, wrap it in a message
      result.push({ role, content: item });
    } else if (isResourceContents(item)) {
      // It's a ResourceContents, wrap it in an EmbeddedResource message
      result.push({ role, content: { type: "resource", resource: item } });
    } else if (isReadResourceResult(item)) {
      // Expand ReadResourceResult into multiple messages, each with one resource
      for (const resourceContent of item.contents) {
        result.push({
          role,
          content: { type: "resource", resource: resourceContent },
        });
      }
    } else {
      // Fallback: Try to convert to string
      console.warn(
        `MCPPrompt encountered an unknown content item type. Converting to string: ${typeof item}`,
      );
      try {
        result.push(MCPText(String(item), role));
      } catch (e) {
        console.error(
          "Failed to convert unknown item to string in MCPPrompt",
          item,
        );
        throw new FastAgentError(
          `Unsupported content type in MCPPrompt: ${typeof item}`,
        );
      }
    }
  }

  return result;
}

/** Create user message(s) with various content types. */
export function User(...contentItems: MCPPromptInputItem[]): PromptMessage[] {
  return MCPPrompt("user", ...contentItems);
}

/** Create assistant message(s) with various content types. */
export function Assistant(
  ...contentItems: MCPPromptInputItem[]
): PromptMessage[] {
  return MCPPrompt("assistant", ...contentItems);
}

/**
 * Create a single prompt message from content of various types.
 *
 * @param content - Content of various types (string, Buffer, etc.)
 * @param role - Role of the message
 * @returns A dictionary with role and content that can be used in a prompt
 */
export function createMessage(
  content: MCPPromptInputItem,
  role: Role = "user",
): PromptMessage {
  const messages = MCPPrompt(role, content);
  if (messages.length === 0) {
    // This might happen if the input type was completely unhandled or resulted in no content
    throw new FastAgentError(
      "Failed to create a message from the provided content.",
    );
  }
  if (messages.length > 1) {
    // This case can happen if a ReadResourceResult was passed
    console.warn(
      "createMessage received content that generated multiple messages (e.g., ReadResourceResult). Returning only the first message.",
    );
  }
  return messages[0];
}
