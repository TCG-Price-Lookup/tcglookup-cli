import { Command } from "commander";
import { buildClient } from "../client.js";
import { handleSdkError } from "../errors.js";
import { renderCardDetail } from "../output/table.js";
import { printJson } from "../output/format.js";

export function getCommand(): Command {
  return new Command("get")
    .description("Fetch one card by its UUID, including all conditions and graded values")
    .argument("<id>", "card UUID")
    .option("--json", "raw JSON output")
    .action(async (id: string, opts: { json?: boolean }) => {
      const client = await buildClient();
      try {
        const card = await client.cards.get(id);
        if (opts.json) {
          printJson(card);
          return;
        }
        renderCardDetail(card);
      } catch (err) {
        handleSdkError(err);
      }
    });
}
