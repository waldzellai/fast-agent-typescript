import * as fs from "fs";
import {
  MCPText,
  MCPImage,
  MCPFile,
  MCPPrompt,
  User,
  Assistant,
  createMessage,
  PromptMessage,
  TextContent,
  ImageContent,
  EmbeddedResource,
  ResourceContents,
} from "../../../src/core/mcpContent";
import { FastAgentError } from "../../../src/core/exceptions";

// Mock fs module for file operations
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(() => ({ isFile: () => true })),
}));

describe("MCP Content Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("MCPText", () => {
    test("should create a text content message with default role", () => {
      const message = MCPText("Hello, world!");
      expect(message.role).toBe("user");
      expect(message.content.type).toBe("text");
      expect((message.content as TextContent).text).toBe("Hello, world!");
    });

    test("should create a text content message with specified role and annotations", () => {
      const annotations = { source: "test" };
      const message = MCPText("Hello, world!", "assistant", annotations);
      expect(message.role).toBe("assistant");
      expect((message.content as TextContent).annotations).toBe(annotations);
    });
  });

  describe("MCPImage", () => {
    test("should create an image content message from file path", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        Buffer.from("mock image data"),
      );
      const message = MCPImage({ path: "image.png" });
      expect(message.role).toBe("user");
      expect(message.content.type).toBe("image");
      expect((message.content as ImageContent).mimeType).toBe("image/png");
      expect((message.content as ImageContent).data).toBe(
        Buffer.from("mock image data").toString("base64"),
      );
    });

    test("should create an image content message from data buffer", () => {
      const data = Buffer.from("mock image data");
      const message = MCPImage({ data });
      expect(message.role).toBe("user");
      expect(message.content.type).toBe("image");
      expect((message.content as ImageContent).mimeType).toBe("image/png");
      expect((message.content as ImageContent).data).toBe(
        data.toString("base64"),
      );
    });

    test("should throw error if neither path nor data is provided", () => {
      expect(() => MCPImage({})).toThrow(FastAgentError);
    });

    test("should throw error if both path and data are provided", () => {
      expect(() =>
        MCPImage({ path: "image.png", data: Buffer.from("data") }),
      ).toThrow(FastAgentError);
    });

    test("should throw error if file reading fails", () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File not found");
      });
      expect(() => MCPImage({ path: "invalid.png" })).toThrow(FastAgentError);
    });
  });

  describe("MCPFile", () => {
    test("should create a resource content message for text file", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("file content");
      const message = MCPFile("document.txt");
      expect(message.role).toBe("user");
      expect(message.content.type).toBe("resource");
      expect((message.content as EmbeddedResource).resource.mimeType).toBe(
        "text/plain",
      );
      const resource = (message.content as EmbeddedResource).resource;
      expect("text" in resource).toBe(true);
      if ("text" in resource) {
        expect(resource.text).toBe("file content");
      }
    });

    test("should create a resource content message for binary file", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        Buffer.from("binary data"),
      );
      const message = MCPFile("document.pdf");
      expect(message.role).toBe("user");
      expect(message.content.type).toBe("resource");
      expect((message.content as EmbeddedResource).resource.mimeType).toBe(
        "application/pdf",
      );
      const resource = (message.content as EmbeddedResource).resource;
      expect("blob" in resource).toBe(true);
      if ("blob" in resource) {
        expect(resource.blob).toBe(
          Buffer.from("binary data").toString("base64"),
        );
      }
    });

    test("should throw error if file processing fails", () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File not found");
      });
      expect(() => MCPFile("invalid.txt")).toThrow(FastAgentError);
    });
  });

  describe("MCPPrompt, User, and Assistant", () => {
    test("should create user messages from various content types", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("file content");
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const messages = User("Hello", "image.png");
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content.type).toBe("text");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content.type).toBe("image");
    });

    test("should create assistant messages from various content types", () => {
      const messages = Assistant("Response");
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content.type).toBe("text");
    });

    test("should handle file paths as resources or images based on MIME type", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("content");
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const messages = MCPPrompt("user", "text.txt", "image.png");
      expect(messages.length).toBe(2);
      expect(messages[0].content.type).toBe("resource");
      expect(messages[1].content.type).toBe("image");
    });
  });

  describe("createMessage", () => {
    test("should create a single message from text content", () => {
      const message = createMessage("Hello, world!");
      expect(message.role).toBe("user");
      expect(message.content.type).toBe("text");
      expect((message.content as TextContent).text).toBe("Hello, world!");
    });

    test("should throw error if no message is created", () => {
      // Mock an empty result from MCPPrompt (though this is unlikely in real usage)
      jest.spyOn(global, "MCPPrompt" as any).mockReturnValue([]);
      expect(() => createMessage("invalid")).toThrow(FastAgentError);
    });
  });
});
