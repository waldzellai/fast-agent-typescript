#!/usr/bin/env ts-node
import { execSync } from "child_process";
import { Command } from "commander";
import chalk from "chalk";

// Define the main function to handle formatting
function main(path?: string): void {
  try {
    let command = "prettier --write";
    if (path) {
      command += ` ${path}`;
    } else {
      command += " .";
    }

    // Execute prettier command and inherit stdio to show output in terminal
    execSync(command, { stdio: "inherit" });
    process.exit(0);
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(error.status || 1);
  }
}

// Set up command-line interface using commander
const program = new Command();
program
  .version("1.0.0")
  .description("Format code using Prettier")
  .argument("[path]", "Path to the files or directory to format", "")
  .action((path) => {
    main(path);
  });

// Parse command-line arguments
program.parse(process.argv);
