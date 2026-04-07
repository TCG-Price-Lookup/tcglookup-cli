import { Command } from "commander";
import type { GameSlug } from "@tcgpricelookup/sdk";
import { buildClient } from "../client.js";
import { handleSdkError } from "../errors.js";
import { renderCards } from "../output/table.js";
import { printJson } from "../output/format.js";
import { parseLimit, parseOffset } from "./shared.js";

export function searchCommand(): Command {
  return new Command("search")
    .description("Search cards by name, set, game, or IDs")
    .argument("[query...]", "free-text search query (joined with spaces)")
    .option("-g, --game <slug>", "filter by game slug (e.g. pokemon, mtg)")
    .option("-s, --set <slug>", "filter by set slug (e.g. obsidian-flames)")
    .option("-i, --ids <ids>", "comma-separated card IDs (auto-chunked at 20)")
    .option("-l, --limit <n>", "max results", "20")
    .option("-o, --offset <n>", "pagination offset", "0")
    .option("--json", "raw JSON output")
    .action(async (queryParts: string[], opts) => {
      const client = await buildClient();
      const q = queryParts.length > 0 ? queryParts.join(" ") : undefined;
      const limit = parseLimit(opts.limit, 100);
      const offset = parseOffset(opts.offset);
      const ids =
        typeof opts.ids === "string"
          ? opts.ids
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : undefined;

      try {
        const res = await client.cards.search({
          q,
          ids,
          game: opts.game as GameSlug | undefined,
          set: opts.set,
          limit,
          offset,
        });
        if (opts.json) {
          printJson(res);
          return;
        }
        renderCards(res.data, { total: res.total });
      } catch (err) {
        handleSdkError(err);
      }
    });
}
