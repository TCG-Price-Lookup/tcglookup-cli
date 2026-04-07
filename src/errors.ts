import pc from "picocolors";
import {
  TcgLookupError,
  AuthenticationError,
  PlanAccessError,
  NotFoundError,
  RateLimitError,
} from "@tcgpricelookup/sdk";

/**
 * Print a friendly message and exit with the given code.
 * Used for argument errors, missing config, etc. — non-API failures.
 */
export function exitWith(message: string, code = 1): never {
  process.stderr.write(pc.red("✖ ") + message + "\n");
  process.exit(code);
}

/**
 * Render a TcgLookupError into a CLI-friendly message and exit.
 * Each subclass gets a tailored message + suggested next step.
 */
export function handleSdkError(err: unknown): never {
  if (err instanceof AuthenticationError) {
    exitWith(
      [
        "Invalid or missing API key.",
        "",
        "Run `tcglookup auth login` to set a key, or update TCG_API_KEY.",
        "Get a free key at https://tcgpricelookup.com/tcg-api",
      ].join("\n"),
      3
    );
  }
  if (err instanceof PlanAccessError) {
    exitWith(
      [
        "Your plan does not include this resource.",
        "",
        err.message,
        "",
        "Upgrade at https://tcgpricelookup.com/pricing",
      ].join("\n"),
      4
    );
  }
  if (err instanceof NotFoundError) {
    exitWith(err.message || "Not found.", 5);
  }
  if (err instanceof RateLimitError) {
    exitWith(
      [
        "Rate limit exceeded.",
        "",
        err.message,
        "Wait a moment and try again, or upgrade your plan for higher limits.",
      ].join("\n"),
      6
    );
  }
  if (err instanceof TcgLookupError) {
    exitWith(`API error (HTTP ${err.status}): ${err.message}`, 7);
  }
  if (err instanceof Error) {
    exitWith(err.message, 1);
  }
  exitWith(String(err), 1);
}
