import { Command } from "commander";
import { authCommand } from "./commands/auth.js";
import { searchCommand } from "./commands/search.js";
import { getCommand } from "./commands/get.js";
import { historyCommand } from "./commands/history.js";
import { setsCommand } from "./commands/sets.js";
import { gamesCommand } from "./commands/games.js";
import { exitWith } from "./errors.js";

// Version is hardcoded here so we don't have to read package.json at runtime,
// which is awkward in ESM and adds a sync FS read on every CLI startup.
// Bumped manually in lockstep with package.json on each release.
const VERSION = "0.1.0";

async function main() {
  const program = new Command();

  program
    .name("tcglookup")
    .description(
      "Live trading card prices in your terminal — Pokemon, MTG, Yu-Gi-Oh!, One Piece, Lorcana, SWU, FAB, Pokemon JP.\n\nGet a free API key at https://tcgpricelookup.com/tcg-api"
    )
    .version(VERSION, "-v, --version", "print the CLI version")
    .helpOption("-h, --help", "show help");

  program.addCommand(authCommand());
  program.addCommand(searchCommand());
  program.addCommand(getCommand());
  program.addCommand(historyCommand());
  program.addCommand(setsCommand());
  program.addCommand(gamesCommand());

  // Show help when invoked with no args.
  if (process.argv.length <= 2) {
    program.help();
  }

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  if (err && typeof err === "object" && "message" in err) {
    exitWith(String((err as Error).message));
  }
  exitWith(String(err));
});
