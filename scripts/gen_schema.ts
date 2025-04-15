#!/usr/bin/env ts-node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, relative, dirname } from "path";
import { Command } from "commander";
import chalk from "chalk";

// Define the main function to generate schema
function generateSchema(configPath: string, outputPath: string): void {
  try {
    // Check if config file exists
    if (!existsSync(configPath)) {
      console.error(chalk.red(`Error: File not found: ${configPath}`));
      process.exit(1);
    }

    // Read the content of the config file
    const content = readFileSync(configPath, "utf-8");
    console.log(chalk.blue(`Reading config file: ${configPath}`));

    // Extract model information from comments or type definitions
    const modelInfo = extractModelInfo(content);
    console.log(chalk.blue("Extracted model information:"));

    // Log extracted models for debugging
    Object.entries(modelInfo).forEach(([model, fields]) => {
      console.log(chalk.bold(`\n${model}:`), fields["__doc__"] || "");
      Object.entries(fields).forEach(([field, desc]) => {
        if (field !== "__doc__") {
          console.log(`  ${field}: ${desc}`);
        }
      });
    });

    // Create a basic schema structure (mocking Pydantic behavior)
    const schema = buildMockSchema(modelInfo);

    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });

    // Write the schema to the output file
    writeFileSync(outputPath, JSON.stringify(schema, null, 2), "utf-8");
    console.log(chalk.green(`✓ Schema written to: ${outputPath}`));

    // Suggest VS Code integration settings
    suggestVSCodeSettings(outputPath);
  } catch (error: any) {
    console.error(chalk.red(`Error generating schema: ${error.message}`));
    process.exit(1);
  }
}

// Extract model and field descriptions from comments in the code
function extractModelInfo(
  content: string,
): Record<string, Record<string, string>> {
  const models: Record<string, Record<string, string>> = {};
  let currentModel: string | null = null;
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for interface or type definition (common in TypeScript)
    const classMatch = line.match(/^(?:export\s+)?(?:interface|type)\s+(\w+)/);
    if (classMatch) {
      currentModel = classMatch[1];
      models[currentModel] = { __doc__: "" };

      // Look for docstring or comment above or below
      if (i > 0 && lines[i - 1].trim().startsWith("//")) {
        models[currentModel]["__doc__"] = lines[i - 1]
          .trim()
          .replace("//", "")
          .trim();
      } else if (i + 1 < lines.length && lines[i + 1].trim().startsWith("//")) {
        models[currentModel]["__doc__"] = lines[i + 1]
          .trim()
          .replace("//", "")
          .trim();
      }
      continue;
    }

    // If inside a model definition, look for field definitions
    if (currentModel) {
      // Check if we've exited the type/interface block
      if (line === "}" || line === "};") {
        currentModel = null;
        continue;
      }

      // Look for field definitions with type annotations
      const fieldMatch = line.match(/^(\w+)\s*:\s*[^;]+/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        let description = "";

        // Look for inline comment or comment above
        if (line.includes("//")) {
          description = line.split("//")[1].trim();
        } else if (i > 0 && lines[i - 1].trim().startsWith("//")) {
          description = lines[i - 1].trim().replace("//", "").trim();
        }

        if (description) {
          models[currentModel][fieldName] = description;
        }
      }
    }
  }

  return models;
}

// Build a mock JSON schema based on extracted model info
function buildMockSchema(
  modelInfo: Record<string, Record<string, string>>,
): any {
  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "MCP Agent Configuration Schema",
    description: "Configuration schema for MCP Agent applications",
    type: "object",
    properties: {},
    $defs: {},
  };

  // Add root properties if 'Settings' exists in modelInfo
  if (modelInfo["Settings"]) {
    schema["properties"] = createPropertiesFromModel(modelInfo["Settings"]);
  }

  // Add nested models to $defs
  Object.entries(modelInfo).forEach(([modelName, fields]) => {
    if (modelName !== "Settings") {
      schema["$defs"][modelName] = {
        type: "object",
        description: fields["__doc__"] || "",
        properties: createPropertiesFromModel(fields),
      };
    }
  });

  return schema;
}

// Create schema properties from model fields
function createPropertiesFromModel(fields: Record<string, string>): any {
  const properties: Record<string, any> = {};
  Object.entries(fields).forEach(([field, description]) => {
    if (field !== "__doc__") {
      properties[field] = {
        type: "string", // Simplified type for schema
        description: description,
      };
    }
  });
  return properties;
}

// Suggest VS Code settings for YAML schema integration
function suggestVSCodeSettings(outputPath: string): void {
  // Get relative path for VS Code settings
  const relPath = `./${relative(process.cwd(), outputPath)}`;
  const vscodeSettings = {
    "yaml.schemas": {
      [relPath]: [
        "mcp-agent.config.yaml",
        "mcp_agent.config.yaml",
        "mcp-agent.secrets.yaml",
        "mcp_agent.secrets.yaml",
      ],
    },
  };

  console.log(chalk.yellow("\nVS Code Integration:"));
  console.log("Add this to .vscode/settings.json:");
  console.log(JSON.stringify(vscodeSettings, null, 2));
}

// Set up command-line interface using commander
const program = new Command();
program
  .version("1.0.0")
  .description("Generate JSON schema from TypeScript configuration models")
  .option(
    "-c, --config <path>",
    "Path to the config.ts file",
    join("src", "mcpAgent.ts"),
  )
  .option(
    "-o, --output <path>",
    "Output path for the schema file",
    join("schema", "mcp-agent.config.schema.json"),
  )
  .action((options) => {
    generateSchema(options.config, options.output);
  });

// Parse command-line arguments
program.parse(process.argv);
