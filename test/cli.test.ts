import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configDir, configPath, readConfig, writeConfig, deleteConfig, resolveApiKey, configFileExists } from "../src/config.js";
import { formatPrice, primaryPrice, truncate } from "../src/output/format.js";
import { renderHistory, sparkline as sparklineFromTable } from "../src/output/table.js";
import { parseLimit, parseOffset } from "../src/commands/shared.js";
import type { Card } from "@tcgpricelookup/sdk";

let originalXdg: string | undefined;
let originalEnvKey: string | undefined;
let tmp: string;

beforeEach(async () => {
  originalXdg = process.env.XDG_CONFIG_HOME;
  originalEnvKey = process.env.TCG_API_KEY;
  tmp = await mkdtemp(join(tmpdir(), "tcglookup-cli-test-"));
  process.env.XDG_CONFIG_HOME = tmp;
  delete process.env.TCG_API_KEY;
});

afterEach(async () => {
  if (originalXdg !== undefined) process.env.XDG_CONFIG_HOME = originalXdg;
  else delete process.env.XDG_CONFIG_HOME;
  if (originalEnvKey !== undefined) process.env.TCG_API_KEY = originalEnvKey;
  else delete process.env.TCG_API_KEY;
  await rm(tmp, { recursive: true, force: true });
});

describe("config", () => {
  it("honors XDG_CONFIG_HOME for the config dir", () => {
    expect(configDir()).toBe(join(tmp, "tcglookup"));
    expect(configPath()).toBe(join(tmp, "tcglookup", "config.json"));
  });

  it("returns empty config when the file does not exist", async () => {
    expect(await readConfig()).toEqual({});
    expect(await configFileExists()).toBe(false);
  });

  it("writes and reads back a key with mode 600", async () => {
    await writeConfig({ apiKey: "tcg_test_xxx" });
    const cfg = await readConfig();
    expect(cfg.apiKey).toBe("tcg_test_xxx");
    expect(await configFileExists()).toBe(true);
    const s = await stat(configPath());
    // Compare lower 9 bits — Node returns the full mode incl. file type.
    expect(s.mode & 0o777).toBe(0o600);
  });

  it("deleteConfig removes the file and is idempotent", async () => {
    await writeConfig({ apiKey: "k" });
    expect(await deleteConfig()).toBe(true);
    expect(await deleteConfig()).toBe(false);
  });

  it("resolveApiKey prefers env var over stored config", async () => {
    await writeConfig({ apiKey: "stored" });
    process.env.TCG_API_KEY = "from-env";
    expect(await resolveApiKey()).toBe("from-env");
  });

  it("resolveApiKey falls back to stored config when env is unset", async () => {
    await writeConfig({ apiKey: "stored" });
    expect(await resolveApiKey()).toBe("stored");
  });

  it("resolveApiKey returns null when nothing is configured", async () => {
    expect(await resolveApiKey()).toBeNull();
  });

  it("writeConfig writes valid JSON", async () => {
    await writeConfig({ apiKey: "k" });
    const raw = await readFile(configPath(), "utf8");
    expect(JSON.parse(raw)).toEqual({ apiKey: "k" });
  });
});

describe("output formatters", () => {
  it("formatPrice renders null as a dim em-dash", () => {
    expect(formatPrice(null)).toContain("—");
  });

  it("formatPrice formats numbers with $ sign and 2 decimals", () => {
    expect(formatPrice(48.97)).toContain("$48.97");
    expect(formatPrice(0.42)).toContain("$0.42");
  });

  it("formatPrice formats large numbers with thousands separator", () => {
    expect(formatPrice(12345.6)).toContain("$12,345.6");
  });

  it("truncate respects the max length and appends an ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
    expect(truncate("short", 10)).toBe("short");
    expect(truncate(null, 5)).toBe("");
  });

  it("primaryPrice returns NM TCGPlayer market or null", () => {
    const card = {
      prices: { raw: { near_mint: { tcgplayer: { market: 12.34 } } } },
    };
    expect(primaryPrice(card)).toBe(12.34);

    const empty = { prices: { raw: {} } };
    expect(primaryPrice(empty)).toBeNull();
  });

  it("sparkline returns one block char per value, scaled to range", () => {
    const out = sparklineFromTable([1, 2, 3, 4, 5]);
    expect(out).toHaveLength(5);
    // Lowest value should be the lowest block, highest should be the highest.
    expect(out[0]).toBe("▁");
    expect(out[4]).toBe("█");
  });

  it("sparkline handles flat series gracefully", () => {
    const out = sparklineFromTable([5, 5, 5]);
    expect(out).toHaveLength(3);
  });

  it("sparkline empty input returns empty string", () => {
    expect(sparklineFromTable([])).toBe("");
  });

  it("renderHistory does not throw on empty data", () => {
    const writes: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stdout.write;
    try {
      renderHistory([]);
    } finally {
      process.stdout.write = orig;
    }
    expect(writes.join("")).toContain("No history available");
  });
});

describe("argument parsers", () => {
  it("parseLimit returns the integer, capped at the max", () => {
    expect(parseLimit("10", 100)).toBe(10);
    expect(parseLimit("999", 100)).toBe(100);
  });

  it("parseLimit defaults to 20 when undefined", () => {
    expect(parseLimit(undefined, 100)).toBe(20);
  });

  it("parseLimit exits the process for non-positive values", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(() => parseLimit("0", 100)).toThrow(/exit:1/);
    expect(() => parseLimit("-3", 100)).toThrow(/exit:1/);
    expect(() => parseLimit("abc", 100)).toThrow(/exit:1/);
    exit.mockRestore();
    stderr.mockRestore();
  });

  it("parseOffset accepts 0 and positive integers", () => {
    expect(parseOffset(undefined)).toBe(0);
    expect(parseOffset("0")).toBe(0);
    expect(parseOffset("10")).toBe(10);
  });

  it("parseOffset exits for negative values", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(() => parseOffset("-1")).toThrow(/exit:1/);
    exit.mockRestore();
    stderr.mockRestore();
  });
});
