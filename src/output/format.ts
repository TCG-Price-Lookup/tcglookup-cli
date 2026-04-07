import pc from "picocolors";

/**
 * Format a price as USD. null/undefined → dim "—".
 * Numbers below 1 get extra precision so $0.42 doesn't show as $0.
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return pc.dim("—");
  if (value < 1) return pc.green(`$${value.toFixed(2)}`);
  if (value < 10) return pc.green(`$${value.toFixed(2)}`);
  if (value < 1000) return pc.green(`$${value.toFixed(2)}`);
  return pc.green(`$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
}

/** Truncate a string to N visible chars and append … if cut. */
export function truncate(s: string | null | undefined, max: number): string {
  if (s == null) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/** Print to stdout, ensuring a trailing newline. */
export function println(line = ""): void {
  process.stdout.write(line + "\n");
}

/** Print JSON to stdout (used by --json mode). */
export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

/** Display label for a card's "primary" price (NM TCGPlayer market). */
export function primaryPrice(card: {
  prices: { raw: { near_mint?: { tcgplayer?: { market: number | null } } } };
}): number | null {
  return card.prices.raw.near_mint?.tcgplayer?.market ?? null;
}
