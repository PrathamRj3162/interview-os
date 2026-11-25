import type { Solution } from "../solutions";
import type { Rng } from "../rng";

const treeEdges = (r: Rng, n: number) => Array.from({ length: n - 1 }, (_, i) => [r.int(0, i), i + 1]);
const lettersOf = "abcdefghijklmnopqrstuvwxyz";

export const MEDIUM_C_SOL: Record<string, Solution> = {
  "k-closest-points": {
    hints: ["You only need the k smallest distances, not a full sort.", "Compare squared distances — no square roots needed.", "Keep a max-heap of size k (or quickselect around the k-th distance)."],
    brute: { time: "O(n log n)", idea: "Sort all points by distance." },
    optimal: { time: "O(n log k)", space: "O(k)", idea: "Max-heap of size k, or quickselect in O(n) average." },
    ref: function (pts: number[][], k: number) { return [...pts].sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1])).slice(0, k); },
    gen: (r) => {
      // Distinct squared distances so the answer is unique.
      const make = (n: number, k: number) => { const used = new Set<number>(); const pts: number[][] = []; while (pts.length < n) { const x = r.int(-10000, 10000), y = r.int(-10000, 10000); const d = x * x + y * y; if (!used.has(d)) { used.add(d); pts.push([x, y]); } } return [pts, k]; };
      return [[[[0, 1]], 1], make(5, 3), make(100, 10), make(10000, 5000)];
    },
  },
  "task-scheduler": {
    hints: ["The most frequent task decides the frame.", "With max frequency f, there are f − 1 gaps of size n after it, plus a final row.", "Answer = max(tasks.length, (f − 1)(n + 1) + number of tasks with frequency f)."],
    brute: { time: "O(T log 26)", idea: "Simulate time steps with a max-heap and a cooldown queue." },
    optimal: { time: "O(T)", space: "O(26)", idea: "Counting formula based on the most frequent tasks." },
    ref: function (tasks: string[], n: number) { const c = new Array(26).fill(0); for (const t of tasks) c[t.charCodeAt(0) - 65]++; const f = Math.max(...c); const k = c.filter((x) => x === f).length; return Math.max(tasks.length, (f - 1) * (n + 1) + k); },
    gen: (r) => [[["A"], 5], [["A", "B"], 0], [Array.from({ length: 30 }, () => r.pick("ABC".split(""))), 2], [Array.from({ length: 10000 }, () => r.pick("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))), 100], [Array.from({ length: 1000 }, () => r.pick("AAAAB".split(""))), 7]],
  },
  "reorganize-string": {
    hints: ["It's impossible exactly when some letter appears more than ⌈n/2⌉ times.", "Place the most frequent letter first, with gaps.", "Fill even indices (0, 2, 4, …) with letters sorted by frequency, then odd indices."],
    brute: { time: "O(n!)", idea: "Try permutations until one works." },
    optimal: { time: "O(n)", space: "O(26)", idea: "Count letters, fill even then odd positions starting with the most frequent." },
    ref: function (s: string) {
      const c = new Map<string, number>(); for (const ch of s) c.set(ch, (c.get(ch) ?? 0) + 1);
      const order = [...c.entries()].sort((a, b) => b[1] - a[1]);
      if (order[0][1] > Math.ceil(s.length / 2)) return "";
      const out: string[] = new Array(s.length); let i = 0;
      for (const [ch, n] of order) for (let k = 0; k < n; k++) { if (i >= s.length) i = 1; out[i] = ch; i += 2; }
      return out.join("");
    },
    gen: (r) => [["a"], ["aa"], ["aab"], ["vvvlo"], [r.str(50, "abc")], ["a".repeat(250) + r.str(250, "bcd")], ["a".repeat(251) + r.str(249, "bcd")], [r.str(500, lettersOf)]],
  },
  "top-k-frequent-words": {
    hints: ["Count each word.", "Order by frequency descending, then alphabetically.", "Sort the distinct words with that comparator (or keep a size-k heap) and take k."],
    brute: { time: "O(n log n)", idea: "Sort all distinct words with the comparator." },
    optimal: { time: "O(n log k)", space: "O(n)", idea: "Hash map counts + size-k heap." },
    ref: function (words: string[], k: number) { const c = new Map<string, number>(); for (const w of words) c.set(w, (c.get(w) ?? 0) + 1); return [...c.keys()].sort((a, b) => c.get(b)! - c.get(a)! || (a < b ? -1 : a > b ? 1 : 0)).slice(0, k); },
    gen: (r) => { const vocab = Array.from({ length: 40 }, () => r.str(r.int(1, 4), "abcde")); const ws = (n: number) => Array.from({ length: n }, () => r.pick(vocab)); const w1 = ws(30), w2 = ws(500); return [[["a"], 1], [["b", "a", "c"], 3], [w1, Math.min(3, new Set(w1).size)], [w2, Math.min(15, new Set(w2).size)]]; },
  },
  "kth-smallest-sorted-matrix": {
    hints: ["The smallest element is at the top-left; the next candidates are its right and down neighbours.", "Alternatively binary search the value: count how many elements are ≤ mid.", "Counting is O(n) per guess by walking from the bottom-left corner."],
    brute: { time: "O(n² log n)", idea: "Flatten and sort." },
    optimal: { time: "O(n log(max − min))", space: "O(1)", idea: "Binary search on value with staircase counting (or a heap of row heads in O(k log n))." },
    ref: function (m: number[][], k: number) { return m.flat().sort((a, b) => a - b)[k - 1]; },
    gen: (r) => {
      const make = (n: number) => { const a = Array.from({ length: n }, () => new Array(n).fill(0)); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) a[i][j] = Math.max(i ? a[i - 1][j] : -1000000000, j ? a[i][j - 1] : -1000000000) + r.int(0, 3); return [a, r.int(1, n * n)]; };
      return [make(1), make(3), make(30), make(300)];
    },
  },
  "parallel-courses": {
    hints: ["Courses with no remaining prerequisites can all be taken now.", "That's Kahn's algorithm, level by level.", "BFS by levels over in-degrees; if some course is never reached there's a cycle."],
    brute: { time: "O(n · (n + e))", idea: "Each semester, scan all courses for ones that are ready." },
    optimal: { time: "O(n + e)", space: "O(n + e)", idea: "Kahn's topological sort counting levels." },
    ref: function (n: number, rel: number[][]) {
      const adj: number[][] = Array.from({ length: n + 1 }, () => []); const indeg = new Array(n + 1).fill(0);
      for (const [a, b] of rel) { adj[a].push(b); indeg[b]++; }
      let level: number[] = []; for (let i = 1; i <= n; i++) if (!indeg[i]) level.push(i);
      let sem = 0, done = 0;
      while (level.length) { sem++; done += level.length; const next: number[] = []; for (const u of level) for (const v of adj[u]) if (--indeg[v] === 0) next.push(v); level = next; }
      return done === n ? sem : -1;
    },
    gen: (r) => {
      const dag = (n: number, m: number) => { const s = new Set<string>(); const out: number[][] = []; while (out.length < m) { const a = r.int(1, n - 1), b = r.int(a + 1, n); const k = `${a},${b}`; if (!s.has(k)) { s.add(k); out.push([a, b]); } } return out; };
      const chain = Array.from({ length: 4999 }, (_, i) => [i + 1, i + 2]);
      return [[1, []], [2, [[2, 1]]], [5, dag(5, 6)], [200, dag(200, 1000)], [5000, chain], [5000, [...dag(5000, 4000), [5000, 1], [1, 5000]]]];
    },
  },
  "minimum-height-trees": {
    hints: ["The best roots are in the middle of the longest path.", "Peel leaves layer by layer, like burning the tree from the outside.", "Repeatedly remove all current leaves until 1 or 2 nodes remain."],
    brute: { time: "O(n²)", idea: "BFS from every node and keep the minimum-height roots." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Topological leaf trimming." },
    ref: function (n: number, edges: number[][]) {
      if (n <= 2) return Array.from({ length: n }, (_, i) => i);
      const adj: number[][] = Array.from({ length: n }, () => []); const deg = new Array(n).fill(0);
      for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); deg[a]++; deg[b]++; }
      let leaves = []; for (let i = 0; i < n; i++) if (deg[i] === 1) leaves.push(i);
      let left = n;
      while (left > 2) { left -= leaves.length; const next: number[] = []; for (const u of leaves) for (const v of adj[u]) if (--deg[v] === 1) next.push(v); leaves = next; }
      return leaves;
    },
    gen: (r) => [[1, []], [2, [[0, 1]]], [3, [[0, 1], [1, 2]]], [30, treeEdges(r, 30)], [20000, treeEdges(r, 20000)], [20000, Array.from({ length: 19999 }, (_, i) => [i, i + 1])]],
  },
  "eventual-safe-states": {
    hints: ["A node is unsafe if it can reach a cycle.", "Reverse the edges and start from terminal nodes.", "Kahn's algorithm on the reversed graph: nodes whose out-degree drops to 0 are safe."],
    brute: { time: "O(n · (n + e))", idea: "DFS from each node checking for cycles." },
    optimal: { time: "O(n + e)", space: "O(n + e)", idea: "Reverse graph + topological sort (or 3-colour DFS)." },
    ref: function (g: number[][]) {
      const n = g.length; const rev: number[][] = Array.from({ length: n }, () => []); const out = g.map((x) => x.length);
      g.forEach((vs, u) => vs.forEach((v) => rev[v].push(u)));
      const q: number[] = []; for (let i = 0; i < n; i++) if (!out[i]) q.push(i);
      const safe = new Array(n).fill(false);
      for (let h = 0; h < q.length; h++) { const v = q[h]; safe[v] = true; for (const u of rev[v]) if (--out[u] === 0) q.push(u); }
      return safe.flatMap((s, i) => (s ? [i] : []));
    },
    gen: (r) => {
      const graph = (n: number, m: number) => { const g: number[][] = Array.from({ length: n }, () => []); for (let k = 0; k < m; k++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (!g[a].includes(b)) g[a].push(b); } g.forEach((x) => x.sort((p, q) => p - q)); return [g]; };
      return [[[[]]], [[[0]]], [[[1], [0]]], graph(10, 12), graph(1000, 1200), graph(10000, 15000)];
    },
  },
  "open-the-lock": {
    hints: ["Each code is a node with 8 neighbours.", "Shortest number of moves → BFS.", "BFS from \"0000\", skipping dead ends and visited codes."],
    brute: { time: "O(10⁴ · 8)", idea: "Same BFS — the state space is small." },
    optimal: { time: "O(10⁴ · 8)", space: "O(10⁴)", idea: "BFS (bidirectional BFS halves the work)." },
    ref: function (dead: string[], target: string) {
      const seen = new Set(dead); if (seen.has("0000")) return -1; if (target === "0000") return 0;
      let level = ["0000"]; seen.add("0000"); let d = 0;
      while (level.length) {
        d++; const next: string[] = [];
        for (const s of level) for (let i = 0; i < 4; i++) for (const delta of [1, 9]) {
          const t = s.slice(0, i) + ((Number(s[i]) + delta) % 10) + s.slice(i + 1);
          if (t === target) return d;
          if (!seen.has(t)) { seen.add(t); next.push(t); }
        }
        level = next;
      }
      return -1;
    },
    gen: (r) => {
      const code = () => r.str(4, "0123456789");
      // The target is never one of the dead ends.
      const make = (n: number) => { const dead = Array.from({ length: n }, code); let t = code(); while (dead.includes(t)) t = code(); return [dead, t]; };
      return [[["0001"], "0000"], [["0001", "0010", "0100", "1000", "0009", "0090", "0900", "9000"], "1111"], make(50), make(500), [["1234"], "5555"]];
    },
  },
  "shortest-path-binary-matrix": {
    hints: ["Every move costs the same.", "BFS from the top-left over 8 directions.", "The first time you reach the bottom-right, the path length is the BFS level (cells counted)."],
    brute: { time: "Exponential", idea: "DFS over all paths." },
    optimal: { time: "O(n²)", space: "O(n²)", idea: "BFS." },
    ref: function (g: number[][]) {
      const n = g.length; if (g[0][0] || g[n - 1][n - 1]) return -1;
      const dist = Array.from({ length: n }, () => new Array(n).fill(0)); dist[0][0] = 1; const q = [[0, 0]];
      for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; if (x === n - 1 && y === n - 1) return dist[x][y]; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < n && b < n && !g[a][b] && !dist[a][b]) { dist[a][b] = dist[x][y] + 1; q.push([a, b]); } } }
      return -1;
    },
    gen: (r) => { const grid = (n: number, p: number) => { const g = Array.from({ length: n }, () => Array.from({ length: n }, () => (r.next() < p ? 1 : 0))); g[0][0] = 0; g[n - 1][n - 1] = 0; return [g]; }; return [[[[0]]], [[[1]]], grid(5, 0.3), grid(30, 0.35), grid(100, 0.3), grid(100, 0.5)]; },
  },
  "dota2-senate": {
    hints: ["Each senator should ban the next opposing senator who would vote.", "Use two queues of indices, one per party.", "Pop the front of each; the smaller index bans the other and re-queues itself with index + n."],
    brute: { time: "O(n²)", idea: "Simulate rounds, scanning ahead for the next opponent to ban." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Two queues of turn indices." },
    ref: function (s: string) {
      const R: number[] = [], D: number[] = []; for (let i = 0; i < s.length; i++) (s[i] === "R" ? R : D).push(i);
      let a = 0, b = 0; const n = s.length;
      while (a < R.length && b < D.length) { const r = R[a++], d = D[b++]; if (r < d) R.push(r + n); else D.push(d + n); }
      return a < R.length ? "Radiant" : "Dire";
    },
    gen: (r) => [["R"], ["D"], ["DR"], ["DDRRR"], [r.str(20, "RD")], [r.str(10000, "RD")], ["R".repeat(5000) + "D".repeat(5000)]],
  },
  "reveal-cards": {
    hints: ["Work out which positions get revealed in which order.", "Simulate the process on indices 0..n−1 with a queue.", "Assign the sorted values to the positions in the order they'd be revealed."],
    brute: { time: "O(n²)", idea: "Reverse the process with array insertions." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Queue of indices + sorted values." },
    ref: function (deck: number[]) {
      const s = [...deck].sort((a, b) => a - b); const q = deck.map((_, i) => i); const out = new Array(deck.length); let h = 0;
      for (const v of s) { out[q[h++]] = v; if (h < q.length) q.push(q[h++]); }
      return out;
    },
    gen: (r) => [[[5]], [[2, 1]], [r.distinct(10, 1, 100)], [r.distinct(1000, 1, 1000000)]],
  },
  "walls-and-gates": {
    hints: ["Start from the gates, not the rooms.", "All gates at once: multi-source BFS.", "Push every gate, then expand; a room's first visit gives its distance."],
    brute: { time: "O((rc)²)", idea: "BFS from every room to find its nearest gate." },
    optimal: { time: "O(rc)", space: "O(rc)", idea: "Multi-source BFS from all gates." },
    ref: function (rooms: number[][]) {
      const g = rooms.map((row) => [...row]); const R = g.length, C = g[0].length; const q: number[][] = [];
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (g[i][j] === 0) q.push([i, j]);
      for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < R && b < C && g[a][b] === 2147483647) { g[a][b] = g[x][y] + 1; q.push([a, b]); } } }
      return g;
    },
    gen: (r) => { const grid = (R: number, C: number) => [Array.from({ length: R }, () => Array.from({ length: C }, () => { const p = r.next(); return p < 0.05 ? 0 : p < 0.3 ? -1 : 2147483647; }))]; return [[[[0]]], [[[2147483647]]], grid(5, 7), grid(60, 40), grid(250, 250)]; },
  },
  "snakes-and-ladders": {
    hints: ["Convert a square number to (row, col) with the zig-zag rule.", "Each move goes to one of up to six squares (after any snake/ladder).", "BFS over square numbers 1..n²."],
    brute: { time: "Exponential", idea: "DFS over all move sequences." },
    optimal: { time: "O(n²)", space: "O(n²)", idea: "BFS on squares." },
    ref: function (board: number[][]) {
      const n = board.length; const cell = (s: number) => { const q = Math.floor((s - 1) / n), rr = n - 1 - q; const c = q % 2 === 0 ? (s - 1) % n : n - 1 - ((s - 1) % n); return board[rr][c]; };
      const dist = new Array(n * n + 1).fill(-1); dist[1] = 0; const q = [1];
      for (let h = 0; h < q.length; h++) { const s = q[h]; for (let k = 1; k <= 6 && s + k <= n * n; k++) { let t = s + k; const v = cell(t); if (v !== -1) t = v; if (dist[t] === -1) { dist[t] = dist[s] + 1; q.push(t); } } }
      return dist[n * n];
    },
    gen: (r) => {
      const make = (n: number, p: number) => { const N = n * n; const b = Array.from({ length: n }, () => new Array(n).fill(-1)); const at = (s: number) => { const q = Math.floor((s - 1) / n), rr = n - 1 - q; const c = q % 2 === 0 ? (s - 1) % n : n - 1 - ((s - 1) % n); return [rr, c]; }; for (let s = 2; s < N; s++) if (r.next() < p) { const [rr, c] = at(s); b[rr][c] = r.int(1, N); } return [b]; };
      return [[[[-1, -1], [-1, -1]]], [[[-1, 4], [-1, 3]]], make(4, 0.2), make(10, 0.15), make(20, 0.1), make(20, 0.5)];
    },
  },
  "replace-words": {
    hints: ["For each word you need its shortest prefix that's a root.", "A trie of roots finds it while scanning the word.", "Walk each word through the trie; stop at the first node marking the end of a root."],
    brute: { time: "O(words · roots · L)", idea: "Check every root against every word." },
    optimal: { time: "O(total length)", space: "O(dictionary size)", idea: "Trie of roots." },
    ref: function (dict: string[], sentence: string) {
      const roots = new Set(dict);
      return sentence.split(" ").map((w) => { for (let i = 1; i <= w.length; i++) if (roots.has(w.slice(0, i))) return w.slice(0, i); return w; }).join(" ");
    },
    gen: (r) => {
      const dict = Array.from({ length: 200 }, () => r.str(r.int(1, 4), "abcdef"));
      const sentence = Array.from({ length: 2000 }, () => r.str(r.int(1, 10), "abcdefg")).join(" ");
      return [[["a"], "a"], [["ab"], "a ab abc"], [dict, sentence], [["x"], Array.from({ length: 100000 }, () => r.str(r.int(1, 8), "xyz")).join(" ")]];
    },
  },
  "search-suggestions": {
    hints: ["Sorted products with the same prefix are contiguous.", "As the prefix grows, the matching range only shrinks.", "Sort, then for each prefix binary-search the first match and take up to three that still match."],
    brute: { time: "O(L · n · L)", idea: "Filter all products for each prefix, then sort." },
    optimal: { time: "O(n log n + L log n)", space: "O(1) extra", idea: "Sorting + binary search (or a trie storing top-3 per node)." },
    ref: function (products: string[], word: string) {
      const s = [...products].sort(); const out: string[][] = [];
      for (let i = 1; i <= word.length; i++) { const p = word.slice(0, i); out.push(s.filter((x) => x.startsWith(p)).slice(0, 3)); }
      return out;
    },
    gen: (r) => {
      const prods = (n: number) => [...new Set(Array.from({ length: n }, () => r.str(r.int(1, 8), "abcd")))];
      return [[["a"], "a"], [["bags", "baggage", "banner", "box", "cloths"], "bags"], [prods(100), r.str(5, "abcd")], [prods(1000), r.str(30, "abcd")]];
    },
  },
  "longest-word-dictionary": {
    hints: ["A word is buildable if its prefix without the last letter is buildable.", "Process words by length so prefixes come first.", "Sort, keep a set of buildable words; a word is buildable if it has length 1 or its prefix is in the set."],
    brute: { time: "O(n · L²)", idea: "For each word, check all its prefixes in a set." },
    optimal: { time: "O(total length)", space: "O(total length)", idea: "Trie (or sorted processing with a set)." },
    ref: function (words: string[]) {
      const s = [...words].sort(); const ok = new Set<string>([""]); let best = "";
      for (const w of s) if (ok.has(w.slice(0, -1))) { ok.add(w); if (w.length > best.length) best = w; }
      return best;
    },
    gen: (r) => [[["b", "ba", "a"]], [["ab"]], [Array.from({ length: 50 }, () => r.str(r.int(1, 4), "abc"))], [Array.from({ length: 1000 }, () => r.str(r.int(1, 6), "ab"))]],
  },
  "find-all-anagrams": {
    hints: ["Every window has the same length as p.", "Keep letter counts for the current window.", "Slide one step at a time: add the new letter, remove the old one, compare with p's counts."],
    brute: { time: "O(n · m)", idea: "Recount every window." },
    optimal: { time: "O(n)", space: "O(26)", idea: "Fixed-size sliding window with counts." },
    ref: function (s: string, p: string) {
      const out: number[] = []; if (p.length > s.length) return out;
      const need = new Array(26).fill(0); for (const c of p) need[c.charCodeAt(0) - 97]++;
      const have = new Array(26).fill(0); const eq = () => need.every((x, i) => x === have[i]);
      for (let i = 0; i < s.length; i++) { have[s.charCodeAt(i) - 97]++; if (i >= p.length) have[s.charCodeAt(i - p.length) - 97]--; if (i >= p.length - 1 && eq()) out.push(i - p.length + 1); }
      return out;
    },
    gen: (r) => [["a", "ab"], ["aa", "a"], [r.str(100, "ab"), r.str(3, "ab")], [r.str(30000, "abc"), r.str(10, "abc")], [r.str(30000, "abc"), r.str(15000, "abc")]],
  },
  "permutation-in-string": {
    hints: ["Same idea as finding anagrams: a window of length |s1|.", "Compare letter counts.", "Slide the window over s2 and stop as soon as counts match."],
    brute: { time: "O(n · m)", idea: "Recount every window." },
    optimal: { time: "O(n)", space: "O(26)", idea: "Sliding window with counts." },
    ref: function (a: string, b: string) {
      if (a.length > b.length) return false;
      const need = new Array(26).fill(0), have = new Array(26).fill(0); for (const c of a) need[c.charCodeAt(0) - 97]++;
      for (let i = 0; i < b.length; i++) { have[b.charCodeAt(i) - 97]++; if (i >= a.length) have[b.charCodeAt(i - a.length) - 97]--; if (i >= a.length - 1 && need.every((x, j) => x === have[j])) return true; }
      return false;
    },
    gen: (r) => [["a", "a"], ["abc", "ab"], ["adc", "dcda"], [r.str(5, "abc"), r.str(100, "abc")], [r.str(5000, "abcd"), r.str(10000, "abcd")], ["xyz", r.str(10000, "abc")]],
  },
  "find-duplicate-number": {
    hints: ["Treat the array as a linked list: i → nums[i].", "A repeated value means two nodes point to the same node — a cycle.", "Floyd's tortoise and hare finds the cycle entrance, which is the duplicate."],
    brute: { time: "O(n²)", idea: "Compare every pair." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Floyd cycle detection (or binary search on value counts)." },
    ref: function (nums: number[]) { let s = nums[0], f = nums[0]; do { s = nums[s]; f = nums[nums[f]]; } while (s !== f); s = nums[0]; while (s !== f) { s = nums[s]; f = nums[f]; } return s; },
    gen: (r) => {
      const make = (n: number, copies: number) => { const d = r.int(1, n); const base = Array.from({ length: n }, (_, i) => i + 1); const arr = [...base]; for (let k = 0; k < copies; k++) { const j = r.int(0, n - 1); if (arr[j] !== d) arr[j] = d; } arr.push(d); return [r.shuffle(arr)]; };
      return [[[1, 1]], [[2, 2, 2]], make(10, 1), make(1000, 30), make(100000, 1)];
    },
  },
  "sort-colors": {
    hints: ["Three regions: 0s at the front, 2s at the back, 1s in the middle.", "Keep pointers for the next 0 slot and the next 2 slot.", "Dutch national flag: scan with i; swap 0s to low and 2s to high (don't advance i after swapping with high)."],
    brute: { time: "O(n)", idea: "Count each colour and rewrite (two passes)." },
    optimal: { time: "O(n)", space: "O(1)", idea: "One-pass Dutch national flag partition." },
    ref: function (nums: number[]) { return [...nums].sort((a, b) => a - b); },
    gen: (r) => [[[0]], [[2, 2]], [[1, 0]], [r.arr(20, 0, 2)], [r.arr(300, 0, 2)]],
  },
  "next-permutation": {
    hints: ["Find the rightmost position where the sequence increases.", "Swap it with the smallest larger value to its right.", "Then reverse the suffix after that position (it was descending)."],
    brute: { time: "O(n!)", idea: "Generate permutations in order." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Pivot, swap, reverse suffix." },
    ref: function (nums: number[]) {
      const a = [...nums]; let i = a.length - 2; while (i >= 0 && a[i] >= a[i + 1]) i--;
      if (i >= 0) { let j = a.length - 1; while (a[j] <= a[i]) j--; [a[i], a[j]] = [a[j], a[i]]; }
      let l = i + 1, h = a.length - 1; while (l < h) { [a[l], a[h]] = [a[h], a[l]]; l++; h--; }
      return a;
    },
    gen: (r) => [[[1]], [[1, 3, 2]], [[2, 2, 0, 4, 3, 1]], [r.arr(10, 0, 3)], [r.arr(100, 0, 100)], [Array.from({ length: 100 }, (_, i) => 100 - i)]],
  },
  "decode-string": {
    hints: ["Nested brackets suggest a stack.", "On '[' push the current string and the repeat count; on ']' pop and repeat.", "Build digits into a number (k can have several digits)."],
    brute: { time: "O(output)", idea: "Recursive descent parser." },
    optimal: { time: "O(output)", space: "O(depth)", idea: "Two stacks (counts and partial strings)." },
    ref: function (s: string) {
      const counts: number[] = [], strs: string[] = []; let cur = "", k = 0;
      for (const c of s) {
        if (c >= "0" && c <= "9") k = k * 10 + Number(c);
        else if (c === "[") { counts.push(k); strs.push(cur); k = 0; cur = ""; }
        else if (c === "]") cur = strs.pop()! + cur.repeat(counts.pop()!);
        else cur += c;
      }
      return cur;
    },
    gen: () => [["a"], ["10[a]"], ["2[a2[b]c]"], ["abc3[x]y"], ["100[ab]"], ["3[z]2[2[y]pq4[2[jk]e1[f]]]ef"], ["2[2[2[2[2[ab]]]]]"]],
  },
  "asteroid-collision": {
    hints: ["Only a right-moving asteroid followed by a left-moving one can collide.", "Keep the survivors so far on a stack.", "For each left-mover, pop smaller right-movers; handle the equal-size and larger cases."],
    brute: { time: "O(n²)", idea: "Repeatedly scan for an adjacent colliding pair." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Stack simulation." },
    ref: function (a: number[]) {
      const st: number[] = [];
      for (const x of a) {
        let alive = true;
        while (alive && x < 0 && st.length && st[st.length - 1] > 0) { const top = st[st.length - 1]; if (top < -x) st.pop(); else { if (top === -x) st.pop(); alive = false; } }
        if (alive) st.push(x);
      }
      return st;
    },
    gen: (r) => [[[-2, -1, 1, 2]], [[1, -2, -2, -2]], [[-2, 2, -1, -2]], [Array.from({ length: 30 }, () => r.pick([-1, 1]) * r.int(1, 10))], [Array.from({ length: 10000 }, () => r.pick([-1, 1]) * r.int(1, 1000))]],
  },
  "stock-spans": {
    hints: ["A smaller earlier price is covered by any later larger price.", "Keep a stack of (price, span) with decreasing prices.", "For each price, pop all entries with price ≤ it, adding their spans."],
    brute: { time: "O(n²)", idea: "Walk back from each day." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Monotonic stack." },
    ref: function (prices: number[]) { const st: [number, number][] = []; return prices.map((p) => { let span = 1; while (st.length && st[st.length - 1][0] <= p) span += st.pop()![1]; st.push([p, span]); return span; }); },
    gen: (r) => [[[5]], [[1, 2, 3]], [[3, 2, 1]], [r.arr(30, 1, 10)], [r.arr(100000, 1, 100000)]],
  },
  "word-search": {
    hints: ["Try every starting cell.", "Depth-first search letter by letter, marking cells as used.", "Backtrack: unmark the cell when returning; prune as soon as a letter doesn't match."],
    brute: { time: "O(rc · 4^L)", idea: "DFS without pruning." },
    optimal: { time: "O(rc · 3^L)", space: "O(L)", idea: "Backtracking DFS with in-place marking." },
    ref: function (board: string[], word: string) {
      const g = board.map((row) => row.split("")); const R = g.length, C = g[0].length;
      const dfs = (i: number, j: number, k: number): boolean => {
        if (k === word.length) return true;
        if (i < 0 || j < 0 || i >= R || j >= C || g[i][j] !== word[k]) return false;
        const t = g[i][j]; g[i][j] = "#";
        const ok = dfs(i + 1, j, k + 1) || dfs(i - 1, j, k + 1) || dfs(i, j + 1, k + 1) || dfs(i, j - 1, k + 1);
        g[i][j] = t; return ok;
      };
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (dfs(i, j, 0)) return true;
      return false;
    },
    gen: (r) => { const b = Array.from({ length: 6 }, () => r.str(6, "ABC")); return [[["A"], "A"], [["AB"], "BA"], [["AA"], "AAA"], [b, r.str(5, "ABC")], [b, b[0].slice(0, 4) + b[1][3]], [["AAAAAA", "AAAAAA", "AAAAAA", "AAAAAA", "AAAAAA", "AAAAAA"], "AAAAAAAAAAAB"]]; },
  },
  "generate-parentheses": {
    hints: ["Build the string one character at a time.", "You can add '(' while you have some left, and ')' only if it wouldn't close more than you opened.", "Backtrack with counts of open and close parentheses used."],
    brute: { time: "O(2^2n · n)", idea: "Generate all strings of length 2n and filter the valid ones." },
    optimal: { time: "O(Catalan(n) · n)", space: "O(n)", idea: "Backtracking with open/close counts." },
    ref: function (n: number) { const out: string[] = []; const go = (s: string, o: number, c: number) => { if (s.length === 2 * n) { out.push(s); return; } if (o < n) go(s + "(", o + 1, c); if (c < o) go(s + ")", o, c + 1); }; go("", 0, 0); return out; },
    gen: () => [[2], [4], [6], [8]],
  },
  "letter-combinations": {
    hints: ["Each digit multiplies the number of combinations.", "Build combinations digit by digit.", "Backtracking (or iterative expansion) over the letters of each digit."],
    brute: { time: "O(4ⁿ · n)", idea: "Same as optimal — the output itself is that large." },
    optimal: { time: "O(4ⁿ · n)", space: "O(n)", idea: "Backtracking over the keypad map." },
    ref: function (digits: string) {
      if (!digits) return [];
      const m: Record<string, string> = { 2: "abc", 3: "def", 4: "ghi", 5: "jkl", 6: "mno", 7: "pqrs", 8: "tuv", 9: "wxyz" };
      let out = [""]; for (const d of digits) out = out.flatMap((p) => m[d].split("").map((c) => p + c));
      return out;
    },
    gen: () => [["9"], ["79"], ["234"], ["7979"]],
  },
  "perfect-squares": {
    hints: ["dp[i] = fewest squares summing to i.", "dp[i] = 1 + min over squares s ≤ i of dp[i − s].", "Fill dp from 1 to n (Lagrange's four-square theorem bounds the answer by 4)."],
    brute: { time: "Exponential", idea: "Recursive search over squares." },
    optimal: { time: "O(n√n)", space: "O(n)", idea: "DP over amounts (or the four-square theorem in O(√n))." },
    ref: function (n: number) { const dp = new Array(n + 1).fill(Infinity); dp[0] = 0; for (let i = 1; i <= n; i++) for (let s = 1; s * s <= i; s++) dp[i] = Math.min(dp[i], dp[i - s * s] + 1); return dp[n]; },
    gen: (r) => [[1], [2], [7], [43], [9999], [10000], [r.int(1, 10000)]],
  },
  "interleaving-string": {
    hints: ["If lengths don't add up, the answer is false.", "dp[i][j] = can the first i chars of s1 and first j of s2 form the first i + j of s3?", "dp[i][j] = (dp[i−1][j] && s1[i−1] == s3[i+j−1]) || (dp[i][j−1] && s2[j−1] == s3[i+j−1])."],
    brute: { time: "O(2^(m+n))", idea: "Recursively try taking from s1 or s2." },
    optimal: { time: "O(m·n)", space: "O(n)", idea: "2D DP with a rolling row." },
    ref: function (a: string, b: string, c: string) {
      if (a.length + b.length !== c.length) return false;
      const dp = new Array(b.length + 1).fill(false);
      for (let i = 0; i <= a.length; i++) for (let j = 0; j <= b.length; j++) {
        if (i === 0 && j === 0) dp[j] = true;
        else dp[j] = (i > 0 && dp[j] && a[i - 1] === c[i + j - 1]) || (j > 0 && dp[j - 1] && b[j - 1] === c[i + j - 1]);
      }
      return dp[b.length];
    },
    gen: (r) => {
      const weave = (a: string, b: string) => { let i = 0, j = 0, s = ""; while (i < a.length || j < b.length) { if (j >= b.length || (i < a.length && r.next() < 0.5)) s += a[i++]; else s += b[j++]; } return s; };
      const a = r.str(100, "ab"), b = r.str(100, "ab"); const good = weave(a, b); const bad = good.slice(0, 100) + (good[100] === "a" ? "b" : "a") + good.slice(101);
      return [["a", "", "a"], ["", "b", "a"], ["ab", "", "ba"], [a, b, good], [a, b, bad], ["aa", "ab", "aaba"]];
    },
  },
};
