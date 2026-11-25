import type { Solution } from "../solutions";
import type { Rng } from "../rng";

/** Random connected/unconnected undirected edge lists for graph generators. */
const edgesOf = (r: Rng, n: number, m: number, base = 0) => {
  const seen = new Set<string>(); const out: number[][] = [];
  while (out.length < m) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a === b) continue; const k = a < b ? `${a},${b}` : `${b},${a}`; if (seen.has(k)) continue; seen.add(k); out.push([a + base, b + base]); }
  return out;
};
const treeEdges = (r: Rng, n: number, base = 0) => Array.from({ length: n - 1 }, (_, i) => [r.int(0, i) + base, i + 1 + base]);

export const MEDIUM_B_SOL: Record<string, Solution> = {
  "single-number-ii": {
    hints: ["Think about each bit position separately.", "For each bit, the total count over all numbers is 3k or 3k + 1.", "Sum each bit mod 3 (or use two masks 'ones' and 'twos') to rebuild the single number."],
    brute: { time: "O(n)", idea: "Count occurrences with a hash map (O(n) space)." },
    optimal: { time: "O(32n)", space: "O(1)", idea: "Per-bit counts modulo 3 (or the ones/twos state machine)." },
    ref: function (nums: number[]) { let ones = 0, twos = 0; for (const x of nums) { ones = (ones ^ x) & ~twos; twos = (twos ^ x) & ~ones; } return ones | 0; },
    gen: (r) => {
      const make = (n: number) => { const vals = r.distinct(n, -2147483648, 2147483647); const arr = [vals[0]]; for (const v of vals.slice(1)) arr.push(v, v, v); return [r.shuffle(arr)]; };
      return [[[5]], [[-1, -1, -1, -2]], [[2147483647, 0, 0, 0]], [[-2147483648, 7, 7, 7]], make(10), make(3000), make(9000)];
    },
  },
  "range-bitwise-and": {
    hints: ["Any bit that flips somewhere in the range becomes 0.", "The answer is the common binary prefix of left and right.", "Shift both right until equal, counting shifts, then shift back."],
    brute: { time: "O(right − left)", idea: "AND every number in the range." },
    optimal: { time: "O(log n)", space: "O(1)", idea: "Common prefix of left and right." },
    ref: function (a: number, b: number) { let s = 0; while (a !== b) { a >>>= 1; b >>>= 1; s++; } return (a << s) >>> 0 | 0; },
    gen: (r) => [[7, 7], [6, 7], [8, 15], [16, 31], [2147483646, 2147483647], [0, 2147483647], ...Array.from({ length: 5 }, () => { const a = r.int(0, 2147483647); return [a, Math.min(2147483647, a + r.int(0, 1000))]; })],
  },
  "maximum-xor-pair": {
    hints: ["Build the answer greedily from the highest bit.", "For a candidate prefix, can two numbers' prefixes XOR to it?", "Insert numbers into a binary trie and, for each number, walk the trie choosing the opposite bit when possible."],
    brute: { time: "O(n²)", idea: "XOR every pair." },
    optimal: { time: "O(31n)", space: "O(31n)", idea: "Binary trie (or greedy prefix set)." },
    ref: function (nums: number[]) {
      let best = 0, mask = 0;
      for (let b = 30; b >= 0; b--) {
        mask |= 1 << b;
        const pre = new Set(nums.map((x) => x & mask));
        const cand = best | (1 << b);
        for (const p of pre) if (pre.has(p ^ cand)) { best = cand; break; }
      }
      return best;
    },
    gen: (r) => [[[0]], [[8, 10, 2]], [[2147483647, 0]], [r.arr(30, 0, 1000)], [r.arr(5000, 0, 2147483647)]],
  },
  "number-of-provinces": {
    hints: ["Cities and connections form a graph.", "Count connected components.", "DFS from every unvisited city (or union-find over all 1 entries)."],
    brute: { time: "O(n³)", idea: "Repeatedly merge groups until nothing changes." },
    optimal: { time: "O(n²)", space: "O(n)", idea: "DFS/BFS or union-find over the adjacency matrix." },
    ref: function (m: number[][]) {
      const n = m.length; const seen = new Array(n).fill(false); let c = 0;
      for (let i = 0; i < n; i++) { if (seen[i]) continue; c++; const st = [i]; seen[i] = true; while (st.length) { const u = st.pop()!; for (let v = 0; v < n; v++) if (m[u][v] && !seen[v]) { seen[v] = true; st.push(v); } } }
      return c;
    },
    gen: (r) => {
      const mat = (n: number, p: number) => { const a = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (r.next() < p) a[i][j] = a[j][i] = 1; return a; };
      return [[[[1]]], [mat(5, 0.3)], [mat(50, 0.02)], [mat(200, 0.005)], [mat(200, 0.2)]];
    },
  },
  "redundant-connection": {
    hints: ["Adding edges one at a time, the first edge that joins two already-connected nodes closes the cycle.", "Union-find tells you in near-O(1) whether two nodes are already connected.", "Process edges in order; return the first edge whose endpoints have the same root."],
    brute: { time: "O(n²)", idea: "Try removing each edge from the end and check the rest is a tree." },
    optimal: { time: "O(n α(n))", space: "O(n)", idea: "Union-find; the first edge that fails to union." },
    ref: function (edges: number[][]) {
      const p = Array.from({ length: edges.length + 1 }, (_, i) => i);
      const f = (x: number): number => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
      for (const [a, b] of edges) { const ra = f(a), rb = f(b); if (ra === rb) return [a, b]; p[ra] = rb; }
      return [];
    },
    gen: (r) => [3, 10, 100, 1000].map((n) => { const e = (() => { const out: number[][] = []; for (let i = 2; i <= n; i++) out.push([r.int(1, i - 1), i]); return out; })(); let a = r.int(1, n), b = r.int(1, n); while (a === b || e.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) { a = r.int(1, n); b = r.int(1, n); } e.push([Math.min(a, b), Math.max(a, b)]); return [r.shuffle(e)]; }),
  },
  "graph-valid-tree": {
    hints: ["A tree on n nodes has exactly n − 1 edges.", "With n − 1 edges, it's a tree exactly when it's connected (no cycle).", "Check the edge count, then union-find: any edge joining an already-connected pair means a cycle."],
    brute: { time: "O(n·(n + e))", idea: "For each edge, check whether its endpoints were already connected by BFS." },
    optimal: { time: "O(n + e)", space: "O(n)", idea: "Edge count + union-find (or one DFS)." },
    ref: function (n: number, edges: number[][]) {
      if (edges.length !== n - 1) return false;
      const p = Array.from({ length: n }, (_, i) => i);
      const f = (x: number): number => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
      for (const [a, b] of edges) { const ra = f(a), rb = f(b); if (ra === rb) return false; p[ra] = rb; }
      return true;
    },
    gen: (r) => {
      const t = treeEdges(r, 2000);
      const cyc = [...treeEdges(r, 1000).slice(0, 998)]; cyc.push([0, 999], [cyc[5][1], cyc[200][1]].sort((a, b) => a - b));
      return [[1, []], [2, []], [2, [[0, 1]]], [4, [[0, 1], [2, 3], [1, 2]]], [4, [[0, 1], [1, 2], [2, 0]]], [2000, t], [1000, cyc], [2000, edgesOf(r, 2000, 1999)]];
    },
  },
  "equality-equations": {
    hints: ["Equalities group letters together.", "Process all == first, then check every !=.", "Union-find over 26 letters; a != between two letters in the same group is a contradiction."],
    brute: { time: "O(26^k)", idea: "Try assignments of values to letters." },
    optimal: { time: "O(n α(26))", space: "O(26)", idea: "Union-find on letters." },
    ref: function (eqs: string[]) {
      const p = Array.from({ length: 26 }, (_, i) => i);
      const f = (x: number): number => { while (p[x] !== x) x = p[x] = p[p[x]]; return x; };
      const c = (s: string, i: number) => s.charCodeAt(i) - 97;
      for (const e of eqs) if (e[1] === "=") p[f(c(e, 0))] = f(c(e, 3));
      return eqs.every((e) => e[1] === "=" || f(c(e, 0)) !== f(c(e, 3)));
    },
    gen: (r) => {
      const eq = (n: number, letters: string, pNe: number) => Array.from({ length: n }, () => `${r.pick(letters.split(""))}${r.next() < pNe ? "!=" : "=="}${r.pick(letters.split(""))}`);
      return [[["a!=a"]], [["a==a"]], [["c==c", "b==d", "x!=z"]], [eq(10, "abcd", 0.3)], [eq(500, "abcdefghijklmnopqrstuvwxyz", 0.1)], [eq(500, "abcdefghijklmnopqrstuvwxyz", 0.5)]];
    },
  },
  "network-connected": {
    hints: ["You need at least n − 1 cables in total.", "If you have enough cables, how many moves are needed?", "Answer = (number of connected components) − 1, or −1 if fewer than n − 1 cables."],
    brute: { time: "O(n·e)", idea: "Repeatedly find a redundant cable and move it." },
    optimal: { time: "O(n + e)", space: "O(n)", idea: "Count components with union-find." },
    ref: function (n: number, conns: number[][]) {
      if (conns.length < n - 1) return -1;
      const p = Array.from({ length: n }, (_, i) => i);
      const f = (x: number): number => { while (p[x] !== x) x = p[x] = p[p[x]]; return x; };
      let comps = n;
      for (const [a, b] of conns) { const ra = f(a), rb = f(b); if (ra !== rb) { p[ra] = rb; comps--; } }
      return comps - 1;
    },
    gen: (r) => [[1, []], [2, [[0, 1]]], [5, [[0, 1], [1, 2], [2, 0], [3, 4]]], [100, edgesOf(r, 100, 120)], [100000, edgesOf(r, 100000, 100000)], [100000, edgesOf(r, 100000, 50000)]],
  },
  "most-stones-removed": {
    hints: ["Stones sharing a row or column are connected.", "From each connected group you can remove all but one stone.", "Answer = number of stones − number of components (union rows and columns as nodes)."],
    brute: { time: "O(n²)", idea: "Build the stone graph pairwise and count components." },
    optimal: { time: "O(n α(n))", space: "O(n)", idea: "Union-find over row and column ids." },
    ref: function (stones: number[][]) {
      const p = new Map<number, number>();
      const f = (x: number): number => { if (!p.has(x)) p.set(x, x); let y = x; while (p.get(y) !== y) y = p.get(y)!; while (p.get(x) !== y) { const nx = p.get(x)!; p.set(x, y); x = nx; } return y; };
      for (const [rr, cc] of stones) p.set(f(rr), f(cc + 20001));
      const roots = new Set<number>(); for (const [rr] of stones) roots.add(f(rr));
      return stones.length - roots.size;
    },
    gen: (r) => {
      const pts = (n: number, span: number) => { const s = new Set<string>(); const out: number[][] = []; while (out.length < n) { const a = r.int(0, span), b = r.int(0, span); const k = `${a},${b}`; if (!s.has(k)) { s.add(k); out.push([a, b]); } } return out; };
      return [[[[0, 0], [1, 1]]], [[[0, 1], [1, 0], [1, 1]]], [pts(30, 10)], [pts(1000, 10000)], [pts(1000, 40)]];
    },
  },
  "subarray-sum-equals-k": {
    hints: ["A subarray sum is a difference of two prefix sums.", "For each prefix sum p, how many earlier prefix sums equal p − k?", "Count prefix sums seen so far in a hash map (starting with {0: 1})."],
    brute: { time: "O(n²)", idea: "Try every start and extend to every end." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Prefix sums + hash map of counts." },
    ref: function (nums: number[], k: number) { const m = new Map<number, number>([[0, 1]]); let s = 0, c = 0; for (const x of nums) { s += x; c += m.get(s - k) ?? 0; m.set(s, (m.get(s) ?? 0) + 1); } return c; },
    gen: (r) => [[[1], 0], [[0, 0, 0], 0], [[-1, -1, 1], 0], [r.arr(50, -5, 5), r.int(-5, 5)], [r.arr(20000, -1000, 1000), r.int(-3000, 3000)]],
  },
  "continuous-subarray-sum": {
    hints: ["Two prefix sums with the same remainder mod k bound a subarray divisible by k.", "The subarray must have length ≥ 2.", "Map remainder → first index seen (start with {0: −1}); found when the same remainder reappears at least 2 positions later."],
    brute: { time: "O(n²)", idea: "Check every subarray of length ≥ 2." },
    optimal: { time: "O(n)", space: "O(min(n, k))", idea: "Prefix sums modulo k with first-occurrence indices." },
    ref: function (nums: number[], k: number) { const first = new Map<number, number>([[0, -1]]); let s = 0; for (let i = 0; i < nums.length; i++) { s = (s + nums[i]) % k; if (first.has(s)) { if (i - first.get(s)! >= 2) return true; } else first.set(s, i); } return false; },
    gen: (r) => [[[0], 1], [[0, 0], 1], [[1, 0], 2], [[5, 5], 5], [r.arr(30, 0, 20), r.int(1, 50)], [r.arr(100000, 0, 10000), 2147483647], [r.arr(100000, 0, 10000), r.int(100000, 1000000)]],
  },
  "contiguous-array": {
    hints: ["Treat 0 as −1.", "Then you want the longest subarray with sum 0.", "Map each running sum to the first index where it appeared; equal sums bound a balanced subarray."],
    brute: { time: "O(n²)", idea: "Count zeros and ones for every subarray." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Prefix balance + first-occurrence map." },
    ref: function (nums: number[]) { const first = new Map<number, number>([[0, -1]]); let s = 0, best = 0; for (let i = 0; i < nums.length; i++) { s += nums[i] ? 1 : -1; if (first.has(s)) best = Math.max(best, i - first.get(s)!); else first.set(s, i); } return best; },
    gen: (r) => [[[0]], [[1, 1]], [[0, 0, 1, 1, 0]], [r.arr(40, 0, 1)], [r.arr(100000, 0, 1)]],
  },
  "subarrays-divisible-by-k": {
    hints: ["Two prefix sums with the same remainder bound a divisible subarray.", "Careful: remainders of negative numbers.", "Count remainders ((s % k) + k) % k in a map; add the count of the current remainder at each step."],
    brute: { time: "O(n²)", idea: "Check every subarray." },
    optimal: { time: "O(n)", space: "O(k)", idea: "Prefix remainders with counts." },
    ref: function (nums: number[], k: number) { const c = new Array(k).fill(0); c[0] = 1; let s = 0, t = 0; for (const x of nums) { s = (((s + x) % k) + k) % k; t += c[s]; c[s]++; } return t; },
    gen: (r) => [[[0], 2], [[-1, 2, 9], 2], [r.arr(50, -10, 10), r.int(2, 7)], [r.arr(30000, -10000, 10000), r.int(2, 10000)]],
  },
  "flight-bookings": {
    hints: ["Adding to every flight in each range is slow.", "Record where each booking starts and stops.", "Difference array: add at first, subtract after last, then take a running sum."],
    brute: { time: "O(n · bookings)", idea: "Add seats to every flight in each range." },
    optimal: { time: "O(n + bookings)", space: "O(n)", idea: "Difference array + prefix sum." },
    ref: function (b: number[][], n: number) { const d = new Array(n + 1).fill(0); for (const [f, l, s] of b) { d[f - 1] += s; d[l] -= s; } const out: number[] = []; let run = 0; for (let i = 0; i < n; i++) { run += d[i]; out.push(run); } return out; },
    gen: (r) => {
      const bk = (m: number, n: number) => Array.from({ length: m }, () => { const a = r.int(1, n), b = r.int(1, n); return [Math.min(a, b), Math.max(a, b), r.int(1, 10000)]; });
      return [[[[1, 1, 5]], 1], [bk(20, 10), 10], [bk(20000, 20000), 20000]];
    },
  },
  "matrix-region-sums": {
    hints: ["Precompute something so each query is O(1).", "P[i][j] = sum of the rectangle from (0,0) to (i−1, j−1).", "Region = P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]."],
    brute: { time: "O(q · r · c)", idea: "Sum each queried rectangle directly." },
    optimal: { time: "O(r·c + q)", space: "O(r·c)", idea: "2D prefix sums (inclusion–exclusion)." },
    ref: function (m: number[][], qs: number[][]) {
      const R = m.length, C = m[0].length; const P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) P[i + 1][j + 1] = m[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
      return qs.map(([a, b, c, d]) => P[c + 1][d + 1] - P[a][d + 1] - P[c + 1][b] + P[a][b]);
    },
    gen: (r) => {
      const make = (R: number, C: number, q: number) => { const m = Array.from({ length: R }, () => r.arr(C, -10000, 10000)); const qs = Array.from({ length: q }, () => { const a = r.int(0, R - 1), c = r.int(a, R - 1), b = r.int(0, C - 1), d = r.int(b, C - 1); return [a, b, c, d]; }); return [m, qs]; };
      return [[[[5]], [[0, 0, 0, 0]]], make(3, 4, 5), make(50, 30, 200), make(200, 200, 10000)];
    },
  },
  "pow-x-n": {
    hints: ["x^n = (x^(n/2))² for even n.", "Negative n means 1 / x^(−n).", "Fast exponentiation by squaring on |n|; careful with n = −2³¹."],
    brute: { time: "O(|n|)", idea: "Multiply x by itself |n| times." },
    optimal: { time: "O(log |n|)", space: "O(1)", idea: "Binary exponentiation." },
    ref: function (x: number, n: number) { let e = Math.abs(n), b = x, res = 1; while (e > 0) { if (e % 2 === 1) res *= b; b *= b; e = Math.floor(e / 2); } return n < 0 ? 1 / res : res; },
    gen: () => [[1.0, 2147483647], [-1.0, -2147483648], [1.00001, 123456], [0.99999, 948688], [2.0, -10], [-2.0, 3], [0.0, 5], [3.0, 8], [1.5, 20], [-0.5, -13]],
  },
  "count-primes": {
    hints: ["Checking each number for primality separately is slow.", "Every composite number has a prime factor ≤ its square root.", "Sieve of Eratosthenes: mark multiples of each prime p starting from p²."],
    brute: { time: "O(n√n)", idea: "Trial division for every number below n." },
    optimal: { time: "O(n log log n)", space: "O(n)", idea: "Sieve of Eratosthenes." },
    ref: function (n: number) {
      if (n < 3) return 0;
      const comp = new Uint8Array(n); let c = 0;
      for (let i = 2; i < n; i++) { if (comp[i]) continue; c++; for (let j = i * i; j < n; j += i) comp[j] = 1; }
      return c;
    },
    gen: () => [[2], [3], [100], [1000], [499979], [1000000]],
  },
  "multiply-strings": {
    hints: ["Multiply like on paper.", "Digit i of num1 times digit j of num2 lands at position i + j (+1).", "Accumulate products into an array of length m + n, then propagate carries."],
    brute: { time: "O(m·n)", idea: "Repeated addition of shifted partial products as strings." },
    optimal: { time: "O(m·n)", space: "O(m + n)", idea: "Grade-school multiplication into a digit array." },
    ref: function (a: string, b: string) {
      if (a === "0" || b === "0") return "0";
      const res = new Array(a.length + b.length).fill(0);
      for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) { const s = (a.charCodeAt(i) - 48) * (b.charCodeAt(j) - 48) + res[i + j + 1]; res[i + j + 1] = s % 10; res[i + j] += Math.floor(s / 10); }
      return res.join("").replace(/^0+/, "");
    },
    gen: (r) => { const num = (n: number) => String(r.int(1, 9)) + r.str(n - 1, "0123456789"); return [["1", "1"], ["9", "9"], ["999", "999"], [num(20), num(15)], [num(200), num(200)], ["0", num(50)]]; },
  },
  "integer-to-roman": {
    hints: ["Use a table of values from largest to smallest, including the subtractive pairs.", "Greedily take the largest value that fits.", "Values: 1000 M, 900 CM, 500 D, 400 CD, 100 C, 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 I."],
    brute: { time: "O(1)", idea: "Per-digit lookup tables for thousands, hundreds, tens and ones." },
    optimal: { time: "O(1)", space: "O(1)", idea: "Greedy over the 13 symbols." },
    ref: function (n: number) { const m: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]; let s = ""; for (const [v, c] of m) while (n >= v) { s += c; n -= v; } return s; },
    gen: (r) => [[1], [4], [9], [14], [40], [3999], [2444], [r.int(1, 3999)], [r.int(1, 3999)]],
  },
  "trailing-zeroes": {
    hints: ["A trailing zero needs a factor 10 = 2 × 5.", "Fives are rarer than twos.", "Count multiples of 5, 25, 125, …: sum of floor(n / 5^k)."],
    brute: { time: "O(n log n)", idea: "Count factors of 5 in every number up to n." },
    optimal: { time: "O(log n)", space: "O(1)", idea: "Legendre's formula for the prime 5." },
    ref: function (n: number) { let c = 0; while (n >= 5) { n = Math.floor(n / 5); c += n; } return c; },
    gen: (r) => [[0], [4], [25], [125], [1000000000], [r.int(1, 1000000000)]],
  },
  "rotate-array": {
    hints: ["Rotating by n is the same as not rotating — use k mod n.", "Reversing parts of the array can produce a rotation.", "Reverse the whole array, then reverse the first k and the remaining n − k."],
    brute: { time: "O(n·k)", idea: "Rotate one step at a time." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Three reversals." },
    ref: function (nums: number[], k: number) { const n = nums.length; k %= n; return [...nums.slice(n - k), ...nums.slice(0, n - k)]; },
    gen: (r) => [[[1], 5], [[1, 2], 2], [[1, 2, 3], 0], [r.arr(10, -100, 100), 13], [r.arr(100000, -1000, 1000), 99999]],
  },
  "coin-change-ii": {
    hints: ["Counting combinations, not orderings — process coins one at a time.", "dp[a] = number of ways to make amount a with the coins seen so far.", "For each coin, for a from coin to amount: dp[a] += dp[a − coin]."],
    brute: { time: "Exponential", idea: "Recurse over coins, choosing how many of each." },
    optimal: { time: "O(amount · coins)", space: "O(amount)", idea: "Unbounded knapsack counting, coin loop outside." },
    ref: function (amount: number, coins: number[]) { const dp = new Array(amount + 1).fill(0); dp[0] = 1; for (const c of coins) for (let a = c; a <= amount; a++) dp[a] += dp[a - c]; return dp[amount]; },
    gen: (r) => [[0, [7]], [1, [2]], [11, [1, 5, 10]], [100, [3, 7, 11, 13]], [500, [2, 3, 5, 7, 11]], [5000, r.distinct(5, 100, 600)], [1000, [1, 2, 5, 10, 20, 50, 100, 200, 500]]],
  },
  "target-sum": {
    hints: ["Split the numbers into a plus group P and a minus group N.", "P − N = target and P + N = sum, so P = (sum + target) / 2.", "Count subsets summing to (sum + target) / 2 with a 0/1 knapsack (if it's a non-negative integer)."],
    brute: { time: "O(2ⁿ)", idea: "Try every sign assignment." },
    optimal: { time: "O(n · sum)", space: "O(sum)", idea: "Subset-sum counting (0/1 knapsack)." },
    ref: function (nums: number[], target: number) {
      const sum = nums.reduce((a, b) => a + b, 0);
      if ((sum + target) % 2 !== 0 || sum + target < 0 || Math.abs(target) > sum) return 0;
      const P = (sum + target) / 2; const dp = new Array(P + 1).fill(0); dp[0] = 1;
      for (const x of nums) for (let s = P; s >= x; s--) dp[s] += dp[s - x];
      return dp[P];
    },
    gen: (r) => [[[0, 0, 0], 0], [[1000], -1000], [[1, 2], 4], [r.arr(10, 0, 20), r.int(-10, 10)], [r.arr(20, 0, 50), r.int(-30, 30)], [Array(20).fill(1), 0]],
  },
  "last-stone-weight-ii": {
    hints: ["The final weight is |sum of one group − sum of the other|.", "Make one group's sum as close to total / 2 as possible.", "0/1 knapsack: reachable subset sums up to total / 2; answer = total − 2 × best."],
    brute: { time: "O(2ⁿ)", idea: "Try every split into two groups." },
    optimal: { time: "O(n · sum)", space: "O(sum)", idea: "Subset-sum reachability." },
    ref: function (stones: number[]) { const total = stones.reduce((a, b) => a + b, 0); const half = Math.floor(total / 2); const can = new Array(half + 1).fill(false); can[0] = true; for (const s of stones) for (let x = half; x >= s; x--) if (can[x - s]) can[x] = true; for (let x = half; x >= 0; x--) if (can[x]) return total - 2 * x; return total; },
    gen: (r) => [[[1, 1]], [[5]], [[1, 2]], [r.arr(10, 1, 100)], [r.arr(30, 1, 100)], [r.arr(30, 90, 100)]],
  },
  "ones-and-zeroes": {
    hints: ["Each string is an item with two costs: zeros and ones.", "It's a 0/1 knapsack with two capacities.", "dp[i][j] = max strings using ≤ i zeros and ≤ j ones; iterate i, j downward for each string."],
    brute: { time: "O(2^L)", idea: "Try every subset of strings." },
    optimal: { time: "O(L · m · n)", space: "O(m · n)", idea: "2D 0/1 knapsack." },
    ref: function (strs: string[], m: number, n: number) {
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (const s of strs) { let z = 0; for (const c of s) if (c === "0") z++; const o = s.length - z; for (let i = m; i >= z; i--) for (let j = n; j >= o; j--) dp[i][j] = Math.max(dp[i][j], dp[i - z][j - o] + 1); }
      return dp[m][n];
    },
    gen: (r) => [[["1"], 1, 1], [["00", "11"], 1, 1], [Array.from({ length: 20 }, () => r.str(r.int(1, 6), "01")), 8, 8], [Array.from({ length: 600 }, () => r.str(r.int(1, 10), "01")), 100, 100]],
  },
  "house-robber-ii": {
    hints: ["The first and last house can't both be robbed.", "So solve the straight-line problem twice.", "max(rob(nums[0..n−2]), rob(nums[1..n−1])), with the single-house case handled separately."],
    brute: { time: "O(2ⁿ)", idea: "Try every non-adjacent selection." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Linear house robber on two ranges." },
    ref: function (nums: number[]) {
      if (nums.length === 1) return nums[0];
      const line = (a: number[]) => { let p = 0, q = 0; for (const x of a) [p, q] = [q, Math.max(q, p + x)]; return q; };
      return Math.max(line(nums.slice(0, -1)), line(nums.slice(1)));
    },
    gen: (r) => [[[5]], [[1, 2]], [[200, 3, 140, 20, 10]], [r.arr(20, 0, 50)], [r.arr(100, 0, 1000)]],
  },
  "palindromic-substrings": {
    hints: ["Every palindrome has a centre.", "There are 2n − 1 centres (characters and gaps).", "Expand around each centre while the ends match, counting each expansion."],
    brute: { time: "O(n³)", idea: "Check every substring." },
    optimal: { time: "O(n²)", space: "O(1)", idea: "Expand around centres (or Manacher in O(n))." },
    ref: function (s: string) { let c = 0; for (let m = 0; m < 2 * s.length - 1; m++) { let l = m >> 1, r = l + (m & 1); while (l >= 0 && r < s.length && s[l] === s[r]) { c++; l--; r++; } } return c; },
    gen: (r) => [["a"], ["ab"], ["abba"], [r.str(30, "ab")], [r.str(1000, "abc")], ["a".repeat(1000)]],
  },
  "longest-palindromic-subsequence": {
    hints: ["Compare the two ends of a range.", "If s[i] == s[j], they can wrap the best answer for s[i+1..j−1].", "dp[i][j] = s[i]==s[j] ? dp[i+1][j−1] + 2 : max(dp[i+1][j], dp[i][j−1]); fill by increasing length."],
    brute: { time: "O(2ⁿ)", idea: "Check every subsequence." },
    optimal: { time: "O(n²)", space: "O(n)", idea: "Interval DP (or LCS of s and reverse(s))." },
    ref: function (s: string) {
      const n = s.length; let dp = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) { const nd = new Array(n).fill(0); nd[i] = 1; for (let j = i + 1; j < n; j++) nd[j] = s[i] === s[j] ? dp[j - 1] + 2 : Math.max(dp[j], nd[j - 1]); dp = nd; }
      return dp[n - 1];
    },
    gen: (r) => [["a"], ["ab"], ["aba"], [r.str(40, "abc")], [r.str(1000, "abcd")], ["z".repeat(1000)]],
  },
  "maximum-product-subarray": {
    hints: ["A negative number turns the smallest product into the largest.", "Track both the max and min product ending at each position.", "At each x: newMax = max(x, x·max, x·min), newMin = min(x, x·max, x·min)."],
    brute: { time: "O(n²)", idea: "Try every subarray." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Running max and min products." },
    ref: function (nums: number[]) { let mx = nums[0], mn = nums[0], best = nums[0]; for (let i = 1; i < nums.length; i++) { const x = nums[i]; const a = mx * x, b = mn * x; mx = Math.max(x, a, b); mn = Math.min(x, a, b); best = Math.max(best, mx); } return best; },
    gen: (r) => [[[-2]], [[0, 2]], [[-2, -3, 0, -2, -4]], [r.arr(12, -4, 4)], [Array.from({ length: 20000 }, (_, i) => (i % 25 === 0 ? 0 : r.pick([-1, 1, 1, -1, 2, -2, 1, 1, 1, 1])))]],
  },
};
