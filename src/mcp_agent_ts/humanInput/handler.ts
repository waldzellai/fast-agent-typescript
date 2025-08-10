// Human Input Handler functionality for MCP Agent in TypeScript

// Provides an async console‐based input mechanism and the ability to swap in a
// custom handler at runtime.

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  FormResponse,
  HumanInputCallback,
  HumanInputRequest,
  HumanInputResponse,
} from './types';

/**
 * The active callback used to retrieve human input. Defaults to a readline
 * implementation that prints prompts and resolves the user’s responses.
 */
let activeCallback: HumanInputCallback = async (
  prompt: HumanInputRequest
): Promise<HumanInputResponse> => {
  if (typeof prompt === 'string') {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(prompt);
    rl.close();
    return answer;
  }

  const responses: FormResponse = {};
  for (const field of prompt.fields) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(`${field.label}: `);
    rl.close();
    responses[field.name] = answer;
  }
  return responses;
};

/**
 * Obtain input from the current human–input callback.
 */
export async function consoleInputCallback(
  prompt: HumanInputRequest
): Promise<HumanInputResponse> {
  return activeCallback(prompt);
}

/**
 * Replace the human–input callback with a custom implementation.
 */
export function setHumanInputCallback(callback: HumanInputCallback): void {
  activeCallback = callback;
}
