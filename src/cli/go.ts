import { Command } from "commander";
import * as fs from "fs";
import axios from "axios";
import { FastAgent } from "../fastAgent";

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

async function loadInstruction(source: string): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const response = await axios.get(source);
    return response.data as string;
  }
  return fs.readFileSync(source, "utf8");
}

export function setupGoCommand(program: Command): void {
  program
    .command("go [message]")
    .description("Run a FastAgent interactive session")
    .option(
      "-i, --instruction <pathOrUrl>",
      "Instruction file or URL",
      collect,
      [] as string[],
    )
    .option("-m, --model <model>", "Override default model")
    .option(
      "--server <url>",
      "Connect to MCP server via URL",
      collect,
      [] as string[],
    )
    .option(
      "--stdio <command>",
      "Launch MCP server via stdio command",
      collect,
      [] as string[],
    )
    .action(async (message: string | undefined, options) => {
      const instructions: string[] = [];
      for (const item of options.instruction as string[]) {
        try {
          instructions.push(await loadInstruction(item));
        } catch (err) {
          console.error(`Failed to load instruction from ${item}:`, err);
        }
      }
      const instruction = instructions.join("\n\n");

      const fast = new FastAgent("fastagent");
      const fastAny: any = fast as any;

      // Ensure server config structure exists
      if (!fastAny.context.config) {
        fastAny.context.config = { mcp: { servers: {} } };
      } else {
        if (!fastAny.context.config.mcp) {
          fastAny.context.config.mcp = { servers: {} };
        } else if (!fastAny.context.config.mcp.servers) {
          fastAny.context.config.mcp.servers = {};
        }
      }

      const serverNames: string[] = [];
      for (const url of options.server as string[]) {
        const name = `url${serverNames.length + 1}`;
        fastAny.context.config.mcp.servers[name] = { url };
        serverNames.push(name);
      }
      for (const cmd of options.stdio as string[]) {
        const name = `stdio${serverNames.length + 1}`;
        const [command, ...args] = cmd.split(/\s+/);
        fastAny.context.config.mcp.servers[name] = { command, args };
        serverNames.push(name);
      }

      fast.agent(
        {
          instruction: instruction || undefined,
          model: options.model,
          servers: serverNames,
        },
        async (agent) => {
          const ctx: any = (agent as any).context;
          if (ctx && ctx.progress_reporter) {
            const original = ctx.progress_reporter;
            ctx.progress_reporter = async (progress: number, total?: number) => {
              if (original) await original(progress, total);
              if (total !== undefined) {
                console.log(`Progress: ${progress}/${total}`);
              } else {
                console.log(`Progress: ${progress}`);
              }
            };
          }

          if (message) {
            const response = await agent.send(message);
            console.log(response);
          } else {
            await (agent as any).interactive();
          }
        },
      );

      await fast.run({ model: options.model });
    });
}
