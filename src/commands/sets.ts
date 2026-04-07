import { Command } from "commander";
import type { GameSlug } from "@tcgpricelookup/sdk";
import { buildClient } from "../client.js";
import { handleSdkError } from "../errors.js";
import { renderSets } from "../output/table.js";
import { printJson } from "../output/format.js";
import { parseLimit, parseOffset } from "./shared.js";

export function setsCommand(): Command {
  return new Command("sets")
    .description("List sets across all games, or filter by game")
    .argument("[game]", "optional game slug (e.g. pokemon, mtg)")
    .option("-l, --limit <n>", "max results", "50")
    .option("-o, --offset <n>", "pagination offset", "0")
    .option("--json", "raw JSON output")
    .action(async (game: string | undefined, opts) => {
      const client = await buildClient();
      const limit = parseLimit(opts.limit, 200);
      const offset = parseOffset(opts.offset);
      try {
        const res = await client.sets.list({
          game: game as GameSlug | undefined,
          limit,
          offset,
        });
        if (opts.json) {
          printJson(res);
          return;
        }
        renderSets(res.data, { total: res.total });
      } catch (err) {
        handleSdkError(err);
      }
    });
}
