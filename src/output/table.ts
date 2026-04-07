import Table from "cli-table3";
import pc from "picocolors";
import type { Card, SetSummary, GameSummary, HistoryDay } from "@tcgpricelookup/sdk";
import { formatPrice, primaryPrice, truncate, println } from "./format.js";

const HEADER_STYLE = { head: ["cyan"], border: ["gray"] };

/** Render a list of cards as an aligned table. */
export function renderCards(cards: Card[], opts: { total?: number } = {}): void {
  if (cards.length === 0) {
    println(pc.dim("No cards found."));
    return;
  }
  const table = new Table({
    head: ["Name", "Set", "Game", "#", "Variant", "NM market"],
    style: HEADER_STYLE,
    colWidths: [28, 26, 12, 10, 12, 14],
    wordWrap: true,
  });
  for (const card of cards) {
    table.push([
      pc.bold(truncate(card.name, 26)),
      truncate(card.set?.name ?? "", 24),
      truncate(card.game?.name ?? "", 10),
      truncate(card.number ?? "", 8),
      truncate(card.variant ?? "", 10),
      formatPrice(primaryPrice(card)),
    ]);
  }
  println(table.toString());
  if (opts.total != null && opts.total > cards.length) {
    println(pc.dim(`Showing ${cards.length} of ${opts.total} matches.`));
  }
}

/** Render full detail for one card, including raw conditions and graded slabs. */
export function renderCardDetail(card: Card): void {
  println();
  println(`  ${pc.bold(card.name)}  ${pc.dim("(" + card.id + ")")}`);
  println(
    `  ${pc.dim("set:")}  ${card.set?.name ?? "?"} ${pc.dim("·")} ${pc.dim("game:")} ${
      card.game?.name ?? "?"
    } ${pc.dim("·")} ${pc.dim("#")}${card.number ?? "?"} ${pc.dim("·")} ${card.rarity ?? ""}`
  );
  if (card.image_url) {
    println(`  ${pc.dim("image:")} ${card.image_url}`);
  }
  println();

  // Raw prices table
  const conditions = Object.keys(card.prices.raw);
  if (conditions.length > 0) {
    println(pc.cyan("  Raw conditions"));
    const t = new Table({
      head: ["Condition", "Market", "Low", "Mid", "High", "eBay 7d"],
      style: HEADER_STYLE,
      colWidths: [20, 12, 12, 12, 12, 12],
    });
    for (const cond of conditions) {
      const block = card.prices.raw[cond as keyof typeof card.prices.raw];
      const tcg = block?.tcgplayer;
      const ebay = block?.ebay;
      t.push([
        cond.replace(/_/g, " "),
        formatPrice(tcg?.market),
        formatPrice(tcg?.low),
        formatPrice(tcg?.mid),
        formatPrice(tcg?.high),
        formatPrice(ebay?.avg_7d),
      ]);
    }
    println(t.toString());
  }

  // Graded prices table
  const graded = card.prices.graded;
  if (graded && Object.keys(graded).length > 0) {
    println();
    println(pc.cyan("  Graded slabs (eBay 7d averages)"));
    const t = new Table({
      head: ["Grader", "Grade", "Avg 1d", "Avg 7d", "Avg 30d"],
      style: HEADER_STYLE,
      colWidths: [10, 8, 12, 12, 12],
    });
    for (const grader of Object.keys(graded)) {
      const grades = graded[grader as keyof typeof graded] ?? {};
      for (const grade of Object.keys(grades).sort((a, b) => Number(b) - Number(a))) {
        const ebay = grades[grade]?.ebay;
        if (!ebay) continue;
        t.push([
          grader.toUpperCase(),
          grade,
          formatPrice(ebay.avg_1d),
          formatPrice(ebay.avg_7d),
          formatPrice(ebay.avg_30d),
        ]);
      }
    }
    println(t.toString());
  }
  println();
}

export function renderSets(sets: SetSummary[], opts: { total?: number } = {}): void {
  if (sets.length === 0) {
    println(pc.dim("No sets found."));
    return;
  }
  const table = new Table({
    head: ["Slug", "Name", "Game", "Cards", "Released"],
    style: HEADER_STYLE,
    colWidths: [32, 32, 12, 8, 14],
    wordWrap: true,
  });
  for (const s of sets) {
    table.push([
      pc.dim(truncate(s.slug, 30)),
      pc.bold(truncate(s.name, 30)),
      truncate(s.game, 10),
      String(s.count),
      s.released_at?.slice(0, 10) ?? pc.dim("—"),
    ]);
  }
  println(table.toString());
  if (opts.total != null && opts.total > sets.length) {
    println(pc.dim(`Showing ${sets.length} of ${opts.total} sets.`));
  }
}

export function renderGames(games: GameSummary[]): void {
  if (games.length === 0) {
    println(pc.dim("No games found."));
    return;
  }
  const table = new Table({
    head: ["Slug", "Name", "Cards"],
    style: HEADER_STYLE,
    colWidths: [16, 28, 12],
  });
  for (const g of games) {
    table.push([pc.dim(g.slug), pc.bold(g.name), g.count.toLocaleString("en-US")]);
  }
  println(table.toString());
}

/**
 * Render history as a list of days with a tiny ASCII sparkline.
 *
 * Different cards have different history coverage — vintage cards may
 * only have stored eBay graded-slab history, modern cards may have
 * TCGPlayer raw NM history, etc. We can't hardcode a series, so we
 * scan all rows across all days, pick the best-covered series, and
 * render that one. The series label tells the user what they're
 * looking at so they're never confused.
 */
export function renderHistory(days: HistoryDay[]): void {
  if (days.length === 0) {
    println(pc.dim("No history available for this card."));
    return;
  }

  const series = pickBestSeries(days);
  if (!series) {
    println(pc.dim("No history data points available for this card."));
    return;
  }

  const points = days.map((d) => ({
    date: d.date,
    value: extractValue(d, series.key),
  }));
  const numericValues = points.map((p) => p.value).filter((v): v is number => v != null);

  println();
  println(`  ${pc.dim("series:")} ${pc.cyan(series.label)}`);
  if (numericValues.length >= 2) {
    println("  " + sparkline(numericValues));
  }
  const table = new Table({
    head: ["Date", series.label],
    style: HEADER_STYLE,
    colWidths: [14, 24],
  });
  for (const p of points) {
    table.push([p.date, formatPrice(p.value)]);
  }
  println(table.toString());

  if (numericValues.length >= 2) {
    const first = numericValues[0]!;
    const last = numericValues[numericValues.length - 1]!;
    const delta = last - first;
    const pct = first > 0 ? ((delta / first) * 100).toFixed(1) : "?";
    const arrow = delta >= 0 ? pc.green(`▲ +${pct}%`) : pc.red(`▼ ${pct}%`);
    println(
      `  ${pc.dim("change:")} ${formatPrice(first)} → ${formatPrice(last)} ${arrow}`
    );
  }
  println();
}

interface SeriesKey {
  source: "tcgplayer" | "ebay";
  condition: string | null;
  grader: string | null;
  grade: string | null;
  // Which numeric field on the row holds the value we want to chart.
  field: "price_market" | "avg_7d";
}

interface SeriesPick {
  key: SeriesKey;
  label: string;
  /** Number of days with a non-null value for this series. */
  coverage: number;
}

/**
 * Score every distinct series in the history payload and pick the one
 * with the best coverage, breaking ties with a stable preference order
 * (raw TCGPlayer NM > raw TCGPlayer any > eBay graded > eBay raw).
 */
function pickBestSeries(days: HistoryDay[]): SeriesPick | null {
  const candidates = new Map<string, SeriesPick>();

  for (const day of days) {
    for (const row of day.prices) {
      const candidatesForRow: SeriesKey[] = [];
      if (row.source === "tcgplayer" && row.price_market != null) {
        candidatesForRow.push({
          source: "tcgplayer",
          condition: row.condition,
          grader: null,
          grade: null,
          field: "price_market",
        });
      }
      if (row.source === "ebay" && row.avg_7d != null) {
        candidatesForRow.push({
          source: "ebay",
          condition: row.condition,
          grader: row.grader,
          grade: row.grade,
          field: "avg_7d",
        });
      }
      for (const k of candidatesForRow) {
        const id = serializeKey(k);
        const label = labelForKey(k);
        const existing = candidates.get(id);
        if (existing) {
          existing.coverage += 1;
        } else {
          candidates.set(id, { key: k, label, coverage: 1 });
        }
      }
    }
  }

  if (candidates.size === 0) return null;

  const sorted = Array.from(candidates.values()).sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    return preferenceScore(a.key) - preferenceScore(b.key);
  });
  return sorted[0] ?? null;
}

function serializeKey(k: SeriesKey): string {
  return [k.source, k.condition ?? "_", k.grader ?? "_", k.grade ?? "_", k.field].join("|");
}

function labelForKey(k: SeriesKey): string {
  if (k.source === "tcgplayer") {
    const cond = (k.condition ?? "near_mint").replace(/_/g, " ");
    return `TCGPlayer ${cond} market`;
  }
  if (k.grader && k.grade) {
    return `eBay ${k.grader.toUpperCase()} ${k.grade} (7d avg)`;
  }
  const cond = (k.condition ?? "raw").replace(/_/g, " ");
  return `eBay ${cond} (7d avg)`;
}

/** Lower is better. */
function preferenceScore(k: SeriesKey): number {
  if (k.source === "tcgplayer" && k.condition === "near_mint") return 0;
  if (k.source === "tcgplayer") return 1;
  if (k.source === "ebay" && k.grader === "psa" && k.grade === "10") return 2;
  if (k.source === "ebay" && k.grader === "bgs" && k.grade === "10") return 3;
  if (k.source === "ebay" && k.grader) return 4;
  return 5;
}

function extractValue(day: HistoryDay, key: SeriesKey): number | null {
  for (const row of day.prices) {
    if (row.source !== key.source) continue;
    if ((row.condition ?? null) !== key.condition) continue;
    if ((row.grader ?? null) !== key.grader) continue;
    if ((row.grade ?? null) !== key.grade) continue;
    return row[key.field] ?? null;
  }
  return null;
}

/** Tiny ASCII sparkline using block-quadrant chars. */
export function sparkline(values: number[]): string {
  if (values.length === 0) return "";
  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v) => {
      const idx = Math.min(blocks.length - 1, Math.max(0, Math.round(((v - min) / span) * (blocks.length - 1))));
      return blocks[idx];
    })
    .join("");
}
