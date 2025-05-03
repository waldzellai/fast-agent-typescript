import {
  MCPException,
  validateString,
  validateNumber,
  validateBoolean,
  validateObject,
  validateArray,
  validateBaseRequestParams,
  validateContentRequestParams,
  validateWorkflowRequestParams,
  createDefaultBaseRequestParams,
  createDefaultContentRequestParams,
  createDefaultWorkflowRequestParams,
  BaseRequestParams,
  ContentRequestParams,
  WorkflowRequestParams,
} from "../../../src/core/requestParams";

// Mock crypto module for UUID generation
jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "mock-uuid"),
}));

describe("Request Parameters Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Validation Functions", () => {
    describe("validateString", () => {
      test("should return string value if valid", () => {
        expect(validateString("test", "paramName")).toBe("test");
      });

      test("should throw MCPException if value is not a string", () => {
        expect(() => validateString(123, "paramName")).toThrow(MCPException);
        expect(() => validateString(123, "paramName")).toThrow(
          "paramName must be a string",
        );
      });
    });

    describe("validateNumber", () => {
      test("should return number value if valid", () => {
        expect(validateNumber(42, "paramName")).toBe(42);
      });

      test("should throw MCPException if value is not a number", () => {
        expect(() => validateNumber("not a number", "paramName")).toThrow(
          MCPException,
        );
        expect(() => validateNumber("not a number", "paramName")).toThrow(
          "paramName must be a number",
        );
      });

      test("should throw MCPException if value is below minimum", () => {
        expect(() => validateNumber(5, "paramName", { min: 10 })).toThrow(
          MCPException,
        );
        expect(() => validateNumber(5, "paramName", { min: 10 })).toThrow(
          "paramName must be at least 10",
        );
      });

      test("should throw MCPException if value is above maximum", () => {
        expect(() => validateNumber(15, "paramName", { max: 10 })).toThrow(
          MCPException,
        );
        expect(() => validateNumber(15, "paramName", { max: 10 })).toThrow(
          "paramName must be at most 10",
        );
      });
    });

    describe("validateBoolean", () => {
      test("should return boolean value if valid", () => {
        expect(validateBoolean(true, "paramName")).toBe(true);
        expect(validateBoolean(false, "paramName")).toBe(false);
      });

      test("should throw MCPException if value is not a boolean", () => {
        expect(() => validateBoolean("true", "paramName")).toThrow(
          MCPException,
        );
        expect(() => validateBoolean("true", "paramName")).toThrow(
          "paramName must be a boolean",
        );
      });
    });

    describe("validateObject", () => {
      test("should return object value if valid", () => {
        const obj = { key: "value" };
        expect(validateObject(obj, "paramName")).toBe(obj);
      });

      test("should throw MCPException if value is not an object", () => {
        expect(() => validateObject("not an object", "paramName")).toThrow(
          MCPException,
        );
        expect(() => validateObject("not an object", "paramName")).toThrow(
          "paramName must be an object",
        );
        expect(() => validateObject(null, "paramName")).toThrow(MCPException);
      });
    });

    describe("validateArray", () => {
      test("should return array value if valid", () => {
        const arr = [1, 2, 3];
        expect(validateArray(arr, "paramName")).toBe(arr);
      });

      test("should throw MCPException if value is not an array", () => {
        expect(() => validateArray("not an array", "paramName")).toThrow(
          MCPException,
        );
        expect(() => validateArray("not an array", "paramName")).toThrow(
          "paramName must be an array",
        );
      });
    });
  });

  describe("Request Parameter Validation", () => {
    describe("validateBaseRequestParams", () => {
      test("should validate base request parameters", () => {
        const params: BaseRequestParams = {
          request_id: "test-id",
          agent_config: { name: "test-agent" },
          prompt_config: { model: "test-model" },
        };
        expect(validateBaseRequestParams(params)).toBe(params);
      });

      test("should throw MCPException for invalid request_id", () => {
        const params = { request_id: 123 } as unknown as BaseRequestParams;
        expect(() => validateBaseRequestParams(params)).toThrow(MCPException);
      });
    });

    describe("validateContentRequestParams", () => {
      test("should validate content request parameters", () => {
        const params: ContentRequestParams = {
          request_id: "test-id",
          content: { type: "text", text: "Hello" },
        };
        expect(validateContentRequestParams(params)).toBe(params);
      });

      test("should throw MCPException for invalid content", () => {
        const params = {
          content: "not an object",
        } as unknown as ContentRequestParams;
        expect(() => validateContentRequestParams(params)).toThrow(
          MCPException,
        );
      });
    });

    describe("validateWorkflowRequestParams", () => {
      test("should validate workflow request parameters", () => {
        const params: WorkflowRequestParams = {
          request_id: "test-id",
          execute: true,
          max_iterations: 5,
          timeout: 100,
        };
        expect(validateWorkflowRequestParams(params)).toBe(params);
      });

      test("should throw MCPException for invalid execute", () => {
        const params = { execute: "true" } as unknown as WorkflowRequestParams;
        expect(() => validateWorkflowRequestParams(params)).toThrow(
          MCPException,
        );
      });

      test("should throw MCPException for invalid max_iterations", () => {
        const params = {
          max_iterations: 0,
        } as unknown as WorkflowRequestParams;
        expect(() => validateWorkflowRequestParams(params)).toThrow(
          MCPException,
        );
      });

      test("should throw MCPException for invalid timeout", () => {
        const params = { timeout: -1 } as unknown as WorkflowRequestParams;
        expect(() => validateWorkflowRequestParams(params)).toThrow(
          MCPException,
        );
      });
    });
  });

  describe("Default Parameter Creation", () => {
    test("createDefaultBaseRequestParams should return default base params", () => {
      const params = createDefaultBaseRequestParams();
      expect(params.request_id).toBe("mock-uuid");
      expect(params.agent_config).toBeUndefined();
      expect(params.prompt_config).toBeUndefined();
    });

    test("createDefaultContentRequestParams should return default content params", () => {
      const params = createDefaultContentRequestParams();
      expect(params.request_id).toBe("mock-uuid");
      expect(params.content).toEqual({});
    });

    test("createDefaultWorkflowRequestParams should return default workflow params", () => {
      const params = createDefaultWorkflowRequestParams();
      expect(params.request_id).toBe("mock-uuid");
      expect(params.execute).toBe(true);
      expect(params.max_iterations).toBe(10);
      expect(params.timeout).toBe(300);
    });
  });
});
