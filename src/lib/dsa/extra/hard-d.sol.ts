import type { Solution } from "../solutions";
import type { Rng } from "../rng";

/** Count of distinct subsequences (used by the generator to keep answers within 32 bits). */
const countDistinct = (s: string, t: string) => { const dp = new Array(t.length + 1).fill(0); dp[0] = 1; for (const c of s) for (let j = t.length; j >= 1; j--) if (t[j - 1] === c) dp[j] += dp[j - 1]; return dp[t.length]; };
const solvedSudoku = (r: Rng) => {
  // A valid grid from the standard pattern, then shuffled by digit relabelling and row/column moves within bands.
  const base = Array.from({ length: 9 }, (_, i) => Array.from({ length: 9 }, (_, j) => ((i * 3 + Math.floor(i / 3) + j) % 9) + 1));
  const digits = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const rows = r.shuffle([0, 1, 2]).flatMap((b) => r.shuffle([0, 1, 2]).map((x) => b * 3 + x));
  const cols = r.shuffle([0, 1, 2]).flatMap((b) => r.shuffle([0, 1, 2]).map((x) => b * 3 + x));
  return rows.map((i) => cols.map((j) => digits[base[i][j] - 1]));
};

export const HARD_D_SOL: Record<string, Solution> = {
  "trapping-rain-water-ii": {
    hints: ["Water at a cell is limited by the lowest wall around the region, not just its neighbours.", "Start from the border: the lowest border cell decides how much its inner neighbours can hold.", "Min-heap of boundary cells; pop the lowest, fill each unvisited neighbour up to that height, push it with max(height, its own)."],
    brute: { time: "O((rc)²)", idea: "For each cell, flood-fill to find the lowest escape height." },
    optimal: { time: "O(rc log(rc))", space: "O(rc)", idea: "Priority-queue BFS from the boundary inward." },
    ref: function (h: number[][]) {
      const R = h.length, C = h[0].length; if (R < 3 || C < 3) return 0;
      const heap: number[][] = [];
      const push = (x: number[]) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
      const seen = Array.from({ length: R }, () => new Array(C).fill(false));
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (i === 0 || j === 0 || i === R - 1 || j === C - 1) { seen[i][j] = true; push([h[i][j], i, j]); }
      let water = 0;
      while (heap.length) { const [ht, x, y] = pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= R || b >= C || seen[a][b]) continue; seen[a][b] = true; water += Math.max(0, ht - h[a][b]); push([Math.max(ht, h[a][b]), a, b]); } }
      return water;
    },
    gen: (r) => [[[[5]]], [[[1, 2], [3, 4]]], [[[5, 5, 5], [5, 1, 5], [5, 5, 5]]], [Array.from({ length: 10 }, () => r.arr(12, 0, 20))], [Array.from({ length: 100 }, () => r.arr(100, 0, 20000))], [Array.from({ length: 200 }, () => r.arr(200, 0, 100))]],
  },
  "word-search-ii": {
    hints: ["Searching each word separately repeats the same board walks.", "Put all words in a trie and walk the board once per start cell.", "DFS from every cell following trie edges; record a word when you reach its end node, and prune finished branches."],
    brute: { time: "O(words · rc · 4^L)", idea: "Run Word Search for every word." },
    optimal: { time: "O(rc · 4 · 3^(L−1))", space: "O(total word length)", idea: "Trie + backtracking DFS over the board." },
    ref: function (board: string[], words: string[]) {
      type Node = { next: Record<string, Node>; word?: string };
      const root: Node = { next: {} };
      for (const w of words) { let n = root; for (const c of w) n = n.next[c] ??= { next: {} }; n.word = w; }
      const g = board.map((row) => row.split("")); const R = g.length, C = g[0].length; const found: string[] = [];
      const dfs = (i: number, j: number, node: Node) => {
        const c = g[i][j]; const nx = node.next[c]; if (!nx) return;
        if (nx.word) { found.push(nx.word); nx.word = undefined; }
        g[i][j] = "#";
        for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) if (a >= 0 && b >= 0 && a < R && b < C && g[a][b] !== "#") dfs(a, b, nx);
        g[i][j] = c;
      };
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) dfs(i, j, root);
      return found;
    },
    gen: (r) => {
      const board = Array.from({ length: 12 }, () => r.str(12, "abcde"));
      const fromBoard = () => { let i = r.int(0, 11), j = r.int(0, 11); let w = board[i][j]; const len = r.int(1, 8); for (let k = 1; k < len; k++) { const d = r.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); const a = i + d[0], b = j + d[1]; if (a < 0 || b < 0 || a > 11 || b > 11) break; i = a; j = b; w += board[i][j]; } return w; };
      const words = [...new Set([...Array.from({ length: 300 }, fromBoard), ...Array.from({ length: 300 }, () => r.str(r.int(2, 7), "abcde"))])];
      return [[["a"], ["a"]], [["a"], ["b"]], [["aa"], ["aaa"]], [["ab", "cd"], ["ab", "ac", "abdc", "dcba", "ad"]], [board, words]];
    },
  },
  "alien-dictionary": {
    hints: ["Compare each pair of adjacent words: their first differing letter gives an ordering rule.", "If a longer word comes before its own prefix, no order works.", "Build the letter graph from those rules and topologically sort it (Kahn's algorithm); a cycle means no valid order."],
    brute: { time: "O(26!)", idea: "Try every ordering of the letters." },
    optimal: { time: "O(total length)", space: "O(26²)", idea: "Pairwise rules + topological sort." },
    ref: function (words: string[]) {
      const letters = new Set(words.join(""));
      const adj = new Map<string, Set<string>>(); for (const c of letters) adj.set(c, new Set());
      for (let i = 0; i + 1 < words.length; i++) {
        const a = words[i], b = words[i + 1]; let k = 0;
        while (k < a.length && k < b.length && a[k] === b[k]) k++;
        if (k === Math.min(a.length, b.length)) { if (a.length > b.length) return ""; continue; }
        adj.get(a[k])!.add(b[k]);
      }
      const indeg = new Map<string, number>(); for (const c of letters) indeg.set(c, 0);
      for (const vs of adj.values()) for (const v of vs) indeg.set(v, indeg.get(v)! + 1);
      const q = [...letters].filter((c) => indeg.get(c) === 0).sort(); let out = "";
      for (let h = 0; h < q.length; h++) { const u = q[h]; out += u; for (const v of [...adj.get(u)!].sort()) { indeg.set(v, indeg.get(v)! - 1); if (indeg.get(v) === 0) q.push(v); } }
      return out.length === letters.size ? out : "";
    },
    gen: (r) => {
      const sortedBy = (alpha: string, n: number, len: number) => { const rank = (w: string) => w.split("").map((c) => alpha.indexOf(c)); const ws = [...new Set(Array.from({ length: n }, () => r.str(r.int(1, len), alpha)))]; return ws.sort((x, y) => { const a = rank(x), b = rank(y); for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length; }); };
      const alpha = r.shuffle("abcdefghij".split("")).join("");
      return [[["a"]], [["ab", "adc"]], [["abc", "ab"]], [["a", "b", "ca", "cc"]], [sortedBy(alpha, 30, 4)], [sortedBy(r.shuffle("abcdefghijklmnopqrstuvwxyz".split("")).join(""), 100, 6)], [["ac", "ab", "zc", "zb"]]];
    },
  },
  "longest-increasing-path": {
    hints: ["The path can't revisit a cell (values strictly increase), so there are no cycles.", "The best path from a cell depends only on its larger neighbours.", "Memoised DFS: len(cell) = 1 + max len(larger neighbour). Or process cells from largest value to smallest."],
    brute: { time: "Exponential", idea: "Plain DFS from every cell without memoisation." },
    optimal: { time: "O(rc log(rc))", space: "O(rc)", idea: "Memoised DFS (O(rc)) or sort cells by value and do DP." },
    ref: function (m: number[][]) {
      const R = m.length, C = m[0].length; const cells: number[][] = [];
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) cells.push([m[i][j], i, j]);
      cells.sort((a, b) => b[0] - a[0]);
      const dp = Array.from({ length: R }, () => new Array(C).fill(1)); let best = 1;
      for (const [v, i, j] of cells) { for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) if (a >= 0 && b >= 0 && a < R && b < C && m[a][b] > v) dp[i][j] = Math.max(dp[i][j], dp[a][b] + 1); best = Math.max(best, dp[i][j]); }
      return best;
    },
    gen: (r) => {
      const snake = (R: number, C: number) => { const m = Array.from({ length: R }, () => new Array(C).fill(0)); let k = 0; for (let i = 0; i < R; i++) for (let jj = 0; jj < C; jj++) { const j = i % 2 === 0 ? jj : C - 1 - jj; m[i][j] = k++; } return m; };
      return [[[[1, 2]]], [[[7, 7], [7, 7]]], [Array.from({ length: 8 }, () => r.arr(8, 0, 10))], [Array.from({ length: 100 }, () => r.arr(100, 0, 2147483647))], [snake(60, 60)]];
    },
  },
  "regex-matching": {
    hints: ["A `*` can match zero copies (skip the pair) or one more copy (if the current char matches).", "dp[i][j] = does s[i..] match p[j..]?", "If p[j+1] == '*': dp[i][j] = dp[i][j+2] || (match(i, j) && dp[i+1][j]); else dp[i][j] = match(i, j) && dp[i+1][j+1]."],
    brute: { time: "Exponential", idea: "Plain recursion on both choices for every star." },
    optimal: { time: "O(m·n)", space: "O(m·n)", idea: "DP over suffixes (or memoised recursion)." },
    ref: function (s: string, p: string) {
      const m = s.length, n = p.length; const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false)); dp[m][n] = true;
      for (let i = m; i >= 0; i--) for (let j = n - 1; j >= 0; j--) {
        const first = i < m && (p[j] === s[i] || p[j] === ".");
        dp[i][j] = j + 1 < n && p[j + 1] === "*" ? dp[i][j + 2] || (first && dp[i + 1][j]) : first && dp[i + 1][j + 1];
      }
      return dp[0][0];
    },
    gen: (r) => {
      const pat = () => { let p = ""; const len = r.int(1, 8); for (let k = 0; k < len; k++) { p += r.pick(["a", "b", "."]); if (r.next() < 0.4) p += "*"; } return p; };
      return [["a", "ab*"], ["aab", "c*a*b"], ["mississippi", "mis*is*p*."], ["aaa", "a*a"], ["aaaaaaaaaaaaaaaaaaab", "a*a*a*a*a*a*a*a*a*c"], ...Array.from({ length: 12 }, () => [r.str(r.int(1, 12), "ab"), pat()])];
    },
  },
  "wildcard-matching": {
    hints: ["`*` can absorb any number of characters.", "dp[i][j] = does s[..i] match p[..j]?", "p[j−1] == '*': dp[i][j] = dp[i][j−1] || dp[i−1][j]; else dp[i][j] = dp[i−1][j−1] && (p[j−1] == '?' || p[j−1] == s[i−1])."],
    brute: { time: "Exponential", idea: "Recursive backtracking on each star." },
    optimal: { time: "O(m·n)", space: "O(n)", idea: "DP with a rolling row (or the greedy backtrack-to-last-star method)." },
    ref: function (s: string, p: string) {
      let prev = new Array(p.length + 1).fill(false); prev[0] = true;
      for (let j = 1; j <= p.length; j++) prev[j] = prev[j - 1] && p[j - 1] === "*";
      for (let i = 1; i <= s.length; i++) {
        const cur = new Array(p.length + 1).fill(false);
        for (let j = 1; j <= p.length; j++) cur[j] = p[j - 1] === "*" ? cur[j - 1] || prev[j] : prev[j - 1] && (p[j - 1] === "?" || p[j - 1] === s[i - 1]);
        prev = cur;
      }
      return prev[p.length];
    },
    gen: (r) => {
      const pat = (n: number) => Array.from({ length: n }, () => r.pick(["a", "b", "?", "*", "a", "b"])).join("");
      return [["", ""], ["", "*"], ["a", ""], ["adceb", "*a*b"], ["acdcb", "a*c?b"], [r.str(2000, "ab"), "*" + r.str(5, "ab") + "*"], [r.str(2000, "a"), "*".repeat(1000) + "b"], ...Array.from({ length: 10 }, () => [r.str(r.int(0, 15), "ab"), pat(r.int(0, 8))])];
    },
  },
  "burst-balloons": {
    hints: ["Think about which balloon is burst LAST in a range.", "If k is the last in (i, j), its neighbours at that moment are i and j.", "dp[i][j] = max over k of dp[i][k] + dp[k][j] + v[i]·v[k]·v[j], with 1s padded at both ends."],
    brute: { time: "O(n!)", idea: "Try every bursting order." },
    optimal: { time: "O(n³)", space: "O(n²)", idea: "Interval DP on the last balloon burst." },
    ref: function (nums: number[]) {
      const v = [1, ...nums, 1]; const n = v.length; const dp = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let len = 2; len < n; len++) for (let i = 0; i + len < n; i++) { const j = i + len; for (let k = i + 1; k < j; k++) dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k][j] + v[i] * v[k] * v[j]); }
      return dp[0][n - 1];
    },
    gen: (r) => [[[0]], [[7]], [[9, 76, 64, 21]], [r.arr(10, 0, 100)], [r.arr(100, 0, 100)], [r.arr(300, 0, 100)]],
  },
  "distinct-subsequences": {
    hints: ["Each character of s either helps match the next character of t or is skipped.", "dp[j] = ways to form t[..j] from the prefix of s seen so far.", "For each char c of s, for j from |t| down to 1: if t[j−1] == c, dp[j] += dp[j−1]."],
    brute: { time: "O(2ⁿ)", idea: "Enumerate subsequences of s." },
    optimal: { time: "O(|s|·|t|)", space: "O(|t|)", idea: "1D DP iterating j downward." },
    ref: function (s: string, t: string) { const dp = new Array(t.length + 1).fill(0); dp[0] = 1; for (const c of s) for (let j = t.length; j >= 1; j--) if (t[j - 1] === c) dp[j] += dp[j - 1]; return dp[t.length]; },
    gen: (r) => {
      const ok = (s: string, t: string) => countDistinct(s, t) <= 2147483647;
      const pick = (sl: number, tl: number, alpha: string) => { for (;;) { const s = r.str(sl, alpha), t = r.str(tl, alpha); if (ok(s, t)) return [s, t]; } };
      return [["a", "b"], ["a", "a"], ["aaa", "aaaa"], pick(30, 4, "ab"), pick(1000, 3, "abcdefghij"), pick(1000, 1000, "ab"), pick(200, 12, "abcdefghijklmnopqrstuvwxyz")];
    },
  },
  "longest-valid-parentheses": {
    hints: ["Track where the last unmatched ')' was.", "A stack of indices: push '(' positions; a ')' pops a match.", "Start the stack with −1; on ')' pop, and if the stack is empty push i, else the length is i − top."],
    brute: { time: "O(n³)", idea: "Check every substring." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Stack of indices (or a two-pass counter in O(1) space)." },
    ref: function (s: string) { const st = [-1]; let best = 0; for (let i = 0; i < s.length; i++) { if (s[i] === "(") st.push(i); else { st.pop(); if (!st.length) st.push(i); else best = Math.max(best, i - st[st.length - 1]); } } return best; },
    gen: (r) => [["("], [")"], ["()(()"], ["()(())"], [r.str(40, "()")], [r.str(30000, "()")], ["(".repeat(15000) + ")".repeat(15000)]],
  },
  "maximal-rectangle": {
    hints: ["Treat each row as the base of a histogram.", "Heights grow by 1 for each consecutive '1' above (reset on '0').", "For every row, run 'largest rectangle in histogram' with a monotonic stack."],
    brute: { time: "O((rc)²)", idea: "Try every rectangle corner pair." },
    optimal: { time: "O(rc)", space: "O(c)", idea: "Histogram per row + monotonic stack." },
    ref: function (rows: string[]) {
      const C = rows[0].length; const h = new Array(C).fill(0); let best = 0;
      for (const row of rows) {
        for (let j = 0; j < C; j++) h[j] = row[j] === "1" ? h[j] + 1 : 0;
        const st: number[] = [];
        for (let j = 0; j <= C; j++) { const cur = j === C ? 0 : h[j]; while (st.length && h[st[st.length - 1]] >= cur) { const top = st.pop()!; const left = st.length ? st[st.length - 1] : -1; best = Math.max(best, h[top] * (j - left - 1)); } st.push(j); }
      }
      return best;
    },
    gen: (r) => [[["0", "1"]], [["11", "11"]], [Array.from({ length: 6 }, () => r.str(8, "011"))], [Array.from({ length: 200 }, () => r.str(200, "0111"))], [Array.from({ length: 200 }, () => "1".repeat(200))]],
  },
  "basic-calculator": {
    hints: ["Without parentheses, keep a running result and the current sign.", "On '(', save the result and sign; on ')', combine.", "A stack of (result, sign) pairs handles nesting; unary minus is just a sign before a number or '('."],
    brute: { time: "O(n²)", idea: "Repeatedly evaluate the innermost parentheses and rewrite the string." },
    optimal: { time: "O(n)", space: "O(depth)", idea: "One pass with a stack of saved results and signs." },
    ref: function (s: string) {
      let res = 0, sign = 1, num = 0; const st: number[] = [];
      for (const c of s) {
        if (c >= "0" && c <= "9") num = num * 10 + (c.charCodeAt(0) - 48);
        else if (c === "+" || c === "-") { res += sign * num; num = 0; sign = c === "+" ? 1 : -1; }
        else if (c === "(") { st.push(res, sign); res = 0; sign = 1; }
        else if (c === ")") { res += sign * num; num = 0; const sg = st.pop()!, prev = st.pop()!; res = prev + sg * res; }
      }
      return res + sign * num;
    },
    gen: (r) => {
      const expr = (d: number): string => { if (d === 0 || r.next() < 0.3) return String(r.int(0, 1000)); const parts = Array.from({ length: r.int(2, 4) }, () => (r.next() < 0.3 ? `(${expr(d - 1)})` : expr(d - 1))); return (r.next() < 0.2 ? "-" : "") + parts.map((p, i) => (i ? r.pick([" + ", "-", " - "]) : "") + p).join(""); };
      return [["0"], ["-(2+3)"], ["- (3 + (4 + 5))"], ["2147483647"], ["1-(     -2)"], [expr(3)], [expr(5)], [Array.from({ length: 20000 }, () => String(r.int(0, 9))).join("+")]];
    },
  },
  "n-queens-ii": {
    hints: ["Place one queen per row.", "A column and both diagonals (r − c and r + c) must be free.", "Backtrack row by row with three sets (or bitmasks)."],
    brute: { time: "O(nⁿ)", idea: "Try every column for every row, check at the end." },
    optimal: { time: "O(n!)", space: "O(n)", idea: "Backtracking with column/diagonal sets." },
    ref: function (n: number) { let c = 0; const cols = new Set<number>(), d1 = new Set<number>(), d2 = new Set<number>(); const go = (r: number) => { if (r === n) { c++; return; } for (let j = 0; j < n; j++) { if (cols.has(j) || d1.has(r - j) || d2.has(r + j)) continue; cols.add(j); d1.add(r - j); d2.add(r + j); go(r + 1); cols.delete(j); d1.delete(r - j); d2.delete(r + j); } }; go(0); return c; },
    gen: () => [[2], [3], [5], [6], [8], [10]],
  },
  "n-queens": {
    hints: ["Same search as counting solutions, but record the boards.", "Keep the column of the queen in each row.", "When all rows are filled, build strings with 'Q' at the chosen column."],
    brute: { time: "O(nⁿ)", idea: "Try every placement and filter." },
    optimal: { time: "O(n!·n)", space: "O(n)", idea: "Backtracking with column/diagonal sets." },
    ref: function (n: number) {
      const out: string[][] = []; const pos: number[] = []; const cols = new Set<number>(), d1 = new Set<number>(), d2 = new Set<number>();
      const go = (r: number) => { if (r === n) { out.push(pos.map((j) => ".".repeat(j) + "Q" + ".".repeat(n - j - 1))); return; } for (let j = 0; j < n; j++) { if (cols.has(j) || d1.has(r - j) || d2.has(r + j)) continue; cols.add(j); d1.add(r - j); d2.add(r + j); pos.push(j); go(r + 1); pos.pop(); cols.delete(j); d1.delete(r - j); d2.delete(r + j); } };
      go(0); return out;
    },
    gen: () => [[2], [3], [5], [6], [8]],
  },
  "sudoku-solver": {
    hints: ["Find an empty cell and try each digit allowed by its row, column and box.", "Backtrack when a cell has no valid digit.", "Speed-up: always fill the empty cell with the fewest candidates first."],
    brute: { time: "O(9^81)", idea: "Try every digit everywhere and check at the end." },
    optimal: { time: "Exponential worst case, fast in practice", space: "O(81)", idea: "Backtracking with row/column/box sets and most-constrained-cell ordering." },
    ref: function (board: string[]) {
      const g = board.map((r) => r.split(""));
      const ok = (i: number, j: number, c: string) => { for (let k = 0; k < 9; k++) { if (g[i][k] === c || g[k][j] === c) return false; const bi = 3 * Math.floor(i / 3) + Math.floor(k / 3), bj = 3 * Math.floor(j / 3) + (k % 3); if (g[bi][bj] === c) return false; } return true; };
      const solve = (): boolean => {
        let bi = -1, bj = -1, best: string[] | null = null;
        for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (g[i][j] === ".") { const cand = "123456789".split("").filter((c) => ok(i, j, c)); if (!best || cand.length < best.length) { best = cand; bi = i; bj = j; } }
        if (!best) return true;
        for (const c of best) { g[bi][bj] = c; if (solve()) return true; }
        g[bi][bj] = "."; return false;
      };
      solve(); return g.map((r) => r.join(""));
    },
    gen: (r) => [0, 20, 40, 50, 55].map((holes) => { const g = solvedSudoku(r); const cells = r.shuffle(Array.from({ length: 81 }, (_, i) => i)).slice(0, holes); const rows = g.map((row) => row.map(String)); for (const c of cells) rows[Math.floor(c / 9)][c % 9] = "."; return [rows.map((row) => row.join(""))]; }),
  },
  "first-missing-positive": {
    hints: ["The answer is in 1..n+1.", "Use the array itself as a hash: put value v at index v − 1.", "Cyclic placement: swap nums[i] to its slot while it's in range and not already there; then the first i with nums[i] ≠ i + 1 gives i + 1."],
    brute: { time: "O(n log n)", idea: "Sort and scan, or a hash set (O(n) space)." },
    optimal: { time: "O(n)", space: "O(1)", idea: "In-place cyclic sort." },
    ref: function (nums: number[]) { const s = new Set(nums); let k = 1; while (s.has(k)) k++; return k; },
    gen: (r) => [[[1]], [[2]], [[-2147483648, 2147483647]], [r.shuffle(Array.from({ length: 1000 }, (_, i) => i + 1))], [r.arr(1000, -5, 50)], [r.shuffle([...Array.from({ length: 99999 }, (_, i) => i + 2), 1].filter((x) => x !== 54321))]],
  },
  "max-points-on-line": {
    hints: ["Fix one point and look at the slopes to every other point.", "Points with the same slope from the anchor are on one line.", "Represent slopes exactly as reduced (dy, dx) pairs with a normalised sign; count with a hash map."],
    brute: { time: "O(n³)", idea: "For every pair, count points on their line." },
    optimal: { time: "O(n²)", space: "O(n)", idea: "Slope counting per anchor with gcd-reduced pairs." },
    ref: function (pts: number[][]) {
      if (pts.length <= 2) return pts.length;
      const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b)); let best = 0;
      for (let i = 0; i < pts.length; i++) {
        const m = new Map<string, number>();
        for (let j = i + 1; j < pts.length; j++) { let dy = pts[j][1] - pts[i][1], dx = pts[j][0] - pts[i][0]; const g = gcd(dy, dx); dy /= g; dx /= g; if (dx < 0 || (dx === 0 && dy < 0)) { dx = -dx; dy = -dy; } const k = `${dy}/${dx}`; m.set(k, (m.get(k) ?? 0) + 1); best = Math.max(best, m.get(k)! + 1); }
      }
      return best;
    },
    gen: (r) => {
      const distinct = (pts: number[][]) => [...new Map(pts.map((p) => [p.join(","), p])).values()];
      const line = Array.from({ length: 40 }, (_, k) => [k * 3 - 50, k * 7 + 2]);
      return [[[[0, 0]]], [[[0, 0], [1, 1]]], [[[0, 0], [0, 1], [0, 2], [1, 0]]], [distinct(Array.from({ length: 30 }, () => [r.int(-3, 3), r.int(-3, 3)]))], [distinct([...line, ...Array.from({ length: 260 }, () => [r.int(-10000, 10000), r.int(-10000, 10000)])])]];
    },
  },
  "count-smaller-after-self": {
    hints: ["Process from right to left, keeping the values seen so far.", "You need 'how many seen values are < x' quickly.", "A Fenwick tree over compressed values (or merge sort counting) gives O(log n) per query."],
    brute: { time: "O(n²)", idea: "For each i, scan everything to its right." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Binary indexed tree from the right (or merge sort with index tracking)." },
    ref: function (nums: number[]) {
      const off = 10001, N = 20003; const bit = new Array(N + 1).fill(0); const out = new Array(nums.length);
      for (let i = nums.length - 1; i >= 0; i--) { let k = nums[i] + off - 1, s = 0; while (k > 0) { s += bit[k]; k -= k & -k; } out[i] = s; k = nums[i] + off; while (k <= N) { bit[k]++; k += k & -k; } }
      return out;
    },
    gen: (r) => [[[1, 1, 1]], [[3, 2, 1]], [r.arr(30, -10, 10)], [r.arr(100000, -10000, 10000)]],
  },
  "reverse-pairs": {
    hints: ["Counting pairs across halves is easy when both halves are sorted.", "Merge sort: before merging, count pairs (i in left, j in right) with left[i] > 2·right[j].", "Use 64-bit arithmetic for 2·nums[j]."],
    brute: { time: "O(n²)", idea: "Check every pair." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Merge sort with a two-pointer count step." },
    ref: function (nums: number[]) {
      const a = [...nums]; let count = 0;
      const sort = (lo: number, hi: number) => {
        if (hi - lo <= 1) return;
        const mid = (lo + hi) >> 1; sort(lo, mid); sort(mid, hi);
        let j = mid; for (let i = lo; i < mid; i++) { while (j < hi && a[i] > 2 * a[j]) j++; count += j - mid; }
        const merged: number[] = []; let p = lo, q = mid; while (p < mid || q < hi) merged.push(q >= hi || (p < mid && a[p] <= a[q]) ? a[p++] : a[q++]);
        for (let k = 0; k < merged.length; k++) a[lo + k] = merged[k];
      };
      sort(0, a.length); return count;
    },
    gen: (r) => [[[1]], [[2147483647, 2147483647, -2147483648, -2147483648]], [r.arr(30, -10, 10)], [r.arr(50000, -2147483648, 2147483647)]],
  },
  "min-refueling-stops": {
    hints: ["You don't have to decide at a station — you can 'retroactively' refuel at the best station you've passed.", "When you can't reach the next point, take the biggest fuel you've skipped.", "Max-heap of passed stations' fuel; pop when needed and count stops; −1 if the heap is empty."],
    brute: { time: "O(n²)", idea: "DP: farthest distance reachable with k stops." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Greedy with a max-heap." },
    ref: function (target: number, fuel: number, st: number[][]) {
      const passed: number[] = []; let stops = 0, i = 0;
      while (fuel < target) {
        while (i < st.length && st[i][0] <= fuel) passed.push(st[i++][1]);
        if (!passed.length) return -1;
        let bi = 0; for (let k = 1; k < passed.length; k++) if (passed[k] > passed[bi]) bi = k;
        fuel += passed[bi]; passed.splice(bi, 1); stops++;
      }
      return stops;
    },
    gen: (r) => {
      const make = (n: number, target: number) => { const pos = r.distinct(n, 1, target - 1).sort((a, b) => a - b); return [target, r.int(1, Math.max(1, Math.floor(target / n) * 2)), pos.map((p) => [p, r.int(1, Math.floor(target / n) * 2)])]; };
      return [[10, 10, []], [100, 50, [[50, 50]]], [1000, 1, [[1, 1]]], make(10, 1000), make(500, 1000000), make(500, 1000000000)];
    },
  },
  "ipo": {
    hints: ["Among the projects you can afford, which one should you do next?", "Always the most profitable affordable one — capital only grows.", "Sort projects by capital; as w grows push newly affordable profits into a max-heap; pop k times."],
    brute: { time: "O(k·n)", idea: "Scan all projects k times for the best affordable one." },
    optimal: { time: "O(n log n + k log n)", space: "O(n)", idea: "Sort by capital + max-heap of profits." },
    ref: function (k: number, w: number, profits: number[], capital: number[]) {
      const idx = profits.map((_, i) => i).sort((a, b) => capital[a] - capital[b]);
      const heap: number[] = [];
      const push = (x: number) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p] >= heap[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l] > heap[m]) m = l; if (r < heap.length && heap[r] > heap[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
      let j = 0;
      for (let t = 0; t < k; t++) { while (j < idx.length && capital[idx[j]] <= w) push(profits[idx[j++]]); if (!heap.length) break; w += pop(); }
      return w;
    },
    gen: (r) => [[1, 0, [1], [1]], [10, 5, [3, 4], [5, 100]], [5, 0, r.arr(20, 0, 50), r.arr(20, 0, 100)], [100000, 0, r.arr(100000, 0, 10000), r.arr(100000, 0, 1000000)], [3, 1000000000, [1, 2, 3], [0, 0, 0]]],
  },
  "swim-in-rising-water": {
    hints: ["You need the path whose highest cell is as low as possible.", "That's a minimax path: Dijkstra where the cost is the max elevation so far.", "Or binary search t and check reachability with BFS over cells ≤ t."],
    brute: { time: "O(n⁴)", idea: "For each t from 0 upward, BFS to check reachability." },
    optimal: { time: "O(n² log n)", space: "O(n²)", idea: "Dijkstra/heap on max-so-far, or binary search + BFS." },
    ref: function (g: number[][]) {
      const n = g.length;
      const can = (t: number) => { if (g[0][0] > t) return false; const seen = Array.from({ length: n }, () => new Array(n).fill(false)); seen[0][0] = true; const q = [[0, 0]]; for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; if (x === n - 1 && y === n - 1) return true; for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (a >= 0 && b >= 0 && a < n && b < n && !seen[a][b] && g[a][b] <= t) { seen[a][b] = true; q.push([a, b]); } } return false; };
      let lo = 0, hi = n * n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (can(m)) hi = m; else lo = m + 1; } return lo;
    },
    gen: (r) => { const perm = (n: number) => { const v = r.shuffle(Array.from({ length: n * n }, (_, i) => i)); return [Array.from({ length: n }, (_, i) => v.slice(i * n, i * n + n))]; }; return [[[[0]]], perm(2), perm(5), perm(20), perm(50)]; },
  },
  "bus-routes": {
    hints: ["The cost is the number of buses, not stops.", "BFS where each level is 'one more bus'.", "Map stop → routes; BFS over routes starting from all routes through source; mark routes and stops as used."],
    brute: { time: "O(R² · L)", idea: "Build a route-to-route graph by intersecting every pair of routes, then BFS." },
    optimal: { time: "O(total stops)", space: "O(total stops)", idea: "BFS over routes using a stop → routes index." },
    ref: function (routes: number[][], source: number, target: number) {
      if (source === target) return 0;
      const byStop = new Map<number, number[]>(); routes.forEach((rt, i) => rt.forEach((s) => { if (!byStop.has(s)) byStop.set(s, []); byStop.get(s)!.push(i); }));
      const usedRoute = new Array(routes.length).fill(false); const usedStop = new Set<number>([source]);
      let level = (byStop.get(source) ?? []).filter((i) => !usedRoute[i] && (usedRoute[i] = true)); let buses = 1;
      while (level.length) {
        const next: number[] = [];
        for (const i of level) for (const s of routes[i]) { if (s === target) return buses; if (usedStop.has(s)) continue; usedStop.add(s); for (const j of byStop.get(s) ?? []) if (!usedRoute[j]) { usedRoute[j] = true; next.push(j); } }
        level = next; buses++;
      }
      return -1;
    },
    gen: (r) => {
      const make = (R: number, L: number, span: number) => { const routes = Array.from({ length: R }, () => [...new Set(r.arr(r.int(1, L), 0, span))]); const all = routes.flat(); return [routes, r.pick(all), r.pick(all)]; };
      return [[[[1, 7], [3, 5]], 5, 5], [[[1, 2, 3]], 1, 9], make(10, 5, 30), make(100, 20, 1000), make(500, 200, 100000)];
    },
  },
  "sliding-puzzle": {
    hints: ["There are only 6! = 720 board states.", "Each move is an edge between states.", "BFS from the start state (encoded as a string) to \"123450\"."],
    brute: { time: "O(720)", idea: "Same BFS — the state space is tiny." },
    optimal: { time: "O(720 · 3)", space: "O(720)", idea: "BFS over board strings with a neighbour table." },
    ref: function (board: number[][]) {
      const start = board.flat().join(""); const goal = "123450"; const nb = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [1, 3, 5], [2, 4]];
      const dist = new Map<string, number>([[start, 0]]); const q = [start];
      for (let h = 0; h < q.length; h++) { const s = q[h]; if (s === goal) return dist.get(s)!; const z = s.indexOf("0"); for (const k of nb[z]) { const a = s.split(""); [a[z], a[k]] = [a[k], a[z]]; const t = a.join(""); if (!dist.has(t)) { dist.set(t, dist.get(s)! + 1); q.push(t); } } }
      return -1;
    },
    gen: (r) => [[[[1, 2, 3], [4, 5, 0]]], [[[3, 2, 4], [1, 5, 0]]], [[[0, 1, 2], [3, 4, 5]]], ...Array.from({ length: 6 }, () => { const v = r.shuffle([0, 1, 2, 3, 4, 5]); return [[v.slice(0, 3), v.slice(3)]]; })],
  },
  "shortest-path-all-nodes": {
    hints: ["The state must include which nodes have been visited.", "State = (current node, visited bitmask); there are n · 2ⁿ states.", "Multi-source BFS starting from every (i, 1 << i); stop when the mask is all ones."],
    brute: { time: "O(n! · n)", idea: "Try every visiting order with shortest paths between them." },
    optimal: { time: "O(n² · 2ⁿ)", space: "O(n · 2ⁿ)", idea: "BFS over (node, mask) states." },
    ref: function (graph: number[][]) {
      const n = graph.length; const full = (1 << n) - 1; if (n === 1) return 0;
      const seen = Array.from({ length: n }, () => new Uint8Array(1 << n)); let level: number[][] = [];
      for (let i = 0; i < n; i++) { level.push([i, 1 << i]); seen[i][1 << i] = 1; }
      for (let d = 0; level.length; d++) { const next: number[][] = []; for (const [u, m] of level) { if (m === full) return d; for (const v of graph[u]) { const nm = m | (1 << v); if (!seen[v][nm]) { seen[v][nm] = 1; next.push([v, nm]); } } } level = next; }
      return -1;
    },
    gen: (r) => {
      const conn = (n: number, extra: number) => { const adj: Set<number>[] = Array.from({ length: n }, () => new Set()); for (let i = 1; i < n; i++) { const p = r.int(0, i - 1); adj[i].add(p); adj[p].add(i); } for (let k = 0; k < extra; k++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a !== b) { adj[a].add(b); adj[b].add(a); } } return [adj.map((s) => [...s].sort((x, y) => x - y))]; };
      return [[[[]]], [[[1], [0]]], conn(5, 2), conn(8, 4), conn(12, 0), conn(12, 10)];
    },
  },
  "number-of-islands-ii": {
    hints: ["Rebuilding the islands after every addition is too slow.", "Each new land cell starts as its own island, then merges with neighbours.", "Union-find on cell ids: +1 for a new cell, −1 for every successful union; ignore repeated positions."],
    brute: { time: "O(k · m · n)", idea: "Count islands with BFS after each addition." },
    optimal: { time: "O(k α(mn))", space: "O(mn)", idea: "Union-find with a running component count." },
    ref: function (m: number, n: number, positions: number[][]) {
      const parent = new Int32Array(m * n).fill(-1); let count = 0; const out: number[] = [];
      const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      for (const [r, c] of positions) {
        const id = r * n + c;
        if (parent[id] === -1) {
          parent[id] = id; count++;
          for (const [a, b] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) { if (a < 0 || b < 0 || a >= m || b >= n || parent[a * n + b] === -1) continue; const x = find(id), y = find(a * n + b); if (x !== y) { parent[x] = y; count--; } }
        }
        out.push(count);
      }
      return out;
    },
    gen: (r) => [[2, 2, [[0, 0], [1, 1], [0, 1]]], [1, 2, [[0, 1], [0, 1], [0, 0]]], [5, 5, Array.from({ length: 20 }, () => [r.int(0, 4), r.int(0, 4)])], [100, 1000, Array.from({ length: 10000 }, () => [r.int(0, 99), r.int(0, 999)])], [300, 300, Array.from({ length: 10000 }, () => [r.int(0, 29), r.int(0, 29)])]],
  },
  "critical-connections": {
    hints: ["A connection is critical if it's not on any cycle (a bridge).", "DFS discovery times and the lowest time reachable from a subtree reveal bridges.", "Tarjan: edge (u, v) is a bridge if low[v] > disc[u] for a DFS child v."],
    brute: { time: "O(E · (V + E))", idea: "Remove each edge and check connectivity." },
    optimal: { time: "O(V + E)", space: "O(V + E)", idea: "Tarjan's bridge-finding DFS." },
    ref: function (n: number, conns: number[][]) {
      const adj: number[][] = Array.from({ length: n }, () => []); conns.forEach(([a, b], i) => { adj[a].push(i); adj[b].push(i); });
      const disc = new Array(n).fill(-1), low = new Array(n).fill(0); const out: number[][] = []; let time = 0;
      // Iterative DFS: stack of [node, parentEdge, nextAdjIndex].
      const st: number[][] = [[0, -1, 0]]; disc[0] = low[0] = time++;
      while (st.length) {
        const top = st[st.length - 1]; const [u, pe] = top;
        if (top[2] < adj[u].length) {
          const e = adj[u][top[2]++]; if (e === pe) continue;
          const v = conns[e][0] === u ? conns[e][1] : conns[e][0];
          if (disc[v] === -1) { disc[v] = low[v] = time++; st.push([v, e, 0]); } else low[u] = Math.min(low[u], disc[v]);
        } else {
          st.pop();
          if (st.length) { const p = st[st.length - 1][0]; low[p] = Math.min(low[p], low[u]); if (low[u] > disc[p]) out.push(conns[pe]); }
        }
      }
      return out;
    },
    gen: (r) => {
      const make = (n: number, extra: number) => { const s = new Set<string>(); const e: number[][] = []; const add = (a: number, b: number) => { const k = a < b ? `${a},${b}` : `${b},${a}`; if (a !== b && !s.has(k)) { s.add(k); e.push([a, b]); } }; for (let i = 1; i < n; i++) add(r.int(0, i - 1), i); for (let k = 0; k < extra; k++) add(r.int(0, n - 1), r.int(0, n - 1)); return [n, r.shuffle(e)]; };
      return [[3, [[0, 1], [1, 2], [2, 0]]], [3, [[0, 1], [1, 2]]], make(10, 3), make(1000, 300), make(10000, 3000), make(10000, 10000)];
    },
  },
  "candy": {
    hints: ["Handle the left-neighbour rule and the right-neighbour rule separately.", "Left pass: if rating rises, give one more than the left neighbour.", "Right pass: take the max of the current value and right neighbour + 1 when the rating is higher than the right."],
    brute: { time: "O(n²)", idea: "Repeatedly fix violations until none remain." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Two greedy passes." },
    ref: function (rt: number[]) { const n = rt.length; const c = new Array(n).fill(1); for (let i = 1; i < n; i++) if (rt[i] > rt[i - 1]) c[i] = c[i - 1] + 1; for (let i = n - 2; i >= 0; i--) if (rt[i] > rt[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1); return c.reduce((a, b) => a + b, 0); },
    gen: (r) => [[[5]], [[1, 2, 3]], [[3, 2, 1]], [[1, 3, 4, 5, 2]], [r.arr(30, 0, 5)], [r.arr(20000, 0, 20000)], [Array.from({ length: 20000 }, (_, i) => 20000 - i)]],
  },
  "jump-game-iv": {
    hints: ["Equal values are connected — a hash map from value to indices.", "Shortest number of jumps → BFS over indices.", "After using a value's index list once, clear it; otherwise you'll re-scan it many times."],
    brute: { time: "O(n²)", idea: "BFS scanning the whole array for equal values at every step." },
    optimal: { time: "O(n)", space: "O(n)", idea: "BFS with a value → indices map, cleared after first use." },
    ref: function (arr: number[]) {
      const n = arr.length; if (n === 1) return 0;
      const groups = new Map<number, number[]>(); arr.forEach((v, i) => { if (!groups.has(v)) groups.set(v, []); groups.get(v)!.push(i); });
      const dist = new Array(n).fill(-1); dist[0] = 0; const q = [0];
      for (let h = 0; h < q.length; h++) {
        const i = q[h]; if (i === n - 1) return dist[i];
        const g = groups.get(arr[i]) ?? []; groups.delete(arr[i]);
        for (const j of [i - 1, i + 1, ...g]) if (j >= 0 && j < n && dist[j] === -1) { dist[j] = dist[i] + 1; q.push(j); }
      }
      return -1;
    },
    gen: (r) => [[[1, 2]], [[6, 1, 9]], [[11, 22, 7, 7, 7, 7, 7, 7, 7, 22, 13]], [r.arr(50, 0, 10)], [r.arr(50000, -100000000, 100000000)], [Array.from({ length: 50000 }, (_, i) => (i === 49999 ? 2 : 7))]],
  },
  "split-array-largest-sum": {
    hints: ["Guess the answer X: can you split into ≤ k parts each with sum ≤ X?", "That check is greedy and monotonic in X.", "Binary search X between max(nums) and sum(nums)."],
    brute: { time: "O(k · n²)", idea: "DP over (parts, prefix)." },
    optimal: { time: "O(n log sum)", space: "O(1)", idea: "Binary search on the answer with a greedy feasibility check." },
    ref: function (nums: number[], k: number) {
      let lo = Math.max(...nums), hi = nums.reduce((a, b) => a + b, 0);
      const parts = (x: number) => { let c = 1, s = 0; for (const v of nums) { if (s + v > x) { c++; s = 0; } s += v; } return c; };
      while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (parts(m) <= k) hi = m; else lo = m + 1; }
      return lo;
    },
    gen: (r) => [[[5], 1], [[1, 4, 4], 3], [[0, 0, 0], 2], [r.arr(20, 0, 100), 4], [r.arr(1000, 0, 1000000), 50], [r.arr(1000, 0, 1000000), 1]],
  },
  "russian-doll-envelopes": {
    hints: ["Sort by width; then you need a strictly increasing sequence of heights.", "Equal widths can't nest — sort heights descending within the same width.", "Then it's longest increasing subsequence on heights with patience sorting (binary search)."],
    brute: { time: "O(n²)", idea: "Sort and run quadratic LIS DP." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Sort (w asc, h desc) + LIS with binary search." },
    ref: function (env: number[][]) {
      const e = [...env].sort((a, b) => a[0] - b[0] || b[1] - a[1]); const tails: number[] = [];
      for (const [, h] of e) { let lo = 0, hi = tails.length; while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < h) lo = m + 1; else hi = m; } tails[lo] = h; }
      return tails.length;
    },
    gen: (r) => [[[[1, 1]]], [[[1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [5, 5], [5, 6], [6, 7], [7, 8]]], [Array.from({ length: 30 }, () => [r.int(1, 10), r.int(1, 10)])], [Array.from({ length: 100000 }, () => [r.int(1, 100000), r.int(1, 100000)])]],
  },
  "dungeon-game": {
    hints: ["Going forwards, you don't know how much health you'll need later.", "Work backwards from the princess.", "need[i][j] = max(1, min(need[i+1][j], need[i][j+1]) − dungeon[i][j])."],
    brute: { time: "O(2^(r+c))", idea: "Try every path and simulate." },
    optimal: { time: "O(rc)", space: "O(c)", idea: "Bottom-up DP from the bottom-right corner." },
    ref: function (d: number[][]) {
      const R = d.length, C = d[0].length; const need = new Array(C + 1).fill(Infinity); need[C - 1] = 1;
      for (let i = R - 1; i >= 0; i--) { const next = new Array(C + 1).fill(Infinity); for (let j = C - 1; j >= 0; j--) { const best = Math.min(i === R - 1 && j === C - 1 ? 1 : Infinity, need[j], next[j + 1]); next[j] = Math.max(1, best - d[i][j]); } for (let j = 0; j <= C; j++) need[j] = next[j]; }
      return need[0];
    },
    gen: (r) => [[[[-5]]], [[[5]]], [[[1, -3, 3], [0, -2, 0], [-3, -3, -3]]], [Array.from({ length: 10 }, () => r.arr(10, -20, 10))], [Array.from({ length: 200 }, () => r.arr(200, -1000, 1000))]],
  },
};
