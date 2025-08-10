import { Command } from "commander";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { z } from "zod";

// Schema definitions for configuration and secrets files
const ConfigSchema = z.object({
  default_model: z.string().optional(),
  logger: z
    .object({
      progress_display: z.boolean().optional(),
      show_chat: z.boolean().optional(),
      show_tools: z.boolean().optional(),
      truncate_tools: z.boolean().optional(),
    })
    .optional(),
  mcp: z
    .object({
      servers: z.record(
        z.object({
          command: z.string(),
          args: z.array(z.string()).optional(),
          env: z.record(z.string()).optional(),
        }),
      ),
    })
    .optional(),
});

const SecretsSchema = z.object({
  openai: z.object({ api_key: z.string().optional() }).optional(),
  anthropic: z.object({ api_key: z.string().optional() }).optional(),
  deepseek: z.object({ api_key: z.string().optional() }).optional(),
  openrouter: z.object({ api_key: z.string().optional() }).optional(),
  mcp: z
    .object({
      servers: z.record(
        z.object({ env: z.record(z.string()).optional() }),
      ),
    })
    .optional(),
});

function loadYaml(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  return yaml.load(content);
}

function checkApiKey(
  provider: string,
  secrets: Record<string, any> | undefined,
): string {
  const envVar = `${provider.toUpperCase()}_API_KEY`;
  const key = secrets?.[provider]?.api_key || process.env[envVar];
  return key ? "Found" : "Missing";
}

export const checkConfigCommand = new Command()
  .name("check-config")
  .description("Validate FastAgent configuration and secrets files")
  .option(
    "-c, --config-dir <directory>",
    "Directory containing configuration files",
    ".",
  )
  .action((options) => {
    const configDir = path.resolve(options.configDir);
    const configPath = path.join(configDir, "fastagent.config.yaml");
    const secretsPath = path.join(configDir, "fastagent.secrets.yaml");

    let configData: any | undefined;
    let secretsData: any | undefined;
    let ok = true;

    if (fs.existsSync(configPath)) {
      try {
        const parsed = ConfigSchema.safeParse(loadYaml(configPath));
        if (parsed.success) {
          configData = parsed.data;
          console.log("fastagent.config.yaml is valid.");
        } else {
          console.error("fastagent.config.yaml is invalid:");
          console.error(parsed.error.toString());
          ok = false;
        }
      } catch (err) {
        console.error(
          `Failed to read fastagent.config.yaml: ${(err as Error).message}`,
        );
        ok = false;
      }
    } else {
      console.error("fastagent.config.yaml not found.");
      ok = false;
    }

    if (fs.existsSync(secretsPath)) {
      try {
        const parsed = SecretsSchema.safeParse(loadYaml(secretsPath));
        if (parsed.success) {
          secretsData = parsed.data;
          console.log("fastagent.secrets.yaml is valid.");
        } else {
          console.error("fastagent.secrets.yaml is invalid:");
          console.error(parsed.error.toString());
          ok = false;
        }
      } catch (err) {
        console.error(
          `Failed to read fastagent.secrets.yaml: ${(err as Error).message}`,
        );
        ok = false;
      }
    } else {
      console.warn("fastagent.secrets.yaml not found.");
    }

    const servers = configData?.mcp?.servers || {};
    const serverNames = Object.keys(servers);
    if (serverNames.length > 0) {
      console.log("\nMCP Servers:");
      for (const name of serverNames) {
        const srv = servers[name];
        const cmd = [srv.command, ...(srv.args || [])].join(" ");
        console.log(`- ${name}: ${cmd}`);
      }
    } else {
      console.log("\nNo MCP servers configured.");
    }

    const providers = ["openai", "anthropic", "deepseek", "openrouter"];
    console.log("\nProvider API Keys:");
    for (const provider of providers) {
      const status = checkApiKey(provider, secretsData);
      console.log(`- ${provider}: ${status}`);
    }

    if (!ok) {
      process.exitCode = 1;
    }
  });

