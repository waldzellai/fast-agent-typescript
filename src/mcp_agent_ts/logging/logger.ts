// Logger functionality for MCP Agent in TypeScript

// Lightweight logger wrapper using `consola` to provide consistent structured logs

import consola from 'consola';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Obtain a namespaced logger instance.
 * Internally uses `consola` but exposes a minimal interface so we can easily
 * swap the underlying implementation in the future without touching callers.
 */
export function getLogger(name: string): Logger {
  const logger = consola.withTag(name);
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger)
  } as Logger;
}
