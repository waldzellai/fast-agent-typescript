import {
  guessMimeType,
  isTextMimeType,
  isBinaryContent,
  isImageMimeType,
} from "../../../src/utils";

describe("MIME Type Utilities", () => {
  describe("guessMimeType", () => {
    test("should return correct MIME type for known file extensions", () => {
      expect(guessMimeType("document.txt")).toBe("text/plain");
      expect(guessMimeType("style.css")).toBe("text/css");
      expect(guessMimeType("script.js")).toBe("application/javascript");
      expect(guessMimeType("image.png")).toBe("image/png");
      expect(guessMimeType("data.json")).toBe("application/json");
    });

    test("should handle case insensitivity in file extensions", () => {
      expect(guessMimeType("document.TXT")).toBe("text/plain");
      expect(guessMimeType("image.PNG")).toBe("image/png");
    });

    test("should return default MIME type for unknown extensions", () => {
      expect(guessMimeType("unknown.xyz")).toBe("application/octet-stream");
      expect(guessMimeType("file.noextension")).toBe(
        "application/octet-stream",
      );
    });
  });

  describe("isTextMimeType", () => {
    test("should return true for standard text MIME types", () => {
      expect(isTextMimeType("text/plain")).toBe(true);
      expect(isTextMimeType("text/html")).toBe(true);
      expect(isTextMimeType("text/css")).toBe(true);
    });

    test("should return true for known text-based MIME types not starting with text/", () => {
      expect(isTextMimeType("application/json")).toBe(true);
      expect(isTextMimeType("application/javascript")).toBe(true);
      expect(isTextMimeType("application/xml")).toBe(true);
    });

    test("should return true for MIME types with text patterns", () => {
      expect(isTextMimeType("application/custom+json")).toBe(true);
      expect(isTextMimeType("application/special+text")).toBe(true);
    });

    test("should return false for non-text MIME types", () => {
      expect(isTextMimeType("image/png")).toBe(false);
      expect(isTextMimeType("application/pdf")).toBe(false);
      expect(isTextMimeType("")).toBe(false);
    });
  });

  describe("isBinaryContent", () => {
    test("should return true for binary MIME types", () => {
      expect(isBinaryContent("image/png")).toBe(true);
      expect(isBinaryContent("application/pdf")).toBe(true);
    });

    test("should return false for text MIME types", () => {
      expect(isBinaryContent("text/plain")).toBe(false);
      expect(isBinaryContent("application/json")).toBe(false);
    });
  });

  describe("isImageMimeType", () => {
    test("should return true for image MIME types except SVG", () => {
      expect(isImageMimeType("image/png")).toBe(true);
      expect(isImageMimeType("image/jpeg")).toBe(true);
      expect(isImageMimeType("image/gif")).toBe(true);
    });

    test("should return false for SVG and non-image MIME types", () => {
      expect(isImageMimeType("image/svg+xml")).toBe(false);
      expect(isImageMimeType("text/plain")).toBe(false);
      expect(isImageMimeType("application/json")).toBe(false);
    });
  });
});
