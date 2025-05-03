/**
 * Simple MCP server that responds to tool calls with text and image content.
 * TypeScript port of test_routing_server.py
 */

import * as fs from 'fs';
import { FastMCP, Context } from '../../../src/mcp/server/fastmcp';

// Create the FastMCP server
const app = new FastMCP('Integration Server');

/**
 * Returns the weather for a specified location.
 * @param ctx The MCP context
 * @param location The location to check weather for
 * @returns A string with the weather condition
 */
app.tool({
  name: 'check_weather',
  description: 'Returns the weather for a specified location.',
  handler: async (ctx: Context, location: string): Promise<string> => {
    // Write the location to a text file
    fs.writeFileSync('weather_location.txt', location);

    // Return stormy weather condition
    return `It's stormy and cold in ${location}`;
  }
});

// Run the server using stdio transport
if (require.main === module) {
  app.run({ transport: 'stdio' });
}

export default app;
