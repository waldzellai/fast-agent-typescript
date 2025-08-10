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
 * Recursively walk from a starting directory up to the filesystem root,
 * collecting configuration and secret files.  Files in deeper directories
 * override ones found higher in the tree.
 */
function loadConfigTree(startDir: string): Record<string, any> {
  const configNames = ['config.json', 'config.yaml', 'config.yml'];
  const secretNames = ['secrets.json', 'secrets.yaml', 'secrets.yml'];

  const dirs: string[] = [];
  let dir = startDir;
  while (true) {
    dirs.unshift(dir); // root first
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  let combined: Record<string, any> = {};
  for (const d of dirs) {
    for (const name of configNames) {
      const file = path.join(d, name);
      const contents = readFileIfExists(file);
      if (contents) {
        combined = { ...combined, ...contents };
        break; // only one config.* per directory
      }
    }
    for (const name of secretNames) {
      const file = path.join(d, name);
      const contents = readFileIfExists(file);
      if (contents) {
        combined = { ...combined, ...contents };
        break; // only one secrets.* per directory
      }
    }
  }
  return combined;
}

/**
 * Load Settings from a file if provided, otherwise fall back to environment
 * variables and sane defaults.
 */
export function loadSettings(configPath?: string): Settings {
  let fileSettings: Record<string, any> = {};

  // Determine starting directory and explicit file if provided
  let explicitFile: string | null = null;
  let startDir: string;
  if (configPath) {
    const resolved = path.resolve(configPath);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      explicitFile = resolved;
      startDir = path.dirname(resolved);
    } else {
      startDir = resolved;
    }
  } else {
    startDir = process.cwd();
  }

  fileSettings = loadConfigTree(startDir);
  if (explicitFile) {
    const contents = readFileIfExists(explicitFile);
    if (contents) {
      fileSettings = { ...fileSettings, ...contents };
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
