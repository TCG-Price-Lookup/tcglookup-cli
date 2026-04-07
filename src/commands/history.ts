import { Command } from "commander";
import type { HistoryPeriod } from "@tcgpricelookup/sdk";
import { buildClient } from "../client.js";
import { handleSdkError, exitWith } from "../errors.js";
import { renderHistory } from "../output/table.js";
import { printJson } from "../output/format.js";

const VALID_PERIODS: HistoryPeriod[] = ["7d", "30d", "90d", "1y"];

export function historyCommand(): Command {
  return new Command("history")
    .description("Daily TCGPlayer market history for a card (Trader plan and above)")
    .argument("<id>", "card UUID")
    .option("-p, --period <period>", "7d | 30d | 90d | 1y", "30d")
    .option("--json", "raw JSON output")
    .action(async (id: string, opts: { period: string; json?: boolean }) => {
      if (!VALID_PERIODS.includes(opts.period as HistoryPeriod)) {
        exitWith(`--period must be one of: ${VALID_PERIODS.join(", ")} (got: ${opts.period})`);
      }
      const client = await buildClient();
      try {
        const res = await client.cards.history(id, { period: opts.period as HistoryPeriod });
        if (opts.json) {
          printJson(res);
          return;
        }
        renderHistory(res.data);
      } catch (err) {
        handleSdkError(err);
      }
    });
}
