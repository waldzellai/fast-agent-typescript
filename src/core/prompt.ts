import { PathLike } from 'fs'; // Import PathLike
import * as fs from 'fs';
import * as path from 'path';

// Basic mime type lookup based on extension
const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.txt': return 'text/plain';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    // Add more common types as needed
    default: return 'application/octet-stream'; // Default binary type
  }
};

// Define Role enum (if not already defined elsewhere)
export enum Role {
  User = "user",
  Assistant = "assistant",
  System = "system",
}

export interface TextContent {
  type: "text";
  text: string;
}

// UPDATED ImageContent interface to match mcpContent.ts
export interface ImageContent {
  type: "image";
  // source: {
  //   type: "base64";
  //   media_type: string;
  //   data: string;
  // };
  data: string; // Base64 encoded data
  mimeType: string;
}

// UPDATED EmbeddedResource interface to match mcpContent.ts
export interface EmbeddedResource {
  type: "resource"; // Changed from 'resource_ref'
  // uri: string;
  // mimeType?: string;
  resource: {
      uri: string;
      text?: string; // Optional text content if directly available
      mimeType: string;
      data?: string; // Optional base64 data for images/binary
  };
}

export type ContentPart = TextContent | ImageContent | EmbeddedResource; 

export interface PromptMessage {
  role: Role;
  content: ContentPart[] | string; // MCP allows string content too
}

export interface PromptMessageMultipart {
  role: Role;
  content: ContentPart[];
}

export function isPromptMessage(obj: any): obj is PromptMessage {
  return (
    typeof obj === "object" && obj !== null && "role" in obj && "content" in obj
  );
}

export function isPromptMessageMultipart(
  obj: any,
): obj is PromptMessageMultipart {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "role" in obj &&
    "content" in obj &&
    Array.isArray(obj.content)
  );
}

export function isTextContent(obj: any): obj is TextContent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    obj.type === "text" &&
    typeof obj.text === "string"
  );
}

// UPDATED isImageContent type guard
export function isImageContent(obj: any): obj is ImageContent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    obj.type === "image" &&
    // typeof obj.source === "object" // Old check
    typeof obj.data === "string" && // New check
    typeof obj.mimeType === "string" // New check
  );
}

// UPDATED isEmbeddedResource type guard
export function isEmbeddedResource(obj: any): obj is EmbeddedResource {
  return (
    typeof obj === "object" &&
    obj !== null &&
    // obj.type === "resource_ref" && // Old check
    // typeof obj.uri === "string" // Old check
    obj.type === "resource" && // New check
    typeof obj.resource === "object" && // New check
    typeof obj.resource.uri === "string" && // New check
    typeof obj.resource.mimeType === "string" // New check
  );
}

// Type guard for ReadResourceResult-like objects (duck typing)
function isReadResourceResult(obj: any): obj is { contents: Array<Record<string, any> & { uri: string }> } {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        Array.isArray(obj.contents) &&
        // Optional: check if items in contents look like resources
        (obj.contents.length === 0 || 
            (typeof obj.contents[0] === 'object' && obj.contents[0] !== null && 'uri' in obj.contents[0]))
    );
}

// Type guard for TextResourceContents-like objects (duck typing)
function isTextResourceContents(obj: any): obj is { uri: string; mimeType: string; text?: string } {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.uri === 'string' &&
        typeof obj.mimeType === 'string'
        // We don't strictly require 'text' as it might be binary
    );
}

type MCPContentType = TextContent | ImageContent | EmbeddedResource;
type InputContentItem =
  | string
  | PathLike // Representing Path
  | Buffer // Representing bytes
  | Record<string, any> // Representing dict
  | MCPContentType
  | PromptMessage
  | PromptMessageMultipart;

// The core function to convert various inputs into an array of ContentPart
function createContentParts(item: InputContentItem): ContentPart[] {
  if (typeof item === "string") {
    // Check if it's a file path
    try {
        if (fs.existsSync(item)) {
            const stats = fs.statSync(item);
            if (stats.isFile()) {
                const mimeType = getMimeType(item);
                const buffer = fs.readFileSync(item);
                const uri = path.resolve(item); // Get absolute path as URI

                if (mimeType.startsWith('image/')) {
                    return [{
                        type: 'image',
                        data: buffer.toString('base64'),
                        mimeType: mimeType,
                    }];
                } else if (mimeType.startsWith('text/')) {
                    // Create EmbeddedResource for text files
                    return [{
                        type: 'resource',
                        resource: {
                            uri: `file://${uri}`,
                            text: buffer.toString('utf8'),
                            mimeType: mimeType
                        }
                    }];
                } else {
                    // Create EmbeddedResource for other binary files
                     return [{
                        type: 'resource',
                        resource: {
                            uri: `file://${uri}`,
                            mimeType: mimeType,
                            // Optionally include base64 data for binary types if needed
                            // data: buffer.toString('base64') 
                        }
                    }];
                }
            }
        }
    } catch (error) {
        // If fs.existsSync or other fs operations fail, treat as string
        console.warn(`Error accessing path '${item}': ${error}. Treating as text.`);
    }
    // If not a valid file path or error occurred, treat as plain text
    return [{ type: "text", text: item }];
  } else if (Buffer.isBuffer(item)) {
    // Assume buffer is image data (defaulting to png for now)
    // A more robust implementation might require explicit mime type
    return [
      {
        type: "image",
        // source: { // Old structure
        //   type: "base64",
        //   media_type: "image/png", 
        //   data: item.toString("base64"),
        // },
        data: item.toString("base64"), // New structure
        mimeType: "image/png" // New structure - assuming png
      },
    ];
  } else if (
    isTextContent(item) ||
    isImageContent(item) ||
    isEmbeddedResource(item)
  ) {
    // If it's already a valid ContentPart type (matching updated interfaces)
    return [item];
  } else if (isPromptMessage(item)) {
    // Extract content part(s) from PromptMessage content
    if (typeof item.content === "string") {
      return [{ type: "text", text: item.content }];
    } else if (Array.isArray(item.content)) {
      return item.content;
    }
  } else if (isPromptMessageMultipart(item)) {
    // Extract content parts from PromptMessageMultipart
    return item.content;
  } else if (isReadResourceResult(item)) { // Handle ReadResourceResult 
    // Process each item in the 'contents' array
    // Assuming contents are TextResourceContents-like
    return item.contents.flatMap((resourceItem: any) => {
        if (typeof resourceItem === 'object' && resourceItem !== null && resourceItem.uri) {
            // Convert TextResourceContents-like to EmbeddedResource
            return [{
                 type: 'resource',
                 resource: { // Ensure structure matches EmbeddedResource
                    uri: resourceItem.uri,
                    text: resourceItem.text,
                    mimeType: resourceItem.mimeType
                 }
             }] as EmbeddedResource[];
        }
        return []; // Ignore malformed items
    });
  } else if (isTextResourceContents(item)) { 
      return [{
          type: 'resource',
          resource: {
              uri: item.uri,
              mimeType: item.mimeType,
              text: item.text // Include text if present
          }
      }];
  } else if (
    typeof item === "object" &&
    item !== null &&
    !Array.isArray(item) &&
    "content" in item
  ) {
    // Handle dict-like objects with 'content'
    const content = (item as { content: any }).content;
    if (typeof content === "string") {
      return [{ type: "text", text: content }];
    } else if (Array.isArray(content)) {
      // Assuming content is already an array of ContentPart
      // Need to be careful here - might need further validation/conversion
      return content as ContentPart[];
    }
  }
  // Fallback or throw error for unsupported types
  console.warn(`Unsupported content item type: ${typeof item} or structure mismatch.`);
  return [];
}

/**
 * A helper class for working with MCP prompt content.
 *
 * This class provides static methods to create:
 * - PromptMessage instances
 * - PromptMessageMultipart instances
 * - Lists of messages for conversations
 *
 * All methods intelligently handle various content types:
 * - Strings become TextContent
 * - Image file paths become ImageContent (requires actual implementation)
 * - Other file paths become EmbeddedResource (requires actual implementation)
 * - Buffer (bytes) become ImageContent (requires actual implementation)
 * - TextContent objects are used directly
 * - ImageContent objects are used directly
 * - EmbeddedResource objects are used directly
 * - Pre-formatted messages pass through unchanged or have content extracted
 */
export class Prompt {
  /**
   * Create a user PromptMessageMultipart with various content items.
   *
   * @param contentItems - Content items in various formats.
   * @returns A PromptMessageMultipart with user role and the specified content.
   */
  static user(...contentItems: InputContentItem[]): PromptMessageMultipart {
    return Prompt.message(...contentItems, { role: Role.User }); 
  }

  /**
   * Create an assistant PromptMessageMultipart with various content items.
   *
   * @param contentItems - Content items in various formats.
   * @returns A PromptMessageMultipart with assistant role and the specified content.
   */
  static assistant(
    ...contentItems: InputContentItem[]
  ): PromptMessageMultipart {
    return Prompt.message(...contentItems, { role: Role.Assistant });
  }

  /**
   * Create a PromptMessageMultipart with the specified role and content items.
   *
   * @param contentItems - Content items in various formats.
   * @param role - Role for the message ('user' or 'assistant').
   * @returns A PromptMessageMultipart with the specified role and content.
   */
  static message(
    ...args: (InputContentItem | { role: Role })[]
  ): PromptMessageMultipart {
    let role: Role = Role.User; // Default role using enum
    let contentItems: InputContentItem[] = [];

    // Separate role object from content items
    if (args.length > 0) {
        const lastArg = args[args.length - 1];
        // Check if it's an object, has ONLY 'role' key, and 'role' is a valid Role enum value
        if (
            typeof lastArg === "object" &&
            lastArg !== null &&
            !Array.isArray(lastArg) && 
            Object.keys(lastArg).length === 1 && 
            'role' in lastArg &&
            Object.values(Role).includes((lastArg as {role: Role}).role) 
        ) {
            role = (lastArg as { role: Role }).role;
            contentItems = args.slice(0, -1) as InputContentItem[]; // All args except the last
        } else {
            // Last arg is not the role object, treat all args as content
            contentItems = args as InputContentItem[];
        }
    } // If args is empty, role stays User, contentItems stays empty.

    // Flatten content parts from all input items
    const combinedContent: ContentPart[] = [];
    for (const item of contentItems) {
        const parts = createContentParts(item);
        combinedContent.push(...parts); 
    }

    return {
      role,
      content: combinedContent,
    };
  }

  /**
   * Create a list of PromptMessages from various inputs.
   *
   * This method accepts:
   * - PromptMessageMultipart instances
   * - PromptMessage instances
   * - Arrays containing PromptMessage or PromptMessageMultipart
   *
   * @param messages - Messages to include in the conversation.
   * @returns A list of PromptMessage objects for the conversation.
   */
  static conversation(
    ...messages: (
      | PromptMessageMultipart
      | PromptMessage
      | (PromptMessage | PromptMessageMultipart)[]
    )[]
  ): PromptMessage[] {
    const result: PromptMessage[] = [];

    for (const item of messages) {
      if (isPromptMessageMultipart(item)) {
        // Convert PromptMessageMultipart to a list of PromptMessages
        // Assuming PromptMessageMultipart has a method or logic to do this
        // For now, we'll create one message per part for simplicity
        item.content.forEach((part: ContentPart) => {
          // Added type annotation
          // This simplification might lose context if parts belong together
          result.push({ role: item.role, content: [part] });
        });
        // A more accurate conversion might require PromptMessageMultipart.fromMultipart()
        // result.push(...item.fromMultipart()); // If such a method exists
      } else if (isPromptMessage(item)) {
        result.push(item);
      } else if (Array.isArray(item)) {
        // Process each item in the list recursively or iteratively
        for (const msg of item) {
          if (isPromptMessageMultipart(msg)) {
            msg.content.forEach((part: ContentPart) => {
              // Added type annotation
              result.push({ role: msg.role, content: [part] });
            });
            // Or: result.push(...msg.fromMultipart());
          } else if (isPromptMessage(msg)) {
            result.push(msg);
          }
          // Ignore other types within the array
        }
      }
      // Ignore other types
    }

    return result;
  }

  /**
   * Convert a list of PromptMessageMultipart objects to PromptMessages.
   *
   * @param multipart - List of PromptMessageMultipart objects.
   * @returns A flat list of PromptMessage objects.
   */
  static fromMultipart(multipart: PromptMessageMultipart[]): PromptMessage[] {
    const result: PromptMessage[] = [];
    for (const mp of multipart) {
      // Assuming PromptMessageMultipart has a method or logic to do this
      // For now, we'll create one message per part for simplicity
      mp.content.forEach((part: ContentPart) => {
        // Added type annotation
        // This simplification might lose context if parts belong together
        result.push({ role: mp.role, content: [part] });
      });
      // A more accurate conversion might require PromptMessageMultipart.fromMultipart()
      // result.push(...mp.fromMultipart()); // If such a method exists
    }
    return result;
  }
}
