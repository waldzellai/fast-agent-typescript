import { FastMCP, Context } from '../../../src/server';
import { TextContent, ImageContent, Image, EmbeddedResource, BlobResourceContents } from '@mcp/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Buffer } from 'buffer'; // Explicit import often needed

// Configure logging (using console for simplicity)
const logger = console; // Replace with a proper logger if needed

// Create the FastMCP server
const app = new FastMCP({ name: "ImageToolServer", debug: true });

// Global variable to store the image path, defaults to image.png in the same dir
let imagePath = path.join(__dirname, "image.png");
const pdfPath = path.join(__dirname, "sample.pdf");

// Tool to return an image
app.tool<any, TextContent | ImageContent>({
    name: "get_image",
    description: "Returns the sample image with some descriptive text"
}, async (ctx: Context): Promise<Array<TextContent | ImageContent>> => {
    try {
        // Check if image exists before creating Image object
        await fs.access(imagePath);
        return [
            { type: "text", text: "Here's your image:" },
            new Image(imagePath).toImageContent(), // Assumes Image class handles path correctly
        ];
    } catch (e: any) {
        logger.error(`Error accessing or processing image '${imagePath}': ${e.message}`);
        return [{ type: "text", text: `Error processing image: ${e.message}` }];
    }
});

// Tool to return a PDF as an embedded resource
app.tool<any, TextContent | EmbeddedResource>({
    name: "get_pdf",
    description: "Returns 'sample.pdf' - use when the User requests a sample PDF file",
}, async (): Promise<Array<TextContent | EmbeddedResource>> => {
    try {
        // Read the PDF file as binary data
        const pdfData: Buffer = await fs.readFile(pdfPath);

        // Encode to base64
        const b64Data: string = pdfData.toString('base64');

        // Create embedded resource
        const resourceContents: BlobResourceContents = {
            uri: `file://${path.resolve(pdfPath)}`, // Use resolved absolute path for URI
            blob: b64Data,
            mimeType: "application/pdf",
        };

        return [
            { type: "text", text: "Here is the PDF" },
            {
                type: "resource",
                resource: resourceContents,
            },
        ];
    } catch (e: any) {
         logger.error(`Error accessing or processing PDF '${pdfPath}': ${e.message}`);
         // Differentiate file not found error
         if (e.code === 'ENOENT') {
             return [{ type: "text", text: `Error: PDF file '${path.basename(pdfPath)}' not found` }];
         }
        return [{ type: "text", text: `Error processing PDF: ${e.message}` }];
    }
});

// Main execution block
if (require.main === module) {
    // Get image path from command line argument or use default
    if (process.argv.length > 2) {
        const cliImagePath = process.argv[2];
        // Resolve relative to CWD if not absolute
        imagePath = path.resolve(process.cwd(), cliImagePath);
        logger.info(`Using image file specified via CLI: ${imagePath}`);
    } else {
        logger.info(`No image path provided via CLI, using default: ${imagePath}`);
    }

    // Check if the specified image exists (async check)
    fs.access(imagePath)
        .then(() => {
             logger.info(`Image file '${imagePath}' found. Starting server...`);
             // Run the server (assuming default is stdio or suitable for tests)
             app.run();
        })
        .catch((err) => {
            logger.warn(`!!!!!!!!! Image file '${imagePath}' not found !!!!!!!!!`);
            logger.warn("Tool 'get_image' might fail. Please add the image file or specify a valid path as the first argument.");
            logger.warn("Starting server anyway...");
             // Run the server even if image is missing, tests might handle this
             app.run();
        });
}

// Export for potential testing imports if needed
export { app };
