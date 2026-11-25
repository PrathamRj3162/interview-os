import type { CompareMode } from "./types";

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  return false;
}

const key = (x: unknown) => JSON.stringify(x);
const sortByKey = (xs: unknown[]) => [...xs].sort((p, q) => (key(p) < key(q) ? -1 : key(p) > key(q) ? 1 : 0));
const sortDeep = (x: unknown): unknown => (Array.isArray(x) ? sortByKey(x.map(sortDeep)) : x);

/** Problems where several answers are valid get a validator instead of a fixed expected value. */
export const CHECKERS: Record<string, (input: unknown[], actual: unknown, expected: unknown) => boolean> = {
  "two-sum": ([nums, target], out) => {
    const a = nums as number[];
    if (!Array.isArray(out) || out.length !== 2 || !out.every(Number.isInteger)) return false;
    const [i, j] = out as number[];
    return i !== j && i >= 0 && j >= 0 && i < a.length && j < a.length && a[i] + a[j] === target;
  },
  "top-k-frequent": ([nums, k], out) => {
    if (!Array.isArray(out) || out.length !== k || new Set(out).size !== out.length) return false;
    const freq = new Map<number, number>();
    for (const n of nums as number[]) freq.set(n, (freq.get(n) ?? 0) + 1);
    if (!out.every((x) => freq.has(x as number))) return false;
    const chosen = new Set(out as number[]);
    const minIn = Math.min(...(out as number[]).map((x) => freq.get(x)!));
    let maxOut = 0;
    for (const [v, f] of freq) if (!chosen.has(v)) maxOut = Math.max(maxOut, f);
    return minIn >= maxOut;
  },
  "course-schedule-ii": ([n, pre], out, expected) => {
    if (!Array.isArray(out)) return false;
    if (Array.isArray(expected) && expected.length === 0) return out.length === 0;
    if (out.length !== n) return false;
    const pos = new Map<number, number>();
    (out as number[]).forEach((c, i) => pos.set(c, i));
    if (pos.size !== n || ![...pos.keys()].every((c) => Number.isInteger(c) && c >= 0 && c < (n as number))) return false;
    return (pre as number[][]).every(([a, b]) => pos.get(b)! < pos.get(a)!);
  },
  "gas-station": ([gas, cost], out, expected) => {
    if (expected === -1) return out === -1;
    const g = gas as number[], c = cost as number[];
    if (!Number.isInteger(out) || (out as number) < 0 || (out as number) >= g.length) return false;
    let tank = 0;
    for (let s = 0; s < g.length; s++) {
      const i = ((out as number) + s) % g.length;
      tank += g[i] - c[i];
      if (tank < 0) return false;
    }
    return true;
  },
};

export function outputsMatch(mode: CompareMode, expected: unknown, actual: unknown, ctx?: { slug: string; input: unknown[] }): boolean {
  switch (mode) {
    case "exact": return deepEqual(expected, actual);
    case "float": return isNum(expected) && isNum(actual) && Math.abs(expected - actual) <= 1e-5 * Math.max(1, Math.abs(expected));
    case "unordered": return Array.isArray(expected) && Array.isArray(actual) && deepEqual(sortByKey(expected), sortByKey(actual));
    case "unordered-deep": return Array.isArray(actual) && deepEqual(sortDeep(expected), sortDeep(actual));
    case "checker": {
      const check = ctx && CHECKERS[ctx.slug];
      return check ? check(ctx.input, actual, expected) : deepEqual(expected, actual);
    }
  }
}

/** Compact display of a value (inputs/outputs) for the results panel. */
export function show(value: unknown, max = 300): string {
  const s = JSON.stringify(value) ?? "null";
  return s.length > max ? s.slice(0, max) + `… (${s.length} chars)` : s;
}
