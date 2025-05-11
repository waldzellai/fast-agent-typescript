// Human Input Handler functionality for MCP Agent in TypeScript

// Provides an async console‐based input mechanism and the ability to swap in a
// custom handler at runtime.

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { HumanInputCallback } from '../app';

/**
 * The active callback used to retrieve human input.  Defaults to a readline
 * implementation that prints the prompt and resolves the user’s response.
 */
let activeCallback: HumanInputCallback = async (prompt: string) => {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(prompt);
  rl.close();
  return answer;
};

/**
 * Obtain input from the current human–input callback.
 */
export async function consoleInputCallback(prompt: string): Promise<string> {
  return activeCallback(prompt);
}

/**
 * Replace the human–input callback with a custom implementation.
 */
export function setHumanInputCallback(callback: HumanInputCallback): void {
  activeCallback = callback;
}
