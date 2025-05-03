import { FastMCP, Context } from '../../../src/server'; // Assuming server is exported from src/server
import { SamplingMessage, TextContent, ImageContent, Image } from '@mcp/types'; // Assuming types are available

// Create a FastMCP server
const mcp = new FastMCP({ name: 'FastStoryAgent' });

// Resource to generate a short story
mcp.resource<{ topic: string }>('resource://fast-agent/short-story/{topic}', async (ctx: Context<{ topic: string }>) => {
    const topic = ctx.params.topic;
    const prompt = `Please write a short story on the topic of ${topic}.`;

    // Make a sampling request to the client
    const result = await ctx.session.createMessage({
        max_tokens: 1024,
        messages: [
            { role: 'user', content: { type: 'text', text: prompt } } as SamplingMessage,
        ],
    });

    // Assuming result.content is TextContent
    if (result.content?.type === 'text') {
        return result.content.text;
    } else {
        throw new Error('Expected text content from sampling request');
    }
});

// Tool to sample with an image
mcp.tool('sample_with_image', async (ctx: Context) => {
    // Construct the path to the image relative to the current file
    // Adjust if necessary based on where the server runs from
    const imagePath = 'image.png'; // Assuming image.png is in the same directory

    const result = await ctx.session.createMessage({
        max_tokens: 1024,
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: 'What is the username in this image?',
                },
            } as SamplingMessage,
            {
                role: 'user',
                // Need to confirm how Image content is created/referenced in TS
                // Assuming an Image class similar to Python exists
                // Or potentially creating ImageContent directly if path handling is different
                content: new Image(imagePath).toImageContent(), // This might need adjustment based on actual TS API
            } as SamplingMessage,
        ],
    });

     // Assuming result.content is TextContent
     if (result.content?.type === 'text') {
        return result.content.text;
    } else {
        throw new Error('Expected text content from sampling request with image');
    }
});

// Run the server when this file is executed directly
if (require.main === module) {
    mcp.run();
}

// Export for potential testing imports if needed
export { mcp };
