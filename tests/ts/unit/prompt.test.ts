import {
  Prompt,
  isTextContent,
  isImageContent,
  isEmbeddedResource,
  isPromptMessage,
  isPromptMessageMultipart,
} from "../../../src/core/prompt";

describe("Prompt Class", () => {
  describe("Prompt.user", () => {
    test("should create a user message with text content", () => {
      const message = Prompt.user("Hello, world!");
      expect(message.role).toBe("user");
      expect(message.content).toHaveLength(1);
      expect(message.content[0].type).toBe("text");
      expect((message.content[0] as { text: string }).text).toBe(
        "Hello, world!",
      );
    });

    test("should handle multiple content items", () => {
      const message = Prompt.user("Text part", {
        type: "text",
        text: "Another text",
      });
      expect(message.role).toBe("user");
      expect(message.content).toHaveLength(2);
      expect(message.content[0].type).toBe("text");
      expect((message.content[0] as { text: string }).text).toBe("Text part");
      expect(message.content[1].type).toBe("text");
      expect((message.content[1] as { text: string }).text).toBe(
        "Another text",
      );
    });
  });

  describe("Prompt.assistant", () => {
    test("should create an assistant message with text content", () => {
      const message = Prompt.assistant("Hello, user!");
      expect(message.role).toBe("assistant");
      expect(message.content).toHaveLength(1);
      expect(message.content[0].type).toBe("text");
      expect((message.content[0] as { text: string }).text).toBe(
        "Hello, user!",
      );
    });

    test("should handle multiple content items", () => {
      const message = Prompt.assistant("Text part", {
        type: "text",
        text: "Another text",
      });
      expect(message.role).toBe("assistant");
      expect(message.content).toHaveLength(2);
      expect(message.content[0].type).toBe("text");
      expect((message.content[0] as { text: string }).text).toBe("Text part");
      expect(message.content[1].type).toBe("text");
      expect((message.content[1] as { text: string }).text).toBe(
        "Another text",
      );
    });
  });

  describe("Prompt.message", () => {
    test("should create a message with default user role", () => {
      const message = Prompt.message("Hello, world!");
      expect(message.role).toBe("user");
      expect(message.content).toHaveLength(1);
      expect(message.content[0].type).toBe("text");
      expect((message.content[0] as { text: string }).text).toBe(
        "Hello, world!",
      );
    });

    test("should create a message with specified role", () => {
      const message = Prompt.message("Hello, world!", { role: "assistant" });
      expect(message.role).toBe("assistant");
      expect(message.content).toHaveLength(1);
      expect(message.content[0].type).toBe("text");
      expect((message.content[0] as { text: string }).text).toBe(
        "Hello, world!",
      );
    });

    test("should handle empty content items", () => {
      const message = Prompt.message();
      expect(message.role).toBe("user");
      expect(message.content).toHaveLength(0);
    });
  });

  describe("Prompt.conversation", () => {
    test("should create a conversation from multiple messages", () => {
      const userMsg = Prompt.user("Hello!");
      const assistantMsg = Prompt.assistant("Hi there!");
      const conversation = Prompt.conversation(userMsg, assistantMsg);
      expect(conversation).toHaveLength(2);
      expect(conversation[0].role).toBe("user");
      expect(conversation[1].role).toBe("assistant");
    });

    test("should handle nested arrays of messages", () => {
      const userMsg = Prompt.user("Hello!");
      const assistantMsg = Prompt.assistant("Hi there!");
      const conversation = Prompt.conversation([userMsg, assistantMsg]);
      expect(conversation).toHaveLength(2);
      expect(conversation[0].role).toBe("user");
      expect(conversation[1].role).toBe("assistant");
    });

    test("should handle empty input", () => {
      const conversation = Prompt.conversation();
      expect(conversation).toHaveLength(0);
    });
  });

  describe("Prompt.fromMultipart", () => {
    test("should convert multipart messages to regular messages", () => {
      const multipart = [
        Prompt.user("Part 1", { type: "text", text: "Part 2" }),
        Prompt.assistant("Response 1", { type: "text", text: "Response 2" }),
      ];
      const messages = Prompt.fromMultipart(multipart);
      expect(messages).toHaveLength(4); // Assuming one message per content part
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("user");
      expect(messages[2].role).toBe("assistant");
      expect(messages[3].role).toBe("assistant");
    });

    test("should handle empty multipart array", () => {
      const messages = Prompt.fromMultipart([]);
      expect(messages).toHaveLength(0);
    });
  });
});

describe("Type Guards", () => {
  describe("isTextContent", () => {
    test("should return true for valid TextContent", () => {
      const content = { type: "text", text: "Hello" };
      expect(isTextContent(content)).toBe(true);
    });

    test("should return false for invalid TextContent", () => {
      const content = { type: "image", text: "Hello" };
      expect(isTextContent(content)).toBe(false);
    });
  });

  describe("isImageContent", () => {
    test("should return true for valid ImageContent", () => {
      const content = {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "data" },
      };
      expect(isImageContent(content)).toBe(true);
    });

    test("should return false for invalid ImageContent", () => {
      const content = { type: "text", text: "Hello" };
      expect(isImageContent(content)).toBe(false);
    });
  });

  describe("isEmbeddedResource", () => {
    test("should return true for valid EmbeddedResource", () => {
      const content = { type: "resource_ref", uri: "uri://example" };
      expect(isEmbeddedResource(content)).toBe(true);
    });

    test("should return false for invalid EmbeddedResource", () => {
      const content = { type: "text", text: "Hello" };
      expect(isEmbeddedResource(content)).toBe(false);
    });
  });

  describe("isPromptMessage", () => {
    test("should return true for valid PromptMessage", () => {
      const message = { role: "user", content: "Hello" };
      expect(isPromptMessage(message)).toBe(true);
    });

    test("should return false for invalid PromptMessage", () => {
      const message = { type: "text", text: "Hello" };
      expect(isPromptMessage(message)).toBe(false);
    });
  });

  describe("isPromptMessageMultipart", () => {
    test("should return true for valid PromptMessageMultipart", () => {
      const message = {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      };
      expect(isPromptMessageMultipart(message)).toBe(true);
    });

    test("should return false for invalid PromptMessageMultipart", () => {
      const message = { role: "user", content: "Hello" };
      expect(isPromptMessageMultipart(message)).toBe(false);
    });
  });
});
