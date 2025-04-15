import { Command } from "commander";
import { log } from "console";
import fs from "fs";
import path from "path";
import { dirname } from "path";

const __dirname = process.cwd();

/**
 * Sets up the quickstart command for the FastAgent CLI.
 * @param program - The Commander program instance.
 */
export function setupQuickstartCommand(program: Command): void {
  program
    .command("quickstart [appName]")
    .description("Create a new FastAgent application with an optional app name")
    .option(
      "-t, --template <template>",
      "Specify a template for the new app",
      "default",
    )
    .action((appName: string | undefined, options: { template: string }) => {
      log("Creating a new FastAgent application...");
      const template = options.template;
      const resolvedAppName = appName || "fastagent-app";
      createApp(resolvedAppName, template);
    });
}

/**
 * Sets up the bootstrap command for the FastAgent CLI.
 * @param program - The Commander program instance.
 */
export function setupBootstrapCommand(program: Command): void {
  program
    .command("bootstrap")
    .description("Bootstrap an existing directory as a FastAgent app")
    .action(() => {
      log("Bootstrapping current directory as a FastAgent application...");
      bootstrapApp();
    });
}

/**
 * Creates a new FastAgent application with the specified name and template.
 * @param appName - The name of the application.
 * @param template - The template to use for the application.
 */
function createApp(appName: string, template: string): void {
  const appPath = path.join(process.cwd(), appName);

  if (fs.existsSync(appPath)) {
    log(`Error: Directory ${appPath} already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(appPath, { recursive: true });
  log(`Created directory: ${appPath}`);

  // Copy template files (assuming templates are stored in a specific directory)
  const templatePath = path.join(__dirname, "..", "templates", template);
  if (fs.existsSync(templatePath)) {
    copyDirectory(templatePath, appPath);
    log(`Copied template files from ${templatePath} to ${appPath}`);
  } else {
    log(
      `Warning: Template ${template} not found at ${templatePath}. Using minimal setup.`,
    );
    createMinimalApp(appPath);
  }

  log(
    `New FastAgent application '${appName}' created successfully at ${appPath}.`,
  );
  log("Run `npm install` in the new directory to install dependencies.");
}

/**
 * Bootstraps the current directory as a FastAgent application.
 */
function bootstrapApp(): void {
  const currentPath = process.cwd();
  log(`Bootstrapping directory: ${currentPath}`);

  // Create a minimal configuration file or necessary files
  createMinimalApp(currentPath);
  log(`Bootstrapped current directory as a FastAgent application.`);
}

/**
 * Creates a minimal FastAgent application structure.
 * @param appPath - The path where the app should be created.
 */
function createMinimalApp(appPath: string): void {
  // Create a basic fastagent.config.yaml
  const configContent = `---
version: '1.0'
app:
  name: 'fastagent-app'
  description: 'A FastAgent application'
  version: '0.1.0'
`;
  fs.writeFileSync(path.join(appPath, "fastagent.config.yaml"), configContent);
  log(`Created fastagent.config.yaml at ${appPath}`);

  // Optionally create a basic main.ts or similar entry point if needed
  const mainContent = `console.log('Welcome to FastAgent!');`;
  fs.writeFileSync(path.join(appPath, "main.ts"), mainContent);
  log(`Created main.ts at ${appPath}`);
}

/**
 * Recursively copies a directory from source to destination.
 * @param src - The source directory path.
 * @param dest - The destination directory path.
 */
function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
