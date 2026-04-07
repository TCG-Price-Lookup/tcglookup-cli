import { TcgLookupClient } from "@tcgpricelookup/sdk";
import { resolveApiKey } from "./config.js";
import { exitWith } from "./errors.js";

/**
 * Build a TcgLookupClient using the resolved API key. If no key is found
 * we print a friendly setup message and exit non-zero.
 */
export async function buildClient(): Promise<TcgLookupClient> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    exitWith(
      [
        "No API key configured.",
        "",
        "Sign up for a free key at https://tcgpricelookup.com/tcg-api,",
        "then run:",
        "",
        "  tcglookup auth login",
        "",
        "Or set TCG_API_KEY in your environment.",
      ].join("\n"),
      2
    );
  }
  return new TcgLookupClient({
    apiKey,
    // Modest retry-on-throttle for CLI ergonomics. Devs running ad-hoc
    // commands shouldn't see a hard 429 the first time they exceed burst.
    retry: { attempts: 3, baseDelayMs: 600 },
  });
}
