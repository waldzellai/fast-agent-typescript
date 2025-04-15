#!/usr/bin/env ts-node
import { Command } from "commander";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative, resolve, sep } from "path";
import * as treeify from "treeify";
import chalk from "chalk";

// Normalize path separators for pattern matching
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

// Parse .gitignore file and return list of patterns
function parseGitignore(path: string): string[] {
  const gitignorePath = join(path, ".gitignore");
  try {
    const content = readFileSync(gitignorePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

// Check if path matches a pattern
function patternMatch(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = pattern.trim();

  if (normalizedPattern.startsWith("**/")) {
    const basePattern = normalizedPattern.slice(3);
    return (
      normalizedPath.includes(basePattern) ||
      normalizedPath.match(new RegExp(basePattern.replace("*", ".*"))) !== null
    );
  } else if (
    normalizedPattern.startsWith("*") &&
    !normalizedPattern.startsWith("**/")
  ) {
    const basePattern = normalizedPattern.slice(1);
    return (
      normalizedPath.endsWith(basePattern) ||
      normalizedPath.includes("/" + basePattern)
    );
  }

  return (
    normalizedPath.match(new RegExp(normalizedPattern.replace("*", ".*"))) !==
    null
  );
}

// Check if path should be included based on patterns
function shouldInclude(
  path: string,
  isDir: boolean,
  includePatterns: string[],
): boolean {
  if (!includePatterns.length) return true;

  const normalizedPath = normalizePath(path);
  if (isDir) {
    return includePatterns.some((pattern) => {
      if (pattern.startsWith("**/")) return true;
      return patternMatch(normalizedPath + "/anyfile", pattern);
    });
  }

  return includePatterns.some((pattern) =>
    patternMatch(normalizedPath, pattern),
  );
}

// Check if path should be ignored based on patterns
function shouldIgnore(
  path: string,
  ignorePatterns: string[],
  gitignorePatterns: string[],
): boolean {
  const normalizedPath = normalizePath(path);
  return (
    ignorePatterns.some((pattern) => patternMatch(normalizedPath, pattern)) ||
    gitignorePatterns.some((pattern) => patternMatch(normalizedPath, pattern))
  );
}

// Create a tree structure for directory visualization
function createTreeStructure(
  path: string,
  includePatterns: string[],
  ignorePatterns: string[],
  gitignorePatterns: string[],
): any {
  const stats = statSync(path);
  const name = path.split(sep).pop() || path;
  const tree: any = {};

  if (stats.isDirectory()) {
    tree[name] = {};
    const items = readdirSync(path).sort();
    for (const item of items) {
      const fullPath = join(path, item);
      if (shouldIgnore(fullPath, ignorePatterns, gitignorePatterns)) continue;
      if (
        !shouldInclude(
          fullPath,
          statSync(fullPath).isDirectory(),
          includePatterns,
        )
      )
        continue;

      const subTree = createTreeStructure(
        fullPath,
        includePatterns,
        ignorePatterns,
        gitignorePatterns,
      );
      Object.assign(tree[name], subTree);
    }
  }

  return tree;
}

// Package project files into a single markdown file
function packageProject(
  projectPath: string,
  outputPath: string,
  includePatterns: string[],
  ignorePatterns: string[],
  gitignorePatterns: string[],
): void {
  const content: string[] = [];
  const projectName = projectPath.split(sep).pop() || projectPath;

  // Write header
  content.push(`# Project: ${projectName}\n`);

  // Write directory structure
  content.push("## Directory Structure\n");
  content.push("```\n");
  const tree = createTreeStructure(
    projectPath,
    includePatterns,
    ignorePatterns,
    gitignorePatterns,
  );
  content.push(treeify.asTree(tree, true));
  content.push("```\n");

  // Write file contents
  content.push("## File Contents\n");

  function writeFiles(currentPath: string): void {
    const items = readdirSync(currentPath).sort();
    for (const item of items) {
      const fullPath = join(currentPath, item);
      if (shouldIgnore(fullPath, ignorePatterns, gitignorePatterns)) continue;
      if (
        includePatterns.length &&
        !shouldInclude(
          fullPath,
          statSync(fullPath).isDirectory(),
          includePatterns,
        )
      )
        continue;

      const stats = statSync(fullPath);
      if (stats.isFile()) {
        try {
          const fileContent = readFileSync(fullPath, "utf-8");
          const relativePath = relative(projectPath, fullPath);
          content.push(`### ${relativePath}\n`);
          content.push("```");
          const ext = fullPath.split(".").pop();
          if (ext) content.push(ext);
          content.push(fileContent);
          content.push("```\n");
        } catch {
          const relativePath = relative(projectPath, fullPath);
          content.push(`### ${relativePath}\n`);
          content.push("```\nBinary file not included\n```\n");
        }
      } else if (stats.isDirectory()) {
        writeFiles(fullPath);
      }
    }
  }

  writeFiles(projectPath);
  writeFileSync(outputPath, content.join("\n"), "utf-8");
}

// Main function to handle command line arguments
function main(
  path: string = ".",
  output: string = "project_contents.md",
  include: string[] = [],
  ignore: string[] = [],
  skipGitignore: boolean = false,
): void {
  const projectPath = resolve(path);
  const outputPath = resolve(output);

  const gitignorePatterns = skipGitignore ? [] : parseGitignore(projectPath);
  const defaultIgnores = [
    "**/.git/**",
    "**/.idea/**",
    "**/.vscode/**",
    "**/.venv/**",
    "**/venv/**",
    "**/env/**",
    "**/.pytest_cache/**",
    "**/*.pyc",
    "**/.coverage",
    "**/htmlcov/**",
    "**/__pycache__/**",
    "**/.ruff_cache/**",
    "**/uv.lock",
  ];
  const combinedIgnores = [...ignore, ...defaultIgnores];

  try {
    packageProject(
      projectPath,
      outputPath,
      include,
      combinedIgnores,
      gitignorePatterns,
    );
    console.log(chalk.green(`Successfully packaged project to ${outputPath}`));
  } catch (error: any) {
    console.error(chalk.red(`Error packaging project: ${error.message}`));
    process.exit(1);
  }
}

// Set up command-line interface using commander
const program = new Command();
program
  .version("1.0.0")
  .description(
    "Package project files into a single markdown file with directory structure",
  )
  .argument("[path]", "Path to the project directory", ".")
  .option("-o, --output <path>", "Output file path", "project_contents.md")
  .option(
    "-i, --include <patterns...>",
    'Patterns to include (e.g. "*.ts")',
    [],
  )
  .option("-x, --ignore <patterns...>", "Patterns to ignore", [])
  .option("--skip-gitignore", "Skip reading .gitignore patterns", false)
  .action((path, options) => {
    main(
      path,
      options.output,
      options.include,
      options.ignore,
      options.skipGitignore,
    );
  });

// Parse command-line arguments
program.parse(process.argv);
