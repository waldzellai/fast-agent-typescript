import path from 'path';
import fs from 'fs';
import { FastAgent } from '../../src/fastAgent';

/**
 * TypeScript equivalent of the Python conftest.py file
 * Provides helper functions for test setup
 */

// Reset any global state between tests
// This is equivalent to the cleanup_event_bus fixture in Python
export function resetGlobalState(): void {
  // Reset any global state here
  // For example, if there's an event bus that needs to be reset:
  // AsyncEventBus.reset();
  
  // Currently this is a placeholder - add actual reset logic as needed
}

// Get the project root directory
// This is equivalent to the project_root fixture in Python
export function getProjectRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

// Create a FastAgent instance for testing
// This is equivalent to the fast_agent fixture in Python
export function createTestFastAgent(testFilePath: string): FastAgent {
  // Get the directory where the test file is located
  const testDir = path.dirname(testFilePath);
  
  // Save original directory
  const originalCwd = process.cwd();
  
  // Change to the test file's directory
  process.chdir(testDir);
  
  // Create config file path in the test directory
  const configFile = path.join(testDir, 'fastagent.config.yaml');
  
  // Create agent with local config
  const agent = new FastAgent('Test Agent');
  
  // If config file exists, load it
  if (fs.existsSync(configFile)) {
    // In TypeScript, we might need to manually load the config
    // This depends on how FastAgent is implemented in TypeScript
    // agent.loadConfig(configFile);
  }
  
  // Setup cleanup function to restore original directory
  afterEach(() => {
    process.chdir(originalCwd);
  });
  
  return agent;
}

// Helper function to create a mock LLM object with send method
export function createMockLlm() {
  return { send: jest.fn() };
}

// Helper function to load prompt multipart from a file
// This is similar to the loadPromptMultipart function in router.test.ts
export function loadPromptMultipart(filePath: string) {
  const fullPath = path.resolve(filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  
  // This implementation depends on the specific format of prompt files
  // and how PromptMessageMultipart is defined in the TypeScript codebase
  // For now, this is a simplified version
  
  const parts = fileContent.split(/\n---(USER|ASSISTANT)\n/);
  const messages = [];
  
  // Import the Prompt class from the TypeScript codebase
  const { Prompt } = require('../../src/core/prompt');
  
  const startIndex = parts[0] === '' ? 1 : 0;
  for (let i = startIndex; i < parts.length; i += 2) {
    const roleStr = parts[i];
    const content = parts[i + 1]?.trim();
    if (roleStr === 'USER' && content) {
      messages.push(Prompt.user(content));
    } else if (roleStr === 'ASSISTANT' && content) {
      messages.push(Prompt.assistant(content));
    }
  }
  
  if (messages.length === 0 && fileContent.trim().length > 0) {
    messages.push(Prompt.user(fileContent.trim()));
  }
  
  return messages;
}

// Constants
export const FIXED_RESPONSE_INDICATOR = '[FIXED_RESPONSE]';
