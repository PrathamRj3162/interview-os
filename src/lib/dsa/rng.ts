/** Small seeded PRNG so hidden tests are identical on every server instance and every deploy. */
export type Rng = {
  next(): number;
  int(lo: number, hi: number): number;
  arr(n: number, lo: number, hi: number): number[];
  distinct(n: number, lo: number, hi: number): number[];
  str(n: number, alphabet: string): string;
  pick<T>(xs: readonly T[]): T;
  shuffle<T>(xs: T[]): T[];
};

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const rng: Rng = {
    next, int,
    arr: (n, lo, hi) => Array.from({ length: n }, () => int(lo, hi)),
    distinct: (n, lo, hi) => {
      const s = new Set<number>();
      while (s.size < n) s.add(int(lo, hi));
      return [...s];
    },
    str: (n, alphabet) => Array.from({ length: n }, () => alphabet[int(0, alphabet.length - 1)]).join(""),
    pick: (xs) => xs[int(0, xs.length - 1)],
    shuffle: (xs) => {
      for (let i = xs.length - 1; i > 0; i--) { const j = int(0, i); [xs[i], xs[j]] = [xs[j], xs[i]]; }
      return xs;
    },
  };
  return rng;
}
