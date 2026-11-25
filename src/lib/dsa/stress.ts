/**
 * Stress tests: one input at the top of the stated constraints, built so that the brute-force approach
 * does its worst-case amount of work while the optimal one finishes in milliseconds. They run only on
 * Submit (on the judge), after every other hidden test, and are timed inside the harness: a correct
 * answer that takes longer than the language's budget is reported as "too slow" rather than accepted.
 *
 * Only problems where brute force is at least a factor of n slower than optimal have one; for the rest
 * (e.g. O(n log n) vs O(n)) wall-clock time on a shared free judge can't tell the two apart honestly.
 */
import type { Rng } from "./rng";
import type { Lang } from "./types";

const N = 100_000;

/** Max time for ONE stress call (the call only, not input parsing), per language. Calibrated on Judge0 CE. */
export const STRESS_BUDGET_MS: Record<Lang, number> = { cpp: 1000, java: 1500, javascript: 1500, python: 5000 };

export const STRESS: Record<string, (r: Rng) => unknown[]> = {
  // Pair sums to target only at the very end, so the pair loop scans everything.
  "two-sum": (r) => { const nums = r.distinct(N - 2, 5, 499_999_999).map((x) => x * 2); nums.push(1, 3); return [nums, 4]; },
  "contains-duplicate": (r) => [r.distinct(N, -1_000_000_000, 1_000_000_000)],
  "product-except-self": (r) => [Array.from({ length: N }, () => (r.next() < 0.0001 ? r.pick([-1, 2]) : r.pick([1, -1])))],
  // First half: distinct non-majority values; majority value fills the rest.
  "majority-element": (r) => { const a = r.distinct(49_999, 1, 1_000_000_000); return [[...a, ...Array(50_001).fill(0)]]; },
  "best-time-stock": (r) => [r.arr(N, 0, 10_000)],
  "maximum-subarray": (r) => [r.arr(N, -10_000, 10_000)],
  // Only the last station works.
  "gas-station": () => { const n = 100_000; const gas = Array(n).fill(1); const cost = Array(n).fill(1); cost[n - 2] = 2; gas[n - 1] = 2; return [gas, cost]; },
  "container-most-water": (r) => [r.arr(100_000, 0, 10_000)],
  "trapping-rain-water": (r) => [r.arr(100_000, 0, 100_000)],
  "char-replacement": (r) => [r.str(100_000, "ABCDEFGHIJ"), 50_000],
  "min-window-substring": (r) => { const s = r.str(100_000, "abcdefghijklmnopqrstuvwxy") + "Z"; return [s, "aZ"]; },
  "sliding-window-maximum": (r) => [r.arr(100_000, -10_000, 10_000), 50_000],
  // Deep nesting: removing "()" pairs one at a time needs n/2 passes.
  "valid-parentheses": () => ["(".repeat(50_000) + ")".repeat(50_000)],
  "daily-temperatures": () => [Array.from({ length: 100_000 }, (_, i) => 100 - Math.floor((i * 70) / 100_000))],
  "largest-rectangle-histogram": () => [Array(100_000).fill(7)],
  // h = n forces speed = max(pile), so counting speeds up from 1 never finishes.
  "koko-bananas": (r) => { const piles = r.arr(10_000, 500_000_000, 1_000_000_000); return [piles, piles.length]; },
  "merge-intervals": (r) => [r.distinct(100_000, 0, 499_999_999).sort((a, b) => a - b).map((x) => [x * 2, x * 2 + 1])],
  "non-overlapping-intervals": (r) => [Array.from({ length: 100_000 }, () => { const s = r.int(0, 999_000_000); return [s, s + r.int(1, 1_000_000)]; })],
  "meeting-rooms-ii": (r) => [Array.from({ length: 100_000 }, () => { const s = r.int(0, 999_000_000); return [s, s + r.int(1, 1_000_000)]; })],
  // Big jumps everywhere: marking every reachable index from every i is ~n² work.
  "jump-game": () => [Array(100_000).fill(100_000)],
  "three-sum": (r) => [r.distinct(3000, -100_000, 100_000)],
  // Insertion sort into a linked list is ~n²/4 pointer hops on random input.
  "sort-list": (r) => [r.arr(100_000, -100_000, 100_000)],
  // ── extra batches ──
  "count-primes": () => [5_000_000],
  "maximum-xor-pair": (r) => [r.arr(100_000, 0, 2147483647)],
  "subarray-sum-equals-k": (r) => [r.arr(20_000, -1000, 1000), 1_000_000], // no match: brute scans every pair
  "contiguous-array": () => [Array.from({ length: 100_000 }, (_, i) => (i < 50_000 ? 1 : i % 2))],
  "subarrays-divisible-by-k": (r) => [r.arr(30_000, -10_000, 10_000), 9973],
  "continuous-subarray-sum": () => [Array(100_000).fill(1), 2147483647],
  "flight-bookings": () => [Array.from({ length: 20_000 }, () => [1, 20_000, 10_000]), 20_000],
  "find-all-anagrams": (r) => [r.str(30_000, "ab"), r.str(15_000, "ab")],
  "stock-spans": () => [Array.from({ length: 100_000 }, (_, i) => i + 1)], // rising prices: walking back from each day covers everything
  "dota2-senate": () => ["R".repeat(5000) + "D".repeat(5000)],
  "count-smaller-after-self": (r) => [r.arr(100_000, -10_000, 10_000)],
  "reverse-pairs": (r) => [r.arr(50_000, -2147483648, 2147483647)],
  "longest-increasing-path": () => [Array.from({ length: 200 }, (_, i) => Array.from({ length: 200 }, (_, j) => (i % 2 === 0 ? i * 200 + j : i * 200 + 199 - j)))], // one long snake: plain DFS re-walks it from every cell
  "jump-game-iv": () => [Array.from({ length: 50_000 }, (_, i) => (i === 49_999 ? 2 : 7))], // one huge equal-value group
  "longest-valid-parentheses": (r) => [r.str(30_000, "()")],
  "candy": () => [Array.from({ length: 20_000 }, (_, i) => 20_000 - i)],
  "max-points-on-line": (r) => [[...new Map(Array.from({ length: 300 }, () => [r.int(-10_000, 10_000), r.int(-10_000, 10_000)]).map((p) => [p.join(","), p])).values()]],
};
