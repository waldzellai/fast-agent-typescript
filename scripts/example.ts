#!/usr/bin/env node

/**
 * Run a specific example from the MCP Agent examples/ directory.
 */

import { Command } from "commander";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

const program = new Command();
program.name("example").description("Manage MCP Agent examples");

// Function to get the root directory of the project
function getProjectRoot(): string {
  return path.resolve(__dirname, "..");
}

// Function to get the examples directory path
function getExamplesDir(): string {
  return path.join(getProjectRoot(), "examples");
}

// Function to check if a directory exists
function directoryExists(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// Function to read the first line of a README.md file for description
function getDescriptionFromReadme(exampleDir: string): string {
  const readmePath = path.join(exampleDir, "README.md");
  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, "utf-8");
    const firstLine = content.split("\n")[0].trim();
    return firstLine.replace(/^#+\s*/, "");
  }
  return "";
}

// Command to list all available examples
program
  .command("list")
  .description("List all available examples")
  .action(() => {
    const examplesDir = getExamplesDir();
    if (!directoryExists(examplesDir)) {
      console.error(chalk.red("No examples directory found"));
      process.exit(1);
    }

    const examples = fs
      .readdirSync(examplesDir)
      .filter(
        (dir) =>
          directoryExists(path.join(examplesDir, dir)) && !dir.startsWith("."),
      );

    if (examples.length === 0) {
      console.log(chalk.blue("No examples found"));
      return;
    }

    console.log(chalk.bold("\nAvailable examples:"));
    examples.forEach((example) => {
      const description = getDescriptionFromReadme(
        path.join(examplesDir, example),
      );
      console.log(`• ${chalk.cyan(example)} - ${description}`);
    });
  });

// Command to run a specific example
program
  .command("run <exampleName>")
  .description("Run a specific example")
  .option("-l, --local", "Use local version of mcp-agent", true)
  .option("-v, --version <version>", "Specific version to install from npm")
  .option("-c, --clean", "Clean node_modules before running", false)
  .option("-d, --debug", "Print debug information", false)
  .action((exampleName, options) => {
    const examplesDir = getExamplesDir();
    const exampleDir = path.resolve(examplesDir, exampleName);
    const projectRoot = getProjectRoot();

    if (!directoryExists(exampleDir)) {
      console.error(chalk.red(`Example '${exampleName}' not found`));
      process.exit(1);
    }

    // Clean node_modules if requested
    if (options.clean) {
      const nodeModulesPath = path.join(exampleDir, "node_modules");
      if (directoryExists(nodeModulesPath)) {
        console.log(chalk.blue(`Removing node_modules in ${nodeModulesPath}`));
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
    }

    // Install dependencies
    console.log(chalk.blue("Installing dependencies..."));
    try {
      // If using local, link the local package (assuming it's built)
      if (options.local) {
        const localPackageJson = path.join(projectRoot, "package.json");
        if (fs.existsSync(localPackageJson)) {
          const packageData = JSON.parse(
            fs.readFileSync(localPackageJson, "utf-8"),
          );
          const packageName = packageData.name || "mcp-agent";
          const localPackagePath = projectRoot;
          execSync(`npm install ${localPackagePath} --no-save`, {
            cwd: exampleDir,
            stdio: options.debug ? "inherit" : "pipe",
          });
          console.log(chalk.green("Linked local mcp-agent package"));
        } else {
          console.log(
            chalk.yellow(
              "Local package.json not found, falling back to npm install",
            ),
          );
          execSync("npm install", {
            cwd: exampleDir,
            stdio: options.debug ? "inherit" : "pipe",
          });
        }
      } else {
        // Install specific version from npm if provided
        const versionStr = options.version ? `@${options.version}` : "";
        execSync(`npm install mcp-agent${versionStr}`, {
          cwd: exampleDir,
          stdio: options.debug ? "inherit" : "pipe",
        });
      }
    } catch (error) {
      console.error(
        chalk.red(`Error installing dependencies: ${error.message}`),
      );
      process.exit(1);
    }

    if (options.debug) {
      console.log(
        chalk.blue(
          `Node modules installed in: ${path.join(exampleDir, "node_modules")}`,
        ),
      );
    }

    // Run the example
    console.log(chalk.bold.green(`\nRunning ${exampleName}\n`));
    try {
      execSync("node main.js", { cwd: exampleDir, stdio: "inherit" });
    } catch (error) {
      console.error(chalk.red(`Error running example: ${error.message}`));
      process.exit(1);
    }
  });

// Command to clean node_modules from examples
program
  .command("clean [exampleName]")
  .description("Clean up node_modules from examples")
  .action((exampleName) => {
    const examplesDir = getExamplesDir();
    let dirs: string[] = [];

    if (exampleName) {
      dirs = [path.join(examplesDir, exampleName)];
    } else {
      dirs = fs
        .readdirSync(examplesDir)
        .filter(
          (dir) =>
            directoryExists(path.join(examplesDir, dir)) &&
            !dir.startsWith("."),
        )
        .map((dir) => path.join(examplesDir, dir));
    }

    dirs.forEach((dir) => {
      const nodeModulesPath = path.join(dir, "node_modules");
      if (directoryExists(nodeModulesPath)) {
        console.log(chalk.blue(`Removing node_modules in ${nodeModulesPath}`));
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
    });
  });

// Parse command line arguments
program.parse(process.argv);
