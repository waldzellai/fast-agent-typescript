/**
 * TypeScript configuration for sampling tests
 * This is equivalent to the YAML configuration in fastagent.config.yaml
 */

export const config = {
  default_model: "sampling-model",

  // Logging and Console Configuration
  logger: {
    level: "error",
    type: "file",
    // path: "/path/to/logfile.jsonl",

    // Switch the progress display on or off
    progress_display: true,

    // Show chat User/Assistant messages on the console
    show_chat: true,
    // Show tool calls on the console
    show_tools: true,
    // Truncate long tool responses on the console
    truncate_tools: true
  },

  mcp: {
    servers: {
      sampling_test: {
        command: "node",
        args: ["tests/integration/sampling/sampling_test_server.ts"],
        sampling: {
          model: "sampling-model"
        }
      }
    }
  }
};
