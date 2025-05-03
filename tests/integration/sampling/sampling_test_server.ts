/**
 * Enhanced test server for sampling functionality in TypeScript
 * 
 * This is a simplified version of the sampling test server for testing purposes.
 * In a real implementation, this would be a full MCP server.
 */

import { FastMCP } from '../../../src/server';

// Configure logging
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error),
  debug: (message: string) => console.log(`[DEBUG] ${message}`)
};

// Create a simplified MCP server for testing
const mcp: Partial<FastMCP> = {
  tool: (options: { name: string; description: string }) => {
    logger.info(`Registering tool: ${options.name}`);
    return (fn: Function) => {
      logger.info(`Tool function registered for: ${options.name}`);
    };
  },
  prompt: (options: { name: string; description: string }) => {
    logger.info(`Registering prompt: ${options.name}`);
    return (fn: Function) => {
      logger.info(`Prompt function registered for: ${options.name}`);
    };
  },
  run: (options: { transport: string }) => {
    logger.info(`Running server with transport: ${options.transport}`);
  },
  run_sse_async: async () => {
    logger.info('Running server with SSE transport');
  },
  run_stdio_async: async () => {
    logger.info('Running server with STDIO transport');
  },
  settings: {
    host: '0.0.0.0',
    port: 8000
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  logger.info("Starting sampling test server...");
  mcp.run?.({ transport: 'sse' });
}

// Export for testing
export { mcp };
