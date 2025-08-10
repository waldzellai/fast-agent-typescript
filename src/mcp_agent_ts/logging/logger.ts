// Logger functionality for MCP Agent in TypeScript

/**
 * Lightweight structured logger that emits JSON log lines.
 *
 * It supports optional progress and event logging which can be toggled via
 * environment variables:
 *   FAST_LOG_PROGRESS - when set to "1", progress logs are emitted
 *   FAST_LOG_EVENTS   - when set to "0", event logs are suppressed
 */

export interface Logger {
  debug(message: string, data?: Record<string, any>): void;
  info(message: string, data?: Record<string, any>): void;
  warn(message: string, data?: Record<string, any>): void;
  error(message: string, data?: Record<string, any>): void;
  progress?(message: string, data?: Record<string, any>): void;
  event?(name: string, data?: Record<string, any>): void;
}

const ENABLE_PROGRESS = process.env.FAST_LOG_PROGRESS === '1';
const ENABLE_EVENTS = process.env.FAST_LOG_EVENTS !== '0';

/**
 * Obtain a namespaced logger instance that outputs structured JSON.
 */
export function getLogger(name: string): Logger {
  const log = (
    level: string,
    message: string,
    data?: Record<string, any>
  ): void => {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      name,
      message,
      ...data,
    };
    // Emit as JSON for downstream processing
    console.log(JSON.stringify(payload));
  };

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    progress: ENABLE_PROGRESS
      ? (msg, data) => log('progress', msg, data)
      : () => {},
    event: ENABLE_EVENTS ? (name, data) => log('event', name, data) : () => {},
  } as Logger;
}
