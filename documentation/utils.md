# Utilities Module

**Purpose Statement**: This document details the Utilities module of the MCP Agent Framework in TypeScript, focusing on helper functions for handling MIME types and content classification.

**Last Updated**: April 14, 2025, 12:43 PM (America/Chicago, UTC-5:00)

## Overview

The Utilities module, located at `src/utils.ts`, provides a set of helper functions for the MCP Agent Framework, primarily focused on MIME type handling and content classification. It includes utilities to guess MIME types from file extensions, determine if content is text or binary, and identify image MIME types. These functions support various framework components by ensuring proper content handling and processing.

## Key Features

- **MIME Type Mapping**: Maintains a comprehensive mapping of file extensions to MIME types for common file formats.
- **MIME Type Guessing**: Offers a function to infer MIME types based on file extensions.
- **Text Content Detection**: Determines if a MIME type represents text content, supporting various text-based MIME types and patterns.
- **Binary Content Detection**: Identifies content as binary if it does not classify as text.
- **Image MIME Type Check**: Checks if a MIME type corresponds to an image format (excluding SVG for text compatibility).

## Setup and Configuration

The Utilities module does not require specific setup or configuration beyond importing it into the relevant parts of the framework. It can be used directly in TypeScript code as follows:

```typescript
import {
  guessMimeType,
  isTextMimeType,
  isBinaryContent,
  isImageMimeType,
} from "./src/utils";
```

No external dependencies or configuration files are needed for its operation.

## Usage

### Guessing MIME Types

Determine the MIME type of a file based on its extension:

```typescript
import { guessMimeType } from "./src/utils";

const mimeType = guessMimeType("document.pdf");
console.log(mimeType); // Outputs: "application/pdf"

const unknownMime = guessMimeType("file.xyz");
console.log(unknownMime); // Outputs: "application/octet-stream"
```

### Checking for Text Content

Check if a MIME type represents text content:

```typescript
import { isTextMimeType } from "./src/utils";

const isText = isTextMimeType("text/plain");
console.log(isText); // Outputs: true

const isJsonText = isTextMimeType("application/json");
console.log(isJsonText); // Outputs: true

const isNotText = isTextMimeType("image/png");
console.log(isNotText); // Outputs: false
```

### Identifying Binary Content

Determine if content should be treated as binary:

```typescript
import { isBinaryContent } from "./src/utils";

const isBinary = isBinaryContent("application/pdf");
console.log(isBinary); // Outputs: true

const isNotBinary = isBinaryContent("text/html");
console.log(isNotBinary); // Outputs: false
```

### Detecting Image MIME Types

Check if a MIME type represents an image (excluding SVG):

```typescript
import { isImageMimeType } from "./src/utils";

const isImage = isImageMimeType("image/png");
console.log(isImage); // Outputs: true

const isSvg = isImageMimeType("image/svg+xml");
console.log(isSvg); // Outputs: false

const isNotImage = isImageMimeType("text/plain");
console.log(isNotImage); // Outputs: false
```

## Integration

The Utilities module integrates with other components of the framework as follows:

- **MCP Agent**: Supports content handling in [MCP Agent](./mcp-agent.md) by providing MIME type classification for message processing.
- **Server**: Assists [Server](./server.md) in determining content types for data transmission or resource handling.
- **CLI Interface**: May be used by [CLI Interface](./cli.md) for file processing or validation tasks.
- **Core Modules**: Provides utility support to [Core Modules](./core-modules.md) for content-related operations.
- **Entry Point**: Can be utilized indirectly through other modules from [Entry Point](./entry-point.md).

## Cross-References

- For an overview of the framework, refer to [Overview](./overview.md).
- For agent-specific documentation, see [MCP Agent](./mcp-agent.md).
- For server configurations, check [Server](./server.md).
- For command-line interactions, consult [CLI Interface](./cli.md).
- For core functionalities, explore [Core Modules](./core-modules.md).
- For entry point details, see [Entry Point](./entry-point.md).

## Conclusion

The Utilities module is an essential part of the MCP Agent Framework, offering critical helper functions for MIME type handling and content classification. By providing tools to guess MIME types, detect text or binary content, and identify images, it ensures proper content management across various framework components, enhancing interoperability and data processing efficiency.
