import { exitWith } from "../errors.js";

export function parseLimit(input: string | undefined, max: number): number {
  if (input == null) return 20;
  const n = Number(input);
  if (!Number.isFinite(n) || n < 1) {
    exitWith(`--limit must be a positive integer (got: ${input})`);
  }
  return Math.min(Math.floor(n), max);
}

export function parseOffset(input: string | undefined): number {
  if (input == null) return 0;
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) {
    exitWith(`--offset must be 0 or a positive integer (got: ${input})`);
  }
  return Math.floor(n);
}
