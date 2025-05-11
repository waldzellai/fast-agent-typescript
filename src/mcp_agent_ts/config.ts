// Configuration settings for MCP Agent in TypeScript

// Reads configuration from JSON / YAML file and merges with environment vars.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export interface Settings {
  appName?: string;
  logLevel?: string;
  environment?: string;
  // Extend with other config keys as needed.
  [key: string]: any;
}

function readFileIfExists(filePath: string): Record<string, any> | null {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      return (yaml.load(data) as Record<string, any>) ?? {};
    }
    return JSON.parse(data);
  } catch (err) {
    return null; // ignore missing or parse errors; caller will handle defaults
  }
}

/**
 * Load Settings from a file if provided, otherwise fall back to environment
 * variables and sane defaults.
 */
export function loadSettings(configPath?: string): Settings {
  let fileSettings: Record<string, any> = {};
  if (configPath) {
    const resolved = path.resolve(configPath);
    const contents = readFileIfExists(resolved);
    if (contents) {
      fileSettings = contents;
    }
  }

  // Environment variables override file values.
  const envSettings: Record<string, any> = {
    appName: process.env.MCP_APP_NAME,
    logLevel: process.env.MCP_LOG_LEVEL,
    environment: process.env.NODE_ENV
  };

  // Merge: env > file > defaults
  const merged: Settings = {
    appName: 'mcp_application',
    logLevel: 'info',
    environment: 'development',
    ...fileSettings,
    ...envSettings
  };

  // Remove undefined keys
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

  return merged;
}
