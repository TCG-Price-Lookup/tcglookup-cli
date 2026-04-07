import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile, chmod, unlink, stat } from "node:fs/promises";

/**
 * Resolve the config directory honoring XDG_CONFIG_HOME on Linux/BSD
 * and falling back to ~/.config on macOS. We deliberately avoid
 * macOS' "Library/Application Support" so the same path works
 * everywhere and CI users can predict it.
 */
export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.length > 0) return join(xdg, "tcglookup");
  return join(homedir(), ".config", "tcglookup");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export interface StoredConfig {
  apiKey?: string;
}

export async function readConfig(): Promise<StoredConfig> {
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as StoredConfig;
    }
    return {};
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return {};
    throw err;
  }
}

export async function writeConfig(cfg: StoredConfig): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  const path = configPath();
  await writeFile(path, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
  // Re-chmod in case the file already existed with looser perms.
  await chmod(path, 0o600);
}

export async function deleteConfig(): Promise<boolean> {
  try {
    await unlink(configPath());
    return true;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return false;
    throw err;
  }
}

/**
 * Resolve an API key from the most-specific source to the least-specific.
 * Order: TCG_API_KEY env var, then ~/.config/tcglookup/config.json.
 *
 * Env var wins so CI / one-off scripts can override the stored key
 * without rewriting the config file.
 */
export async function resolveApiKey(): Promise<string | null> {
  const env = process.env.TCG_API_KEY;
  if (env && env.length > 0) return env;
  const cfg = await readConfig();
  return cfg.apiKey ?? null;
}

/** True if the config file exists at all (used by `auth status`). */
export async function configFileExists(): Promise<boolean> {
  try {
    await stat(configPath());
    return true;
  } catch {
    return false;
  }
}
