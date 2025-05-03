import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// Import Prompt class, PromptMessageMultipart type, and isPromptMessage type guard from prompt.ts
import { Prompt, PromptMessageMultipart as PromptMessageMultipartType, isPromptMessage } from '../../../../src/core/prompt'; 
// Import detailed types from mcpContent.ts
import {
    TextContent, ImageContent, EmbeddedResource,
    TextResourceContents, PromptMessage as MCPPromptMessageType, ReadResourceResult
} from '../../../../src/core/mcpContent'; // Using alias to avoid naming conflict

describe('Prompt Class Tests', () => {

    describe('Prompt.user', () => {
        it('should create a user message with simple text', () => {
            const message = Prompt.user("Hello, world!");
            // Check structure instead of instanceof
            expect(message.role).toBe('user');
            expect(Array.isArray(message.content)).toBe(true);
            expect(message.content).toHaveLength(1);
            expect(message.content[0].type).toBe('text'); // Check type property
            expect((message.content[0] as TextContent).text).toBe('Hello, world!');
        });

        it('should create a user message with multiple text items', () => {
            const message = Prompt.user("Hello,", "How are you?");
            expect(message.role).toBe('user');
            expect(Array.isArray(message.content)).toBe(true);
            expect(message.content).toHaveLength(2);
            expect(message.content[0].type).toBe('text');
            expect((message.content[0] as TextContent).text).toBe('Hello,');
            expect(message.content[1].type).toBe('text');
            expect((message.content[1] as TextContent).text).toBe('How are you?');
        });

        it('should create a user message from a PromptMessageMultipart, overriding role', () => {
            const multipart = Prompt.assistant("I'm a multipart message");
            const message = Prompt.user(multipart);
            expect(message.role).toBe('user'); // Role overridden
            expect(Array.isArray(message.content)).toBe(true);
            expect(message.content).toHaveLength(1);
            expect(message.content[0].type).toBe('text');
            expect((message.content[0] as TextContent).text).toBe("I'm a multipart message");
        });

         it('should handle direct TextContent input', () => {
            // Assuming TextContent is instantiable or we create a plain object
             const textContent: TextContent = { type: 'text', text: 'Direct text content' };
            const message = Prompt.user(textContent);
            expect(message.role).toBe('user');
            expect(message.content).toHaveLength(1);
            expect(message.content[0]).toEqual(textContent);
        });

        it('should handle mixed content including direct content types', () => {
            const textContent: TextContent = { type: 'text', text: 'Direct text content' };
            // Assuming ImageContent structure from mcpContent.ts for creation
            const imageContent: ImageContent = { type: 'image', data: 'ZmFrZSBpbWFnZSBkYXRh', mimeType: 'image/png' }; 
            const message = Prompt.user("Text followed by:", textContent, "And an image:", imageContent);
            expect(message.role).toBe('user');
            expect(message.content).toHaveLength(4);
            expect(message.content[0].type).toBe('text');
            expect((message.content[0] as TextContent).text).toBe('Text followed by:');
            expect(message.content[1]).toEqual(textContent); // Direct object comparison
            expect(message.content[2].type).toBe('text');
            expect((message.content[2] as TextContent).text).toBe('And an image:');
            expect(message.content[3].type).toBe('image'); // Check type property
            expect(message.content[3]).toEqual(expect.objectContaining(imageContent)); // Check structure
        });
    });

    describe('Prompt.assistant', () => {
        it('should create an assistant message with simple text', () => {
            const message = Prompt.assistant("I'm doing well, thanks!");
            expect(message.role).toBe('assistant');
            expect(Array.isArray(message.content)).toBe(true);
            expect(message.content).toHaveLength(1);
            expect(message.content[0].type).toBe('text');
            expect((message.content[0] as TextContent).text).toBe("I'm doing well, thanks!");
        });

        it('should handle direct ImageContent input', () => {
            const imageContent: ImageContent = { type: 'image', data: 'ZmFrZSBpbWFnZSBkYXRh', mimeType: 'image/png' };
            const message = Prompt.assistant(imageContent);
            expect(message.role).toBe('assistant');
            expect(message.content).toHaveLength(1);
            expect(message.content[0].type).toBe('image');
            expect(message.content[0]).toEqual(expect.objectContaining(imageContent));
        });
    });

    describe('Prompt.message', () => {
        it('should create a message with default user role', () => {
            const message = Prompt.message("Hello");
            expect(message.role).toBe('user');
            expect(Array.isArray(message.content)).toBe(true);
            expect(message.content[0].type).toBe('text');
        });

        it('should create a message with specified assistant role', () => {
            const message = Prompt.message("Hello", { role: 'assistant' });
            expect(message.role).toBe('assistant');
            expect(Array.isArray(message.content)).toBe(true);
            expect(message.content[0].type).toBe('text');
        });
    });

    describe('Prompt with File Paths and Resources', () => {
        let tempDir: string;
        let textPath: string;
        let imagePath: string;

        beforeAll(() => {
            // Create a temporary directory
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-test-'));
            textPath = path.join(tempDir, 'test.txt');
            imagePath = path.join(tempDir, 'test.png');

            fs.writeFileSync(textPath, 'Hello, world!', 'utf-8');
            fs.writeFileSync(imagePath, 'fake image data'); // Write binary data directly
        });

        afterAll(() => {
            // Clean up temporary files and directory
            if (fs.existsSync(textPath)) fs.unlinkSync(textPath);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
        });

        it('should handle text file path input', () => {
            const message = Prompt.user("Check this file:", textPath);
            expect(message.role).toBe('user');
            expect(message.content).toHaveLength(2);
            expect((message.content[0] as TextContent).text).toBe('Check this file:');
            // Check type and structure based on expected output from Prompt reading a text file
            const resourcePart = message.content[1]; 
            expect(resourcePart.type).toBe('resource'); // Check the type discriminator
            // Assuming Prompt creates a structure similar to mcpContent.EmbeddedResource internally
            // Access properties cautiously - adjust based on actual Prompt implementation if needed
            expect((resourcePart as any).resource).toBeDefined();
            expect((resourcePart as any).resource.text).toBe('Hello, world!');
            expect((resourcePart as any).resource.mimeType).toBe('text/plain'); 
        });

        it('should handle image file path input', () => {
            const message = Prompt.assistant("Here's the image:", imagePath);
            expect(message.role).toBe('assistant');
            expect(message.content).toHaveLength(2);
            expect((message.content[0] as TextContent).text).toBe("Here's the image:");
            // Check type and structure based on expected output from Prompt reading an image file
            const imagePart = message.content[1];
            expect(imagePart.type).toBe('image'); // Check the type discriminator
            // Assuming Prompt creates a structure similar to mcpContent.ImageContent
            // Access properties cautiously
            expect((imagePart as any).mimeType).toBe('image/png');
            const decoded = Buffer.from((imagePart as any).data, 'base64').toString('binary');
            expect(decoded).toBe('fake image data');
        });

         it('should handle TextResourceContents input', () => {
             // Assuming TextResourceContents needs to be created as an object matching the interface
             const textResource: TextResourceContents = {
                uri: 'file:///test/example.txt',
                text: 'Sample text',
                mimeType: 'text/plain'
            };
            const message = Prompt.user("Check this resource:", textResource);
            expect(message.role).toBe('user');
            expect(message.content).toHaveLength(2);
            expect(message.content[1].type).toBe('resource');
            // Verify the nested resource object matches the input
            expect((message.content[1] as any).resource).toEqual(textResource);
        });

        it('should handle EmbeddedResource input', () => {
             const textResource: TextResourceContents = {
                uri: 'file:///test/example.txt',
                text: 'Sample text',
                mimeType: 'text/plain'
            };
            // Create EmbeddedResource matching the interface from mcpContent.ts
            const embedded: EmbeddedResource = { type: 'resource', resource: textResource }; 
            const message = Prompt.user("Another resource:", embedded);
            expect(message.role).toBe('user');
            expect(message.content).toHaveLength(2);
            expect(message.content[1].type).toBe('resource');
             // Verify the nested resource object matches the input's resource
            expect((message.content[1] as any).resource).toEqual(embedded.resource);
        });

        it('should handle ReadResourceResult input', () => {
              const textResource: TextResourceContents = {
                    uri: 'file:///test/example.txt',
                    text: 'Sample text',
                    mimeType: 'text/plain'
                };
            const resourceResult: ReadResourceResult = { contents: [textResource] }; // Assuming structure
            const message = Prompt.user("Resource result:", resourceResult);
            expect(message.role).toBe('user');
            expect(message.content.length).toBeGreaterThan(1); // Text + resource(s)
            expect((message.content[0] as TextContent).text).toBe('Resource result:');
            expect(message.content[1].type).toBe('resource');
            // Verify the nested resource object matches the one from the input result
            expect((message.content[1] as any).resource).toEqual(textResource);
        });

    });

    describe('Prompt.conversation', () => {
        it('should create a conversation from PromptMessageMultipart objects', () => {
            const userMsg = Prompt.user("Hello");
            const assistantMsg = Prompt.assistant("Hi there!");

            // Let TS infer the type from Prompt.conversation (uses prompt.ts definitions)
            const conversation = Prompt.conversation(userMsg, assistantMsg);

            expect(conversation).toHaveLength(2);
            // Check structure based on PromptMessage from prompt.ts
            expect(isPromptMessage(conversation[0])).toBe(true);
            expect(conversation[0].role).toBe('user');
            expect(Array.isArray(conversation[0].content)).toBe(true); // Content should be array
            // Assuming the conversion logic in Prompt.conversation puts the text in the first part
            expect((conversation[0].content as TextContent[])[0].type).toBe('text'); 
            expect((conversation[0].content as TextContent[])[0].text).toBe('Hello');

            expect(isPromptMessage(conversation[1])).toBe(true);
            expect(conversation[1].role).toBe('assistant');
            expect(Array.isArray(conversation[1].content)).toBe(true);
            expect((conversation[1].content as TextContent[])[0].type).toBe('text'); 
            expect((conversation[1].content as TextContent[])[0].text).toBe('Hi there!');
        });

         // Add test for mixed inputs if Prompt.conversation supports it in TS
        // it('should handle mixed inputs including plain objects', () => {
        //     const userMsg = Prompt.user("Hello");
        //     const assistantDict = { role: 'assistant', content: [new TextContent({ type: 'text', text: 'Direct dict!' })] };
        //     const anotherUserMsg = Prompt.user("Another message");
        //
        //     const conversation = Prompt.conversation(userMsg, assistantDict, anotherUserMsg);
        //     expect(conversation).toHaveLength(3);
        //     expect(conversation[1].role).toBe('assistant');
        //     expect((conversation[1].content[0] as TextContent).text).toBe('Direct dict!');
        // });
    });
});
