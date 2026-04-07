import { Command } from "commander";
import pc from "picocolors";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  configFileExists,
  configPath,
  deleteConfig,
  readConfig,
  resolveApiKey,
  writeConfig,
} from "../config.js";
import { println } from "../output/format.js";
import { exitWith } from "../errors.js";

export function authCommand(): Command {
  const cmd = new Command("auth").description("Manage your stored TCG Price Lookup API key");

  cmd
    .command("login")
    .description("Store an API key in ~/.config/tcglookup/config.json")
    .option("--key <key>", "API key (skips the interactive prompt)")
    .action(async (opts: { key?: string }) => {
      let key = opts.key?.trim();
      if (!key) {
        const rl = createInterface({ input: stdin, output: stdout });
        try {
          const answer = await rl.question(
            `Paste your TCG Price Lookup API key (get one at ${pc.cyan(
              "https://tcgpricelookup.com/tcg-api"
            )}):\n> `
          );
          key = answer.trim();
        } finally {
          rl.close();
        }
      }
      if (!key) {
        exitWith("No key provided.");
      }
      if (!key.startsWith("tcg_")) {
        println(pc.yellow("Warning: keys usually start with 'tcg_' — saving anyway."));
      }
      await writeConfig({ apiKey: key });
      println(pc.green("✓") + " Saved key to " + pc.dim(configPath()));
      println(pc.dim("  File mode 600 (only your user can read it)."));
    });

  cmd
    .command("status")
    .description("Show whether an API key is configured")
    .action(async () => {
      const envKey = process.env.TCG_API_KEY;
      const cfg = await readConfig();
      const exists = await configFileExists();

      if (envKey) {
        println(pc.green("✓") + " Using TCG_API_KEY from environment");
        println(`  ${pc.dim("suffix:")} …${envKey.slice(-6)}`);
      }
      if (exists && cfg.apiKey) {
        println(
          (envKey ? pc.dim : pc.green)("✓") +
            " Stored key at " +
            pc.dim(configPath())
        );
        println(`  ${pc.dim("suffix:")} …${cfg.apiKey.slice(-6)}`);
        if (envKey) {
          println(pc.dim("  (env var takes precedence over the stored key)"));
        }
      } else if (!envKey) {
        println(pc.red("✖") + " No API key configured.");
        println("");
        println(`  Run ${pc.cyan("tcglookup auth login")} to set one.`);
        println(`  Sign up free at ${pc.cyan("https://tcgpricelookup.com/tcg-api")}`);
        process.exitCode = 2;
      }
    });

  cmd
    .command("logout")
    .description("Delete the stored API key")
    .action(async () => {
      const removed = await deleteConfig();
      if (removed) {
        println(pc.green("✓") + " Removed " + pc.dim(configPath()));
      } else {
        println(pc.dim("No stored key to remove."));
      }
      if (process.env.TCG_API_KEY) {
        println(
          pc.yellow("Note:") +
            " TCG_API_KEY is still set in your environment — `unset TCG_API_KEY` to clear it."
        );
      }
    });

  // Default action when running just `tcglookup auth` — show status.
  cmd.action(async () => {
    const key = await resolveApiKey();
    if (key) {
      println(pc.green("✓") + " API key configured (suffix …" + key.slice(-6) + ")");
      println(pc.dim("  Run `tcglookup auth status` for more detail."));
    } else {
      println(pc.red("✖") + " No API key configured.");
      println(`  Run ${pc.cyan("tcglookup auth login")} to set one.`);
      process.exitCode = 2;
    }
  });

  return cmd;
}
