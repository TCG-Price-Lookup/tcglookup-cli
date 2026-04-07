import { Command } from "commander";
import { buildClient } from "../client.js";
import { handleSdkError } from "../errors.js";
import { renderGames } from "../output/table.js";
import { printJson } from "../output/format.js";

export function gamesCommand(): Command {
  return new Command("games")
    .description("List every supported trading card game")
    .option("--json", "raw JSON output")
    .action(async (opts: { json?: boolean }) => {
      const client = await buildClient();
      try {
        const res = await client.games.list();
        if (opts.json) {
          printJson(res);
          return;
        }
        renderGames(res.data);
      } catch (err) {
        handleSdkError(err);
      }
    });
}
