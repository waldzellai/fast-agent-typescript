#!/usr/bin/env ts-node
import { execSync } from "child_process";
import { Command } from "commander";
import chalk from "chalk";

// Define the main function to handle linting
function main(
  fix: boolean = false,
  watch: boolean = false,
  path: string = "",
): void {
  try {
    let command = "eslint";
    if (fix) {
      command += " --fix";
    }

    if (watch) {
      command += " --watch";
    }

    if (path) {
      command += ` ${path}`;
    } else {
      command += " .";
    }

    // Execute eslint command and inherit stdio to show output in terminal
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
  .description("Lint code using ESLint")
  .option("--fix", "Automatically fix problems", false)
  .option("--watch", "Watch for changes and re-lint", false)
  .argument("[path]", "Path to the files or directory to lint", "")
  .action((path, options) => {
    main(options.fix, options.watch, path);
  });

// Parse command-line arguments
program.parse(process.argv);
