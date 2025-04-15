import { PathLike } from "fs"; // Using PathLike as a stand-in for pathlib.Path type hint

// --- Placeholder Types and Type Guards (since @modelcontextprotocol/types is not found) ---
export type Role = "user" | "assistant";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  source: {
    type: "base64"; // Assuming base64 for simplicity
    media_type: string;
    data: string;
  };
}

export interface EmbeddedResource {
  type: "resource_ref";
  uri: string;
  // Add other potential fields if known
}

export type ContentPart = TextContent | ImageContent | EmbeddedResource; // Add other types as needed

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

export function isImageContent(obj: any): obj is ImageContent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    obj.type === "image" &&
    typeof obj.source === "object"
  );
}

export function isEmbeddedResource(obj: any): obj is EmbeddedResource {
  return (
    typeof obj === "object" &&
    obj !== null &&
    obj.type === "resource_ref" &&
    typeof obj.uri === "string"
  );
}
// --- End Placeholders ---
// Assuming a helper function exists or can be created to handle content conversion
// For now, we'll define a placeholder type and function signature
type MCPContentType = TextContent | ImageContent | EmbeddedResource;
type InputContentItem =
  | string
  | PathLike // Representing Path
  | Buffer // Representing bytes
  | Record<string, any> // Representing dict
  | MCPContentType
  | PromptMessage
  | PromptMessageMultipart;

// Placeholder for the logic that was in Python's .mcp_content helpers
// This function would inspect the item and return the appropriate ContentPart(s)
// This is a simplified placeholder implementation. The actual implementation
// would need file type detection, etc.
function createContentParts(item: InputContentItem): ContentPart[] {
  if (typeof item === "string") {
    // Basic check: assume string is text content
    // A real implementation might check if it's a file path
    return [{ type: "text", text: item }];
  } else if (Buffer.isBuffer(item)) {
    // Assume buffer is image data (needs proper handling/encoding)
    // Placeholder: requires actual image processing logic
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: item.toString("base64"),
        },
      },
    ];
  } else if (
    isTextContent(item) ||
    isImageContent(item) ||
    isEmbeddedResource(item)
  ) {
    // If it's already a valid ContentPart type
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
      return content as ContentPart[];
    }
  }
  // Fallback or throw error for unsupported types
  console.warn(`Unsupported content item type: ${typeof item}`);
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
    return Prompt.message(...contentItems, { role: "user" });
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
    return Prompt.message(...contentItems, { role: "assistant" });
  }

  /**
   * Create a PromptMessageMultipart with the specified role and content items.
   *
   * @param contentItems - Content items in various formats.
   * @param role - Role for the message ('user' or 'assistant').
   * @returns A PromptMessageMultipart with the specified role and content.
   */
  static message(
    ...contentItems:
      | [...InputContentItem[], { role: Role }]
      | InputContentItem[]
  ): PromptMessageMultipart {
    let role: Role = "user"; // Default role
    let items: InputContentItem[] = [];

    // Check if the last argument is a role object
    if (
      contentItems.length > 0 &&
      typeof contentItems[contentItems.length - 1] === "object" &&
      contentItems[contentItems.length - 1] !== null &&
      !Array.isArray(contentItems[contentItems.length - 1]) &&
      !Buffer.isBuffer(contentItems[contentItems.length - 1]) &&
      "role" in (contentItems[contentItems.length - 1] as object)
    ) {
      role = (contentItems.pop() as { role: Role }).role;
      items = contentItems as InputContentItem[];
    } else {
      items = contentItems as InputContentItem[];
    }

    // Handle single PromptMessage or PromptMessageMultipart input
    if (items.length === 1) {
      const item = items[0];
      if (isPromptMessage(item)) {
        // If content is string, wrap in TextContent part
        const contentParts =
          typeof item.content === "string"
            ? [{ type: "text", text: item.content } as TextContent]
            : item.content; // Assuming item.content is ContentPart[] otherwise
        return { role, content: contentParts };
      } else if (isPromptMessageMultipart(item)) {
        // Keep the content but override the role
        return { role, content: item.content };
      }
    }

    // Process multiple content items using the placeholder logic
    const combinedContent: ContentPart[] = items.flatMap(createContentParts);

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
