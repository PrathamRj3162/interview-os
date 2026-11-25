/**
 * Server-side half of the problem bank: graded hints, brute-force and optimal approaches (shown to the
 * interviewer model and, after the interview, in the report), a JavaScript reference solution, and a
 * seeded generator for hidden tests. Expected outputs are always computed by running the reference.
 *
 * Reference functions must be self-contained (no outer variables): a unit test stringifies each one and
 * runs it through the real JavaScript harness to check the whole pipeline end to end.
 */
import type { Rng } from "./rng";

export type Solution = {
  hints: [string, string, string];
  brute: { time: string; idea: string };
  optimal: { time: string; space: string; idea: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: (...args: any[]) => unknown;
  gen: (r: Rng) => unknown[][];
};

const sortedDistinct = (r: Rng, n: number, lo: number, hi: number) => r.distinct(n, lo, hi).sort((a, b) => a - b);
const rotate = <T,>(xs: T[], k: number) => [...xs.slice(k), ...xs.slice(0, k)];

export const SOLUTIONS: Record<string, Solution> = {
  "two-sum": {
    hints: ["For each number, what exact value would complete the pair?", "Looking that value up should take O(1) — which data structure gives you that?", "Walk the array once, keeping a map from value to index; before inserting nums[i], check whether target − nums[i] is already in the map."],
    brute: { time: "O(n²)", idea: "Check every pair i < j." },
    optimal: { time: "O(n)", space: "O(n)", idea: "One pass with a hash map from value to index; look up the complement before inserting." },
    ref: function (nums: number[], target: number) {
      const seen = new Map<number, number>();
      for (let i = 0; i < nums.length; i++) {
        const j = seen.get(target - nums[i]);
        if (j !== undefined) return [j, i];
        seen.set(nums[i], i);
      }
      return [];
    },
    gen: (r) => {
      const out: unknown[][] = [[[1, 2], 3], [[-3, 4, 3, 90], 0], [[5, 5, 1], 10], [[0, 4, 3, 0], 0], [[1000000000, -1000000000, 7], 0]];
      for (const n of [6, 30, 200, 20000]) {
        const nums = r.distinct(n, -1000000000, 1000000000);
        const i = r.int(0, n - 1); let j = r.int(0, n - 1); if (j === i) j = (i + 1) % n;
        out.push([nums, nums[i] + nums[j]]);
      }
      return out;
    },
  },
  "contains-duplicate": {
    hints: ["What would you need to remember about the elements you've already seen?", "A set answers 'have I seen this?' in O(1).", "Insert each element into a hash set; if it's already there, return true."],
    brute: { time: "O(n²)", idea: "Compare every pair." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Hash set of seen values (or sort and compare neighbours in O(n log n), O(1) extra)." },
    ref: function (nums: number[]) { return new Set(nums).size !== nums.length; },
    gen: (r) => [[[1]], [[1, 1]], [[-1, 0, 1]], [r.arr(10, 0, 5)], [r.distinct(20000, -1000000000, 1000000000)], [(() => { const a = r.distinct(20000, 0, 1000000000); a.push(a[r.int(0, 19999)]); return r.shuffle(a); })()]],
  },
  "valid-anagram": {
    hints: ["If the two strings have different lengths, can they be anagrams?", "Count how often each letter appears.", "Use one array of 26 counts: add for s, subtract for t, then check that every count is zero."],
    brute: { time: "O(n log n)", idea: "Sort both strings and compare." },
    optimal: { time: "O(n)", space: "O(1) (26 counters)", idea: "Letter frequency counts." },
    ref: function (s: string, t: string) {
      if (s.length !== t.length) return false;
      const c = new Array(26).fill(0);
      for (let i = 0; i < s.length; i++) { c[s.charCodeAt(i) - 97]++; c[t.charCodeAt(i) - 97]--; }
      return c.every((x) => x === 0);
    },
    gen: (r) => {
      const out: unknown[][] = [["a", "a"], ["a", "b"], ["ab", "a"], ["aacc", "ccac"]];
      for (const n of [5, 50, 30000]) {
        const s = r.str(n, "abcdefghijklmnopqrstuvwxyz");
        out.push([s, r.shuffle(s.split("")).join("")]);
        const t = r.shuffle(s.split("")); t[0] = t[0] === "z" ? "y" : "z"; out.push([s, t.join("")]);
      }
      return out;
    },
  },
  "group-anagrams": {
    hints: ["Two words are anagrams exactly when they share some canonical form. What could that form be?", "Sorting a word's letters gives the same key for every anagram.", "Map each sorted word (or a 26-count signature) to a list of the original words, then return the map's values."],
    brute: { time: "O(n² · k)", idea: "Compare every word with every group." },
    optimal: { time: "O(n · k log k)", space: "O(n · k)", idea: "Hash map keyed by the sorted word (or letter counts for O(n · k))." },
    ref: function (strs: string[]) {
      const m = new Map<string, string[]>();
      for (const w of strs) { const k = w.split("").sort().join(""); if (!m.has(k)) m.set(k, []); m.get(k)!.push(w); }
      return [...m.values()];
    },
    gen: (r) => {
      const out: unknown[][] = [[["a"]], [["", "", "b"]], [["abc", "bca", "cab", "xyz", "zyx", "q"]]];
      for (const n of [20, 400, 3000]) out.push([Array.from({ length: n }, () => r.str(r.int(0, 5), "abcd"))]);
      return out;
    },
  },
  "top-k-frequent": {
    hints: ["First, how often does each value occur?", "Once you have counts, you need the k largest — sorting works; can a heap or buckets do better?", "Count with a hash map, then place values into buckets indexed by frequency (or keep a min-heap of size k) and collect from the highest bucket down."],
    brute: { time: "O(n log n)", idea: "Count, then sort values by count." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Hash-map counts + bucket sort by frequency (or a size-k heap in O(n log k))." },
    ref: function (nums: number[], k: number) {
      const f = new Map<number, number>();
      for (const x of nums) f.set(x, (f.get(x) ?? 0) + 1);
      return [...f.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((e) => e[0]);
    },
    gen: (r) => {
      const out: unknown[][] = [[[5], 1], [[1, 2], 2], [[4, 4, 4, 1, 1, 2, 2, 3], 1]];
      for (const [n, hi] of [[30, 6], [500, 40], [20000, 300]]) {
        const a = r.arr(n, -hi, hi);
        out.push([a, r.int(1, Math.min(5, new Set(a).size))]);
      }
      return out;
    },
  },
  "product-except-self": {
    hints: ["answer[i] = (product of everything left of i) × (product of everything right of i).", "Both sides can be precomputed in a single pass each.", "Fill answer with prefix products left to right, then sweep right to left multiplying by a running suffix product."],
    brute: { time: "O(n²)", idea: "For each i, multiply all other elements." },
    optimal: { time: "O(n)", space: "O(1) extra (output excluded)", idea: "Prefix products, then a running suffix product." },
    ref: function (nums: number[]) {
      const n = nums.length, res = new Array(n).fill(1);
      for (let i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];
      let suf = 1;
      for (let i = n - 1; i >= 0; i--) { res[i] = res[i] * suf || 0; suf *= nums[i]; }
      return res.map((x: number) => x || 0);
    },
    gen: (r) => {
      const out: unknown[][] = [[[2, 3]], [[0, 0]], [[0, 4, 5]], [[-1, -1, -1, -1]]];
      for (let t = 0; t < 4; t++) out.push([r.arr(r.int(3, 12), -3, 3)]);
      out.push([Array.from({ length: 5000 }, (_, i) => (i % 997 === 0 ? -1 : 1))]);
      return out;
    },
  },
  "longest-consecutive": {
    hints: ["Sorting gives O(n log n). What would let you check 'is x+1 present?' in O(1)?", "Put everything in a set. Which numbers are worth starting a count from?", "Only start counting at x when x−1 is NOT in the set; then walk x+1, x+2, … Each number is visited at most twice."],
    brute: { time: "O(n log n)", idea: "Sort, then count runs (skipping duplicates)." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Hash set; start a run only at numbers whose predecessor is missing." },
    ref: function (nums: number[]) {
      const s = new Set(nums); let best = 0;
      for (const x of s) if (!s.has(x - 1)) { let y = x; while (s.has(y + 1)) y++; best = Math.max(best, y - x + 1); }
      return best;
    },
    gen: (r) => [[[]], [[7]], [[1, 2, 0, 1]], [[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]], [r.arr(50, 0, 60)], [r.arr(20000, 0, 40000)], [r.distinct(20000, -1000000000, 1000000000)]],
  },
  "majority-element": {
    hints: ["Counting with a hash map works. Can you do it with O(1) extra space?", "Pair off different elements and cancel them out — what survives?", "Boyer–Moore voting: keep a candidate and a counter; same value → +1, different → −1, counter at 0 → adopt the current value."],
    brute: { time: "O(n²)", idea: "Count each element's occurrences." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Boyer–Moore majority vote." },
    ref: function (nums: number[]) { let c = 0, v = 0; for (const x of nums) { if (c === 0) v = x; c += x === v ? 1 : -1; } return v; },
    gen: (r) => {
      const out: unknown[][] = [[[1]], [[6, 5, 5]], [[-1, -1, 2]]];
      for (const n of [9, 101, 20001]) {
        const m = r.int(-1000, 1000), k = Math.floor(n / 2) + 1;
        out.push([r.shuffle([...Array(k).fill(m), ...r.arr(n - k, -1000, 1000)])]);
      }
      return out;
    },
  },
  "move-zeroes": {
    hints: ["Think of a 'write' position for the next non-zero value.", "Two pointers: one scans, one marks where the next non-zero goes.", "Copy each non-zero to nums[w++], then fill the rest with zeros (or swap as you go)."],
    brute: { time: "O(n)", idea: "Build a new array of non-zeros, then pad with zeros (O(n) extra space)." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Two-pointer in-place compaction." },
    ref: function (nums: number[]) { const a = nums.filter((x) => x !== 0); while (a.length < nums.length) a.push(0); return a; },
    gen: (r) => [[[1]], [[0, 0, 1]], [[1, 2, 3]], [[0, 0, 0]], [r.arr(30, -2, 2)], [r.arr(10000, 0, 3)]],
  },
  "best-time-stock": {
    hints: ["If you sell on day i, which buy day is best?", "Track the lowest price seen so far.", "One pass: update minPrice, and best = max(best, price − minPrice)."],
    brute: { time: "O(n²)", idea: "Try every buy/sell pair." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Running minimum and best profit." },
    ref: function (prices: number[]) { let lo = Infinity, best = 0; for (const p of prices) { lo = Math.min(lo, p); best = Math.max(best, p - lo); } return best; },
    gen: (r) => [[[1]], [[2, 4, 1]], [[3, 3, 3]], [[1, 2, 3, 4, 5]], [r.arr(40, 0, 100)], [r.arr(30000, 0, 10000)]],
  },
  "maximum-subarray": {
    hints: ["What's the best sum of a subarray that ENDS at index i?", "If the best sum ending at i−1 is negative, would you extend it?", "Kadane: cur = max(nums[i], cur + nums[i]); best = max(best, cur)."],
    brute: { time: "O(n²)", idea: "Every start, running sum over every end." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Kadane's algorithm." },
    ref: function (nums: number[]) { let cur = nums[0], best = nums[0]; for (let i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); } return best; },
    gen: (r) => [[[-1]], [[-3, -2, -5]], [[0, 0]], [r.arr(50, -100, 100)], [r.arr(30000, -10000, 10000)]],
  },
  "gas-station": {
    hints: ["If the total gas is less than the total cost, is any start possible?", "If you run dry between stations s and i, can any station in between be a valid start?", "One pass: track the tank from the current candidate start; when it goes negative, the next station becomes the new candidate and the tank resets."],
    brute: { time: "O(n²)", idea: "Simulate from every start." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Greedy reset of the start whenever the running tank is negative, plus a total-sum check." },
    ref: function (gas: number[], cost: number[]) {
      let total = 0, tank = 0, start = 0;
      for (let i = 0; i < gas.length; i++) { const d = gas[i] - cost[i]; total += d; tank += d; if (tank < 0) { start = i + 1; tank = 0; } }
      return total < 0 ? -1 : start;
    },
    gen: (r) => {
      const out: unknown[][] = [[[5], [4]], [[1], [2]], [[0, 0], [0, 0]], [[3, 1, 1], [1, 2, 2]]];
      for (const n of [6, 40, 20000]) out.push([r.arr(n, 0, 10), r.arr(n, 0, 10)]);
      return out;
    },
  },
  "valid-palindrome": {
    hints: ["You can skip characters that don't matter instead of building a new string.", "Two pointers from both ends.", "Move each pointer past non-alphanumerics, compare lower-cased characters, and stop on the first mismatch."],
    brute: { time: "O(n)", idea: "Filter and lower-case into a new string, then compare it with its reverse (O(n) extra space)." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Two pointers skipping non-alphanumerics." },
    ref: function (s: string) { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ""); return t === t.split("").reverse().join(""); },
    gen: (r) => {
      const out: unknown[][] = [["a."], ["0P"], [".,"], ["ab_a"], ["No 'x' in Nixon"]];
      const al = "abcAB01";
      for (const n of [5, 40, 20000]) {
        const half = r.str(n, al), mid = r.str(r.int(0, 1), al);
        const pal = (half + mid + half.split("").reverse().join("")).split("").map((c) => (r.next() < 0.3 ? c.toUpperCase() : c.toLowerCase()) + (r.next() < 0.15 ? r.pick([" ", ",", ":", "!"]) : "")).join("");
        out.push([pal]);
        out.push([pal + "x"]);
      }
      return out;
    },
  },
  "three-sum": {
    hints: ["Fixing one element reduces this to a pair-sum problem.", "Sort first — what does sorting give you for the pair search and for skipping duplicates?", "Sort; for each i, run two pointers on i+1..n−1 looking for −nums[i], skipping equal neighbours for i, lo and hi."],
    brute: { time: "O(n³)", idea: "All triples, deduplicated with a set." },
    optimal: { time: "O(n²)", space: "O(1) extra (besides sorting)", idea: "Sort + fix one + two pointers with duplicate skipping." },
    ref: function (nums: number[]) {
      const a = [...nums].sort((x, y) => x - y), res: number[][] = [];
      for (let i = 0; i < a.length - 2; i++) {
        if (i > 0 && a[i] === a[i - 1]) continue;
        let lo = i + 1, hi = a.length - 1;
        while (lo < hi) {
          const s = a[i] + a[lo] + a[hi];
          if (s === 0) { res.push([a[i], a[lo], a[hi]]); while (lo < hi && a[lo] === a[lo + 1]) lo++; while (lo < hi && a[hi] === a[hi - 1]) hi--; lo++; hi--; }
          else if (s < 0) lo++; else hi--;
        }
      }
      return res;
    },
    gen: (r) => [[[0, 0, 0, 0]], [[1, 2, -2, -1]], [[-2, 0, 1, 1, 2]], [r.arr(20, -6, 6)], [r.arr(80, -20, 20)], [r.arr(1500, -100000, 100000)]],
  },
  "container-most-water": {
    hints: ["Start with the widest container. Which wall limits it?", "Moving the taller wall inward can never help — why?", "Two pointers at both ends; record the area, then move the pointer at the shorter wall."],
    brute: { time: "O(n²)", idea: "Every pair of walls." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Two pointers, always move the shorter side." },
    ref: function (h: number[]) { let i = 0, j = h.length - 1, best = 0; while (i < j) { best = Math.max(best, (j - i) * Math.min(h[i], h[j])); if (h[i] < h[j]) i++; else j--; } return best; },
    gen: (r) => [[[0, 0]], [[4, 3, 2, 1, 4]], [[1, 2, 1]], [r.arr(30, 0, 50)], [r.arr(30000, 0, 10000)]],
  },
  "trapping-rain-water": {
    hints: ["Water above bar i depends on the tallest bar to its left and the tallest to its right.", "You could precompute leftMax and rightMax arrays. Can two pointers avoid the extra arrays?", "Two pointers: move the side with the smaller max, add (thatMax − height) at each step."],
    brute: { time: "O(n²)", idea: "For each bar, scan left and right for the maxima." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Two pointers with running leftMax/rightMax (or prefix-max arrays in O(n) space)." },
    ref: function (h: number[]) {
      let i = 0, j = h.length - 1, lm = 0, rm = 0, w = 0;
      while (i < j) { if (h[i] < h[j]) { lm = Math.max(lm, h[i]); w += lm - h[i]; i++; } else { rm = Math.max(rm, h[j]); w += rm - h[j]; j--; } }
      return w;
    },
    gen: (r) => [[[1]], [[2, 0, 2]], [[3, 2, 1]], [[5, 4, 1, 2]], [r.arr(30, 0, 8)], [r.arr(20000, 0, 100000)]],
  },
  "longest-substring-no-repeat": {
    hints: ["Keep a window that never contains a repeat. What happens when the next character is already inside it?", "Remember where each character was last seen.", "Sliding window: when s[r] was last seen at or after left, jump left to lastSeen[s[r]] + 1; track the best r − left + 1."],
    brute: { time: "O(n³)", idea: "Check every substring for uniqueness." },
    optimal: { time: "O(n)", space: "O(alphabet)", idea: "Sliding window with a last-seen index map." },
    ref: function (s: string) { const last = new Map<string, number>(); let l = 0, best = 0; for (let i = 0; i < s.length; i++) { const p = last.get(s[i]); if (p !== undefined && p >= l) l = p + 1; last.set(s[i], i); best = Math.max(best, i - l + 1); } return best; },
    gen: (r) => [[""], [" "], ["abba"], ["dvdf"], [r.str(60, "abcdef")], [r.str(30000, "abcdefghijklmnopqrstuvwxyz0123456789 !?")]],
  },
  "char-replacement": {
    hints: ["In a window, how many characters must change to make it all one letter?", "window length − count of the most frequent letter ≤ k.", "Sliding window with letter counts and a running maxFreq; shrink from the left whenever length − maxFreq > k."],
    brute: { time: "O(n² · 26)", idea: "Every window, check the condition." },
    optimal: { time: "O(n)", space: "O(26)", idea: "Sliding window; maxFreq never needs to decrease." },
    ref: function (s: string, k: number) {
      const c = new Array(26).fill(0); let l = 0, mx = 0, best = 0;
      for (let i = 0; i < s.length; i++) { mx = Math.max(mx, ++c[s.charCodeAt(i) - 65]); while (i - l + 1 - mx > k) { c[s.charCodeAt(l) - 65]--; l++; } best = Math.max(best, i - l + 1); }
      return best;
    },
    gen: (r) => [["A", 0], ["AB", 0], ["AAAA", 2], [r.str(30, "AB"), 2], [r.str(100, "ABC"), 5], [r.str(30000, "ABCD"), 100], [r.str(20000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0]],
  },
  "min-window-substring": {
    hints: ["Expand a window until it covers t, then try to shrink it.", "Keep counts of what t needs and how many requirements are currently satisfied.", "Two pointers: grow right; while the window is valid, record it if strictly shorter, then move left forward."],
    brute: { time: "O(n² · m)", idea: "Check every substring." },
    optimal: { time: "O(n + m)", space: "O(alphabet)", idea: "Sliding window with need/have counters." },
    ref: function (s: string, t: string) {
      const need = new Map<string, number>(); for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
      let missing = t.length, l = 0, bs = 0, bl = Infinity;
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        if (need.has(c)) { if (need.get(c)! > 0) missing--; need.set(c, need.get(c)! - 1); }
        while (missing === 0) {
          if (r - l + 1 < bl) { bl = r - l + 1; bs = l; }
          const d = s[l];
          if (need.has(d)) { need.set(d, need.get(d)! + 1); if (need.get(d)! > 0) missing++; }
          l++;
        }
      }
      return bl === Infinity ? "" : s.slice(bs, bs + bl);
    },
    gen: (r) => [["ab", "b"], ["aa", "aa"], ["abc", "cba"], ["bba", "ab"], ["ab", "A"], [r.str(40, "abc"), r.str(3, "abc")], [r.str(300, "abcdeABCDE"), r.str(6, "abcde")], [r.str(30000, "abcdefghij"), r.str(25, "abcdefghij")]],
  },
  "sliding-window-maximum": {
    hints: ["When a new, larger element enters the window, can the smaller ones before it ever be the maximum again?", "Keep candidates in decreasing order.", "Monotonic deque of indices: pop smaller values from the back, pop the front once it leaves the window, and the front is the max."],
    brute: { time: "O(n·k)", idea: "Scan each window." },
    optimal: { time: "O(n)", space: "O(k)", idea: "Monotonic decreasing deque." },
    ref: function (nums: number[], k: number) {
      const dq: number[] = [], res: number[] = []; let h = 0;
      for (let i = 0; i < nums.length; i++) {
        while (dq.length > h && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
        dq.push(i);
        if (dq[h] <= i - k) h++;
        if (i >= k - 1) res.push(nums[dq[h]]);
      }
      return res;
    },
    gen: (r) => [[[1, -1], 1], [[9, 11], 2], [[4, -2], 2], [[7, 2, 4], 3], [r.arr(30, -10, 10), 4], [r.arr(30000, -10000, 10000), 1000]],
  },
  "longest-palindromic-substring": {
    hints: ["Every palindrome has a centre — a character or the gap between two characters.", "From each centre, expand outwards while both ends match.", "Try all 2n−1 centres, keeping the longest (replace only when strictly longer, so ties keep the earliest)."],
    brute: { time: "O(n³)", idea: "Check every substring." },
    optimal: { time: "O(n²)", space: "O(1)", idea: "Expand around centres (Manacher's gives O(n) but is rarely expected)." },
    ref: function (s: string) {
      let bs = 0, bl = 1;
      for (let c = 0; c < 2 * s.length - 1; c++) {
        let l = Math.floor(c / 2), r = l + (c % 2);
        while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
        if (r - l - 1 > bl) { bl = r - l - 1; bs = l + 1; }
      }
      return s.slice(bs, bs + bl);
    },
    gen: (r) => [["a"], ["ac"], ["aaaa"], ["abacdfgdcaba"], [r.str(30, "ab")], [r.str(200, "abc")], [r.str(1000, "ab")]],
  },
  "valid-parentheses": {
    hints: ["Which opening bracket must the next closing bracket match?", "The most recent unmatched opener — that's last in, first out.", "Push openers onto a stack; for each closer, the top must be its partner. The stack must end empty."],
    brute: { time: "O(n²)", idea: "Repeatedly delete adjacent matching pairs." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Stack." },
    ref: function (s: string) {
      const st: string[] = [], m: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      for (const c of s) { if (c in m) { if (st.pop() !== m[c]) return false; } else st.push(c); }
      return st.length === 0;
    },
    gen: (r) => {
      const out: unknown[][] = [["("], [")"], ["]["], ["{[]}"], ["(([]){})"], ["(()"]];
      const build = (d: number): string => (d === 0 || r.next() < 0.3 ? "" : r.pick(["()", "[]", "{}"]).split("").join(build(d - 1)) + build(d - 1));
      for (let t = 0; t < 4; t++) { const v = build(10) || "()"; out.push([v]); if (v.length > 2) out.push([v.slice(0, -1) + r.pick([")", "]", "}"])]); }
      out.push(["(".repeat(5000) + ")".repeat(5000)]);
      return out;
    },
  },
  "daily-temperatures": {
    hints: ["For each day you want the next warmer day — a 'next greater element' question.", "Keep the days that are still waiting for a warmer one.", "Monotonic stack of indices with decreasing temperatures; when a warmer day arrives, pop and fill in answers."],
    brute: { time: "O(n²)", idea: "Scan forward from each day." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Monotonic stack." },
    ref: function (t: number[]) { const res = new Array(t.length).fill(0), st: number[] = []; for (let i = 0; i < t.length; i++) { while (st.length && t[st[st.length - 1]] < t[i]) { const j = st.pop()!; res[j] = i - j; } st.push(i); } return res; },
    gen: (r) => [[[50]], [[60, 50, 40]], [[30, 30, 31]], [r.arr(40, 30, 100)], [r.arr(30000, 30, 100)]],
  },
  "evaluate-rpn": {
    hints: ["Each operator applies to the two most recent values.", "A stack holds the operands.", "Push numbers; on an operator pop b then a, push a op b (division truncating toward zero)."],
    brute: { time: "O(n)", idea: "Same as optimal — this problem is about using the right structure." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Operand stack; truncating division." },
    ref: function (tokens: string[]) {
      const st: number[] = [];
      for (const t of tokens) {
        if (["+", "-", "*", "/"].includes(t)) { const b = st.pop()!, a = st.pop()!; st.push(t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : Math.trunc(a / b)); }
        else st.push(Number(t));
      }
      return st[0] || 0;
    },
    gen: (r) => {
      const out: unknown[][] = [[["7"]], [["-3"]], [["6", "-4", "/"]], [["3", "4", "-", "5", "*"]]];
      const expr = (d: number): { t: string[]; v: number } | null => {
        if (d === 0 || r.next() < 0.25) { const v = r.int(-20, 20); return { t: [String(v)], v }; }
        const a = expr(d - 1), b = expr(d - 1); if (!a || !b) return null;
        const op = r.pick(["+", "-", "*", "/"]);
        if (op === "/" && b.v === 0) return null;
        const v = op === "+" ? a.v + b.v : op === "-" ? a.v - b.v : op === "*" ? a.v * b.v : Math.trunc(a.v / b.v);
        if (Math.abs(v) > 1000000) return null;
        return { t: [...a.t, ...b.t, op], v };
      };
      while (out.length < 10) { const e = expr(r.int(3, 8)); if (e) out.push([e.t]); }
      return out;
    },
  },
  "largest-rectangle-histogram": {
    hints: ["For each bar, how far can a rectangle of exactly its height extend left and right?", "You need the nearest smaller bar on each side.", "Monotonic increasing stack: when a lower bar arrives, pop taller bars and compute height × (i − newTop − 1)."],
    brute: { time: "O(n²)", idea: "Every start, track the running minimum over every end." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Monotonic stack (nearest smaller to the left and right)." },
    ref: function (h: number[]) {
      const st: number[] = []; let best = 0;
      for (let i = 0; i <= h.length; i++) {
        const cur = i === h.length ? 0 : h[i];
        while (st.length && h[st[st.length - 1]] >= cur) { const hh = h[st.pop()!]; const w = st.length ? i - st[st.length - 1] - 1 : i; best = Math.max(best, hh * w); }
        st.push(i);
      }
      return best;
    },
    gen: (r) => [[[0]], [[5]], [[1, 1, 1, 1]], [[6, 2, 5, 4, 5, 1, 6]], [r.arr(30, 0, 20)], [r.arr(30000, 0, 10000)]],
  },
  "binary-search": {
    hints: ["The array is sorted — what does comparing with the middle element tell you?", "Each comparison discards half of the range.", "Keep lo..hi; mid = lo + (hi − lo) / 2; move lo or hi past mid; stop when lo > hi."],
    brute: { time: "O(n)", idea: "Linear scan." },
    optimal: { time: "O(log n)", space: "O(1)", idea: "Iterative binary search." },
    ref: function (nums: number[], target: number) { return nums.indexOf(target); },
    gen: (r) => {
      const out: unknown[][] = [[[5], 5], [[5], -5], [[1, 3], 3], [[1, 3], 2]];
      for (const n of [10, 1000, 30000]) { const a = sortedDistinct(r, n, -100000, 100000); out.push([a, a[r.int(0, n - 1)]], [a, r.int(-100000, 100000)]); }
      return out;
    },
  },
  "search-rotated": {
    hints: ["Split at mid: at least one half is always sorted. Can you tell which?", "If the target lies within the sorted half's range, search there; otherwise search the other half.", "Compare nums[lo] with nums[mid] to find the sorted half, then check whether the target falls inside it."],
    brute: { time: "O(n)", idea: "Linear scan." },
    optimal: { time: "O(log n)", space: "O(1)", idea: "Modified binary search using the sorted half." },
    ref: function (nums: number[], target: number) { return nums.indexOf(target); },
    gen: (r) => {
      const out: unknown[][] = [[[1, 3], 3], [[3, 1], 1], [[5, 1, 3], 5], [[4, 5, 6, 7, 8, 1, 2, 3], 8]];
      for (const n of [7, 100, 5000]) { const a = rotate(sortedDistinct(r, n, -10000, 10000), r.int(0, n - 1)); out.push([a, a[r.int(0, n - 1)]], [a, r.int(-10000, 10000)]); }
      return out;
    },
  },
  "find-min-rotated": {
    hints: ["Compare the middle element with the rightmost element.", "If nums[mid] > nums[hi], the minimum must be to the right of mid.", "Binary search with lo < hi: if nums[mid] > nums[hi] then lo = mid + 1, else hi = mid."],
    brute: { time: "O(n)", idea: "Linear scan." },
    optimal: { time: "O(log n)", space: "O(1)", idea: "Binary search against the right end." },
    ref: function (nums: number[]) { return Math.min(...nums); },
    gen: (r) => {
      const out: unknown[][] = [[[1]], [[2, 1]], [[1, 2]], [[5, 1, 2, 3, 4]]];
      for (const n of [8, 300, 5000]) out.push([rotate(sortedDistinct(r, n, -10000, 10000), r.int(0, n - 1))]);
      return out;
    },
  },
  "search-2d-matrix": {
    hints: ["Read row by row, the matrix is one long sorted list.", "Index k in that list maps to (k / n, k % n).", "Binary search over 0..m·n−1 using that mapping."],
    brute: { time: "O(m·n)", idea: "Scan every cell." },
    optimal: { time: "O(log(m·n))", space: "O(1)", idea: "Binary search on the flattened index." },
    ref: function (matrix: number[][], target: number) { return matrix.some((row) => row.includes(target)); },
    gen: (r) => {
      const out: unknown[][] = [[[[1]], 1], [[[1]], 2], [[[1, 3]], 3], [[[1], [3]], 2]];
      for (const [m, n] of [[3, 4], [20, 30], [100, 100]]) {
        const flat = sortedDistinct(r, m * n, -100000, 100000);
        const mat = Array.from({ length: m }, (_, i) => flat.slice(i * n, i * n + n));
        out.push([mat, flat[r.int(0, m * n - 1)]], [mat, r.int(-100000, 100000)]);
      }
      return out;
    },
  },
  "median-two-sorted": {
    hints: ["Merging gives O(m+n). The median only depends on where the combined 'cut' falls.", "Choose how many elements come from the shorter array; the rest of the left half comes from the other one.", "Binary search the cut i in the shorter array: with j = half − i, check a[i−1] ≤ b[j] and b[j−1] ≤ a[i]."],
    brute: { time: "O(m+n)", idea: "Merge the two arrays and take the middle." },
    optimal: { time: "O(log min(m,n))", space: "O(1)", idea: "Binary search on the partition of the shorter array." },
    ref: function (a: number[], b: number[]) { const c = [...a, ...b].sort((x, y) => x - y), n = c.length; return n % 2 ? c[(n - 1) / 2] : (c[n / 2 - 1] + c[n / 2]) / 2; },
    gen: (r) => {
      const out: unknown[][] = [[[], [1]], [[2], []], [[1, 1], [1, 1]], [[1, 2, 3], [100]]];
      for (const [m, n] of [[3, 4], [10, 1], [500, 501], [1000, 0]]) out.push([r.arr(m, -1000, 1000).sort((x, y) => x - y), r.arr(n, -1000, 1000).sort((x, y) => x - y)]);
      return out;
    },
  },
  "koko-bananas": {
    hints: ["If speed k works, does every speed above k also work?", "That monotonicity means you can binary search the answer.", "Search k in [1, max(piles)]; hours(k) = Σ ceil(p / k); find the smallest k with hours ≤ h. Watch for overflow in the sum."],
    brute: { time: "O(max(p) · n)", idea: "Try every speed from 1 upwards." },
    optimal: { time: "O(n log max(p))", space: "O(1)", idea: "Binary search on the answer." },
    ref: function (piles: number[], h: number) {
      let lo = 1, hi = Math.max(...piles);
      while (lo < hi) { const k = Math.floor((lo + hi) / 2); let t = 0; for (const p of piles) t += Math.ceil(p / k); if (t <= h) hi = k; else lo = k + 1; }
      return lo;
    },
    gen: (r) => {
      const out: unknown[][] = [[[1], 1], [[1000000000], 2], [[312884470], 312884469], [[5, 5, 5], 3]];
      for (const n of [5, 100, 1000]) { const p = r.arr(n, 1, 1000000000); out.push([p, r.int(n, n * 3)]); }
      return out;
    },
  },
  "kth-largest": {
    hints: ["Sorting works in O(n log n). Do you need the whole order?", "A min-heap of size k keeps the k largest seen so far.", "Heap: push each value, pop when size > k; the top is the answer. Quickselect gives O(n) on average."],
    brute: { time: "O(n log n)", idea: "Sort descending, take index k−1." },
    optimal: { time: "O(n log k) heap / O(n) average quickselect", space: "O(k)", idea: "Size-k min-heap or quickselect." },
    ref: function (nums: number[], k: number) { return [...nums].sort((a, b) => b - a)[k - 1]; },
    gen: (r) => {
      const out: unknown[][] = [[[1], 1], [[2, 1], 2], [[-1, -1], 1], [[7, 7, 7, 7], 3]];
      for (const n of [10, 1000, 30000]) out.push([r.arr(n, -10000, 10000), r.int(1, n)]);
      return out;
    },
  },
  "merge-intervals": {
    hints: ["After sorting by start, which intervals can overlap the current one?", "Only the last merged interval can overlap the next one.", "Sort by start; extend the last merged end when start ≤ lastEnd, otherwise push a new interval."],
    brute: { time: "O(n²)", idea: "Repeatedly merge any overlapping pair." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Sort by start and sweep." },
    ref: function (intervals: number[][]) {
      const a = intervals.map((x) => [...x]).sort((p, q) => p[0] - q[0]), res: number[][] = [];
      for (const iv of a) { const last = res[res.length - 1]; if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]); else res.push(iv); }
      return res;
    },
    gen: (r) => {
      const out: unknown[][] = [[[[1, 1]]], [[[1, 4], [0, 4]]], [[[1, 4], [2, 3]]], [[[5, 6], [1, 2]]]];
      for (const n of [6, 50, 10000]) out.push([Array.from({ length: n }, () => { const s = r.int(0, 10000); return [s, s + r.int(0, 30)]; })]);
      return out;
    },
  },
  "insert-interval": {
    hints: ["The intervals split into three groups: entirely before the new one, overlapping it, and entirely after.", "Overlapping intervals all merge into one with min start and max end.", "One pass: copy intervals ending before newStart; merge while start ≤ newEnd; copy the rest."],
    brute: { time: "O(n log n)", idea: "Append and run Merge Intervals." },
    optimal: { time: "O(n)", space: "O(n)", idea: "Linear three-phase sweep." },
    ref: function (intervals: number[][], nw: number[]) {
      const res: number[][] = []; let [s, e] = nw, i = 0;
      while (i < intervals.length && intervals[i][1] < s) res.push(intervals[i++]);
      while (i < intervals.length && intervals[i][0] <= e) { s = Math.min(s, intervals[i][0]); e = Math.max(e, intervals[i][1]); i++; }
      res.push([s, e]);
      while (i < intervals.length) res.push(intervals[i++]);
      return res;
    },
    gen: (r) => {
      const out: unknown[][] = [[[], [5, 7]], [[[1, 5]], [2, 3]], [[[1, 5]], [6, 8]], [[[3, 5]], [0, 1]], [[[1, 5]], [5, 7]]];
      for (const n of [5, 40, 5000]) {
        const pts = sortedDistinct(r, n * 2, 0, n * 20), iv = Array.from({ length: n }, (_, i) => [pts[2 * i], pts[2 * i + 1]]);
        const s = r.int(0, n * 20); out.push([iv, [s, s + r.int(0, n * 4)]]);
      }
      return out;
    },
  },
  "non-overlapping-intervals": {
    hints: ["Turn it around: keep as many intervals as possible.", "Greedy: which interval should you keep first to leave the most room for the rest?", "Sort by end; keep an interval when its start ≥ the last kept end, otherwise count it as removed."],
    brute: { time: "O(2ⁿ)", idea: "Try every subset." },
    optimal: { time: "O(n log n)", space: "O(1)", idea: "Activity selection: sort by end time." },
    ref: function (intervals: number[][]) {
      const a = [...intervals].sort((p, q) => p[1] - q[1]); let end = -Infinity, removed = 0;
      for (const [s, e] of a) { if (s >= end) end = e; else removed++; }
      return removed;
    },
    gen: (r) => {
      const out: unknown[][] = [[[[1, 100], [11, 22], [1, 11], [2, 12]]], [[[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]]], [[[-5, -1]]]];
      for (const n of [8, 100, 20000]) out.push([Array.from({ length: n }, () => { const s = r.int(-50000, 50000); return [s, s + r.int(1, 100)]; })]);
      return out;
    },
  },
  "meeting-rooms-ii": {
    hints: ["At any moment, the rooms in use equal the meetings that have started but not ended.", "Process start and end times in sorted order.", "Sort starts and ends separately; sweep, using a room on each start and freeing one whenever the earliest end ≤ the current start."],
    brute: { time: "O(n · T)", idea: "Count overlaps at every time point." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Sweep line over sorted starts/ends (or a min-heap of end times)." },
    ref: function (intervals: number[][]) {
      const s = intervals.map((x) => x[0]).sort((a, b) => a - b), e = intervals.map((x) => x[1]).sort((a, b) => a - b);
      let j = 0, used = 0, best = 0;
      for (let i = 0; i < s.length; i++) { while (e[j] <= s[i]) { j++; used--; } used++; best = Math.max(best, used); }
      return best;
    },
    gen: (r) => {
      const out: unknown[][] = [[[[1, 5]]], [[[1, 5], [5, 10]]], [[[1, 10], [2, 3], [4, 5], [6, 7]]], [[[1, 2], [1, 2], [1, 2]]]];
      for (const n of [8, 200, 10000]) out.push([Array.from({ length: n }, () => { const s = r.int(0, 1000000 - 1000); return [s, s + r.int(1, 1000)]; })]);
      return out;
    },
  },
  "climbing-stairs": {
    hints: ["How can you arrive at step n?", "ways(n) = ways(n−1) + ways(n−2). Watch out for recomputation.", "Iterate from the bottom keeping only the last two values (it's Fibonacci)."],
    brute: { time: "O(2ⁿ)", idea: "Plain recursion." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Bottom-up DP with two variables." },
    ref: function (n: number) { let a = 1, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; },
    gen: () => [[1], [4], [5], [10], [20], [30], [38], [45]],
  },
  "house-robber": {
    hints: ["At each house you either take it or skip it.", "best(i) = max(best(i−1), best(i−2) + nums[i]).", "Iterate keeping two running values: the best including the previous house and the best excluding it."],
    brute: { time: "O(2ⁿ)", idea: "Try every non-adjacent subset." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Linear DP with two variables." },
    ref: function (nums: number[]) { let a = 0, b = 0; for (const x of nums) [a, b] = [b, Math.max(b, a + x)]; return b; },
    gen: (r) => [[[0]], [[5]], [[2, 1, 1, 2]], [[1, 3, 1]], [r.arr(20, 0, 400)], [r.arr(100, 0, 400)]],
  },
  "coin-change": {
    hints: ["Greedy (always the biggest coin) fails — can you find a counterexample?", "Let dp[x] be the fewest coins needed to make x.", "dp[0] = 0; dp[x] = min over coins c ≤ x of dp[x − c] + 1; unreachable amounts stay at infinity."],
    brute: { time: "Exponential", idea: "Recursively try every coin." },
    optimal: { time: "O(amount · coins)", space: "O(amount)", idea: "Unbounded-knapsack DP (or BFS over amounts)." },
    ref: function (coins: number[], amount: number) {
      const dp = new Array(amount + 1).fill(Infinity); dp[0] = 0;
      for (let x = 1; x <= amount; x++) for (const c of coins) if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
      return dp[amount] === Infinity ? -1 : dp[amount];
    },
    gen: (r) => [[[1, 3, 4], 6], [[2], 1], [[5, 7], 1], [[186, 419, 83, 408], 6249], [r.distinct(3, 1, 20), r.int(0, 100)], [r.distinct(6, 1, 50), r.int(100, 1000)], [r.distinct(12, 1, 500), 10000]],
  },
  "longest-increasing-subsequence": {
    hints: ["dp[i] = length of the LIS ending at i — how do you compute it from earlier entries?", "That's O(n²). Can you keep, for each length, the smallest possible tail?", "Patience sorting: keep a 'tails' array; binary search where each value goes and replace it. The answer is tails.length."],
    brute: { time: "O(n²)", idea: "dp[i] = 1 + max dp[j] over j < i with nums[j] < nums[i]." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Tails array + binary search." },
    ref: function (nums: number[]) {
      const t: number[] = [];
      for (const x of nums) { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] < x) lo = m + 1; else hi = m; } t[lo] = x; }
      return t.length;
    },
    gen: (r) => [[[1]], [[5, 4, 3]], [[1, 2, 3]], [[4, 10, 4, 3, 8, 9]], [r.arr(30, 0, 20)], [r.arr(2500, -10000, 10000)]],
  },
  "word-break": {
    hints: ["Can prefix s[0..i) be segmented? Build that up from shorter prefixes.", "dp[i] is true if some j < i has dp[j] true and s[j..i) in the dictionary.", "Put the words in a set and only try lengths that some word actually has."],
    brute: { time: "Exponential", idea: "Recursively try every prefix word." },
    optimal: { time: "O(n · L)", space: "O(n)", idea: "Prefix DP with a word set (L = maximum word length)." },
    ref: function (s: string, words: string[]) {
      const set = new Set(words), dp = new Array(s.length + 1).fill(false); dp[0] = true;
      for (let i = 1; i <= s.length; i++) for (let j = 0; j < i && !dp[i]; j++) if (dp[j] && set.has(s.slice(j, i))) dp[i] = true;
      return dp[s.length];
    },
    gen: (r) => {
      const out: unknown[][] = [["a", ["a"]], ["ab", ["a"]], ["aaaaaaa", ["aaaa", "aaa"]], ["cars", ["car", "ca", "rs"]]];
      for (let t = 0; t < 3; t++) {
        const dict = Array.from({ length: r.int(3, 8) }, () => r.str(r.int(1, 4), "ab"));
        const s = Array.from({ length: r.int(3, 30) }, () => r.pick(dict)).join("");
        out.push([s, dict], [s + "c", dict]);
      }
      out.push(["a".repeat(299) + "b", ["a", "aa", "aaa", "aaaa", "aaaaa", "aaaaaa"]]);
      return out;
    },
  },
  "unique-paths": {
    hints: ["Each path is a sequence of right and down moves.", "paths(i, j) = paths(i−1, j) + paths(i, j−1).", "One DP row is enough (or use the binomial coefficient C(m+n−2, m−1))."],
    brute: { time: "O(2^(m+n))", idea: "Plain recursion." },
    optimal: { time: "O(m·n)", space: "O(n)", idea: "Grid DP with a single row (or combinatorics in O(min(m, n)))." },
    ref: function (m: number, n: number) { const row = new Array(n).fill(1); for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) row[j] += row[j - 1]; return row[n - 1]; },
    gen: () => [[1, 1], [1, 10], [10, 1], [2, 2], [7, 3], [10, 10], [16, 16], [13, 16]],
  },
  "longest-common-subsequence": {
    hints: ["Compare the last characters of the two prefixes.", "If they match, the answer is 1 + LCS of the shorter prefixes; otherwise drop one character from either side.", "2D DP over (i, j), or two rows to save memory."],
    brute: { time: "O(2^(m+n))", idea: "Plain recursion." },
    optimal: { time: "O(m·n)", space: "O(min(m, n))", idea: "Classic 2D DP, reduced to rolling rows." },
    ref: function (a: string, b: string) {
      let prev = new Array(b.length + 1).fill(0);
      for (let i = 1; i <= a.length; i++) { const cur = [0]; for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); prev = cur; }
      return prev[b.length];
    },
    gen: (r) => [["a", "a"], ["a", "b"], ["bsbininm", "jmjkbkjkv"], [r.str(20, "abc"), r.str(15, "abc")], [r.str(300, "acgt"), r.str(300, "acgt")], [r.str(1000, "abcdefgh"), r.str(1000, "abcdefgh")]],
  },
  "edit-distance": {
    hints: ["Look at the last characters: are they equal or not?", "If not, one of three operations was the last one — which subproblems does each leave?", "dp[i][j] = dp[i−1][j−1] if the characters match, otherwise 1 + min(insert, delete, replace)."],
    brute: { time: "O(3^(m+n))", idea: "Plain recursion." },
    optimal: { time: "O(m·n)", space: "O(min(m, n))", idea: "Levenshtein DP with rolling rows." },
    ref: function (a: string, b: string) {
      let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
      for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]); prev = cur; }
      return prev[b.length];
    },
    gen: (r) => [["", ""], ["", "abc"], ["abc", ""], ["kitten", "sitting"], [r.str(15, "ab"), r.str(12, "ab")], [r.str(200, "abcd"), r.str(220, "abcd")], [r.str(500, "abcdefghij"), r.str(500, "abcdefghij")]],
  },
  "decode-ways": {
    hints: ["The last one or two digits decide how a prefix can end.", "ways(i) = ways(i−1) if s[i−1] ≠ '0', plus ways(i−2) if s[i−2..i] is between 10 and 26.", "Iterate keeping two variables; a '0' that can't pair with the digit before it makes the answer 0."],
    brute: { time: "O(2ⁿ)", idea: "Plain recursion." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Fibonacci-like DP with validity checks." },
    ref: function (s: string) {
      let a = 1, b = s[0] === "0" ? 0 : 1;
      for (let i = 2; i <= s.length; i++) { const one = s[i - 1] !== "0" ? b : 0; const two = Number(s.slice(i - 2, i)); const c = one + (two >= 10 && two <= 26 ? a : 0); a = b; b = c; }
      return b;
    },
    gen: (r) => [["0"], ["1"], ["10"], ["27"], ["100"], ["2101"], ["11106"], [r.str(15, "123")], [r.str(40, "12")], [r.str(40, "1203456")]],
  },
  "partition-equal-subset": {
    hints: ["If the total sum is odd, stop. Otherwise, what sum must one group hit?", "That's subset sum to total/2 — a 0/1 knapsack.", "Boolean DP over sums, iterating sums downwards for each number (or a bitset shifted left)."],
    brute: { time: "O(2ⁿ)", idea: "Try every subset." },
    optimal: { time: "O(n · sum)", space: "O(sum)", idea: "0/1-knapsack boolean DP to sum/2." },
    ref: function (nums: number[]) {
      const total = nums.reduce((a, b) => a + b, 0); if (total % 2) return false;
      const half = total / 2, dp = new Array(half + 1).fill(false); dp[0] = true;
      for (const x of nums) for (let s = half; s >= x; s--) if (dp[s - x]) dp[s] = true;
      return dp[half];
    },
    gen: (r) => [[[1]], [[2, 2]], [[1, 2, 5]], [[3, 3, 3, 4, 5]], [r.arr(10, 1, 20)], [r.arr(50, 1, 100)], [r.arr(200, 1, 100)], [[...Array(199).fill(100), 99]]],
  },
  "jump-game": {
    hints: ["Track the farthest index you can reach so far.", "If you ever stand at an index beyond that farthest reach, you're stuck.", "One pass: if i > reach return false; reach = max(reach, i + nums[i])."],
    brute: { time: "O(n²)", idea: "DP marking reachable indices." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Greedy farthest reach." },
    ref: function (nums: number[]) { let reach = 0; for (let i = 0; i < nums.length; i++) { if (i > reach) return false; reach = Math.max(reach, i + nums[i]); } return true; },
    gen: (r) => [[[0]], [[1, 0]], [[0, 1]], [[2, 0, 0]], [r.arr(20, 0, 2)], [r.arr(10000, 0, 3)], [[...Array(9999).fill(1), 0]]],
  },
  "number-of-islands": {
    hints: ["Each time you find unvisited land, you've found a new island.", "From that cell, visit all connected land so you don't count it again.", "Scan the grid; on each '1' increment the count and flood-fill (BFS/DFS) marking cells as visited."],
    brute: { time: "O(r·c)", idea: "Flood fill is already optimal; be careful with recursion depth on big grids." },
    optimal: { time: "O(r·c)", space: "O(r·c)", idea: "BFS/DFS flood fill (or union-find)." },
    ref: function (grid: string[]) {
      const g = grid.map((row) => row.split("")), R = g.length, C = R ? g[0].length : 0; let n = 0;
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (g[i][j] === "1") {
        n++; const st = [[i, j]]; g[i][j] = "0";
        while (st.length) { const [a, b] = st.pop()!; for (const [x, y] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) if (x >= 0 && y >= 0 && x < R && y < C && g[x][y] === "1") { g[x][y] = "0"; st.push([x, y]); } }
      }
      return n;
    },
    gen: (r) => {
      const grid = (R: number, C: number, p: number) => Array.from({ length: R }, () => Array.from({ length: C }, () => (r.next() < p ? "1" : "0")).join(""));
      return [[["0"]], [["1"]], [["101", "010", "101"]], [grid(5, 6, 0.5)], [grid(30, 30, 0.45)], [grid(300, 300, 0.6)], [Array(300).fill("1".repeat(300))]];
    },
  },
  "rotting-oranges": {
    hints: ["All rotten oranges spread at the same time — which traversal models that?", "Start a BFS from every rotten orange at once.", "Multi-source BFS level by level, counting minutes and fresh oranges; return −1 if any fresh orange remains."],
    brute: { time: "O((r·c)²)", idea: "Simulate minute by minute, rescanning the grid." },
    optimal: { time: "O(r·c)", space: "O(r·c)", idea: "Multi-source BFS." },
    ref: function (grid: number[][]) {
      const g = grid.map((r) => [...r]), R = g.length, C = g[0].length; let q: number[][] = [], fresh = 0, t = 0;
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { if (g[i][j] === 2) q.push([i, j]); if (g[i][j] === 1) fresh++; }
      while (q.length && fresh) {
        const nq: number[][] = [];
        for (const [a, b] of q) for (const [x, y] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) if (x >= 0 && y >= 0 && x < R && y < C && g[x][y] === 1) { g[x][y] = 2; fresh--; nq.push([x, y]); }
        q = nq; t++;
      }
      return fresh ? -1 : t;
    },
    gen: (r) => {
      const grid = (R: number, C: number) => Array.from({ length: R }, () => Array.from({ length: C }, () => r.pick([0, 1, 1, 1, 2])));
      return [[[[0]]], [[[1]]], [[[2]]], [[[1, 2, 1]]], [grid(3, 3)], [grid(6, 8)], [grid(10, 10)], [[[2, ...Array(9).fill(1)], ...Array.from({ length: 9 }, () => Array(10).fill(1))]]];
    },
  },
  "course-schedule": {
    hints: ["Model courses as a directed graph. When is finishing impossible?", "Exactly when the graph has a cycle.", "Kahn's algorithm: repeatedly take courses with in-degree 0; if you take all of them there's no cycle (or DFS with three colours)."],
    brute: { time: "O(V·(V+E))", idea: "DFS from every node looking for a cycle, without memoisation." },
    optimal: { time: "O(V + E)", space: "O(V + E)", idea: "Topological sort (Kahn) or DFS cycle detection." },
    ref: function (n: number, pre: number[][]) {
      const adj: number[][] = Array.from({ length: n }, () => []), indeg = new Array(n).fill(0);
      for (const [a, b] of pre) { adj[b].push(a); indeg[a]++; }
      const q: number[] = []; for (let i = 0; i < n; i++) if (!indeg[i]) q.push(i);
      let seen = 0; for (let h = 0; h < q.length; h++) { seen++; for (const v of adj[q[h]]) if (--indeg[v] === 0) q.push(v); }
      return seen === n;
    },
    gen: (r) => {
      const dag = (n: number, m: number) => { const order = r.shuffle(Array.from({ length: n }, (_, i) => i)); return Array.from({ length: m }, () => { const i = r.int(0, n - 2), j = r.int(i + 1, n - 1); return [order[j], order[i]]; }); };
      const out: unknown[][] = [[1, []], [3, [[0, 1], [1, 2], [2, 0]]], [3, [[1, 0], [2, 1]]], [2, [[0, 0]]]];
      for (const [n, m] of [[6, 8], [100, 300], [2000, 5000]]) { const d = dag(n, m); out.push([n, d]); out.push([n, [...d, [d[0][1], d[0][0]]]]); }
      return out;
    },
  },
  "course-schedule-ii": {
    hints: ["You need a topological order of the graph.", "Courses with no remaining prerequisites can always be taken next.", "Kahn's algorithm: queue the in-degree-0 courses, append each one you pop, decrement its neighbours; if fewer than n are output there's a cycle."],
    brute: { time: "O(V·(V+E))", idea: "Repeatedly scan for a course whose prerequisites are all taken." },
    optimal: { time: "O(V + E)", space: "O(V + E)", idea: "Kahn's algorithm (or post-order DFS reversed)." },
    ref: function (n: number, pre: number[][]) {
      const adj: number[][] = Array.from({ length: n }, () => []), indeg = new Array(n).fill(0);
      for (const [a, b] of pre) { adj[b].push(a); indeg[a]++; }
      const q: number[] = []; for (let i = 0; i < n; i++) if (!indeg[i]) q.push(i);
      for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (--indeg[v] === 0) q.push(v);
      return q.length === n ? q : [];
    },
    gen: (r) => {
      const dag = (n: number, m: number) => { const order = r.shuffle(Array.from({ length: n }, (_, i) => i)); return Array.from({ length: m }, () => { const i = r.int(0, n - 2), j = r.int(i + 1, n - 1); return [order[j], order[i]]; }); };
      const out: unknown[][] = [[2, []], [2, [[0, 1], [1, 0]]], [3, [[2, 0], [2, 1]]]];
      for (const [n, m] of [[6, 7], [100, 250], [2000, 5000]]) { const d = dag(n, m); out.push([n, d]); out.push([n, [...d, [d[0][1], d[0][0]]]]); }
      return out;
    },
  },
  "count-components": {
    hints: ["Each traversal from an unvisited node discovers exactly one component.", "Or think of merging sets every time you see an edge.", "Union-find with path compression: start with n components and subtract one for every union that actually merges two sets."],
    brute: { time: "O(V + E)", idea: "BFS/DFS from each unvisited node (already optimal)." },
    optimal: { time: "O((V + E) · α(V))", space: "O(V)", idea: "Union-find or DFS." },
    ref: function (n: number, edges: number[][]) {
      const p = Array.from({ length: n }, (_, i) => i); const f = (x: number): number => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
      let c = n; for (const [a, b] of edges) { const x = f(a), y = f(b); if (x !== y) { p[x] = y; c--; } }
      return c;
    },
    gen: (r) => {
      const out: unknown[][] = [[1, []], [3, []], [3, [[0, 1], [1, 0], [0, 1]]], [4, [[0, 0], [2, 3]]]];
      for (const [n, m] of [[10, 6], [200, 150], [2000, 1900], [2000, 5000]]) out.push([n, Array.from({ length: m }, () => [r.int(0, n - 1), r.int(0, n - 1)])]);
      return out;
    },
  },
  "network-delay": {
    hints: ["The time a node receives the signal is its shortest-path distance from k.", "Edge weights are non-negative — which shortest-path algorithm fits?", "Dijkstra from k with a min-heap; the answer is the largest distance, or −1 if some node is unreachable."],
    brute: { time: "O(V·E)", idea: "Bellman–Ford." },
    optimal: { time: "O(E log V)", space: "O(V + E)", idea: "Dijkstra with a binary heap." },
    ref: function (times: number[][], n: number, k: number) {
      const d = new Array(n + 1).fill(Infinity), done = new Array(n + 1).fill(false); d[k] = 0;
      const adj: number[][][] = Array.from({ length: n + 1 }, () => []); for (const [u, v, w] of times) adj[u].push([v, w]);
      for (let it = 0; it < n; it++) {
        let u = -1; for (let i = 1; i <= n; i++) if (!done[i] && (u === -1 || d[i] < d[u])) u = i;
        if (u === -1 || d[u] === Infinity) break; done[u] = true;
        for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w;
      }
      const mx = Math.max(...d.slice(1)); return mx === Infinity ? -1 : mx;
    },
    gen: (r) => {
      const out: unknown[][] = [[[[1, 2, 0]], 2, 1], [[[1, 2, 5], [1, 3, 1], [3, 2, 1]], 3, 1], [[[2, 1, 1]], 3, 2]];
      for (const [n, m] of [[5, 8], [50, 300], [100, 6000]]) {
        const e = Array.from({ length: m }, () => { const u = r.int(1, n); let v = r.int(1, n); if (v === u) v = (u % n) + 1; return [u, v, r.int(0, 100)]; });
        out.push([e, n, r.int(1, n)]);
      }
      return out;
    },
  },
  "word-ladder": {
    hints: ["Think of each word as a node and each one-letter change as an edge.", "Shortest number of steps in an unweighted graph → BFS.", "BFS from beginWord; generate neighbours by changing each position to a–z and checking a set; remove words as you visit them."],
    brute: { time: "O(N² · L)", idea: "Build the full graph by comparing every pair, then BFS." },
    optimal: { time: "O(N · L · 26)", space: "O(N · L)", idea: "BFS with on-the-fly neighbour generation (bidirectional BFS is faster)." },
    ref: function (begin: string, end: string, list: string[]) {
      const set = new Set(list); if (!set.has(end)) return 0;
      let q = [begin], steps = 1; set.delete(begin);
      while (q.length) {
        const nq: string[] = [];
        for (const w of q) {
          if (w === end) return steps;
          for (let i = 0; i < w.length; i++) for (let c = 97; c < 123; c++) { const x = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1); if (set.has(x)) { set.delete(x); nq.push(x); } }
        }
        q = nq; steps++;
      }
      return 0;
    },
    gen: (r) => {
      const out: unknown[][] = [["a", "c", ["a", "b", "c"]], ["hot", "dog", ["hot", "dog"]], ["hot", "dot", ["dot"]]];
      for (const [n, L, al] of [[30, 3, "abc"], [500, 4, "abcde"], [5000, 5, "abcdef"]] as const) {
        const words = [...new Set(Array.from({ length: n }, () => r.str(L, al)))];
        const end = r.pick(words); let begin = r.str(L, al); while (begin === end) begin = r.str(L, al);
        out.push([begin, end, words]);
      }
      return out;
    },
  },
  "subsets": {
    hints: ["Each element is either in a subset or not.", "That's 2ⁿ choices — recursion or bitmasks both enumerate them.", "Backtrack: at index i, recurse once without nums[i] and once with it; record the path at the end (or loop masks 0..2ⁿ−1)."],
    brute: { time: "O(n · 2ⁿ)", idea: "Output size forces this; enumerate via bitmasks." },
    optimal: { time: "O(n · 2ⁿ)", space: "O(n) recursion", idea: "Backtracking or iterative doubling." },
    ref: function (nums: number[]) { const res: number[][] = [[]]; for (const x of nums) { const k = res.length; for (let i = 0; i < k; i++) res.push([...res[i], x]); } return res; },
    gen: (r) => [[[5]], [[-1, 1]], [r.distinct(4, -10, 10)], [r.distinct(7, -10, 10)], [r.distinct(10, -10, 10)]],
  },
  "permutations": {
    hints: ["Build the permutation one position at a time.", "Keep track of which elements are already used.", "Backtrack with a used[] array (or swap in place), recording the path when its length equals n."],
    brute: { time: "O(n · n!)", idea: "Output size forces this." },
    optimal: { time: "O(n · n!)", space: "O(n)", idea: "Backtracking." },
    ref: function (nums: number[]) {
      const res: number[][] = [], path: number[] = [], used = new Array(nums.length).fill(false);
      const go = () => { if (path.length === nums.length) { res.push([...path]); return; } for (let i = 0; i < nums.length; i++) if (!used[i]) { used[i] = true; path.push(nums[i]); go(); path.pop(); used[i] = false; } };
      go(); return res;
    },
    gen: (r) => [[[1]], [[-5, 5]], [r.distinct(4, -10, 10)], [r.distinct(5, -10, 10)], [r.distinct(6, -10, 10)]],
  },
  "combination-sum": {
    hints: ["A choice tree: at each step, pick a candidate or move past it.", "To avoid duplicate combinations, only pick candidates at or after the current index.", "Sort; backtrack(start, remaining): for i ≥ start, if c[i] ≤ remaining, push it and recurse with the same i."],
    brute: { time: "Exponential", idea: "Generate all multisets up to the target." },
    optimal: { time: "Exponential in target/min(c)", space: "O(target/min(c))", idea: "Backtracking with a start index and pruning on sorted candidates." },
    ref: function (cands: number[], target: number) {
      const c = [...cands].sort((a, b) => a - b), res: number[][] = [], path: number[] = [];
      const go = (s: number, rem: number) => { if (rem === 0) { res.push([...path]); return; } for (let i = s; i < c.length && c[i] <= rem; i++) { path.push(c[i]); go(i, rem - c[i]); path.pop(); } };
      go(0, target); return res;
    },
    gen: (r) => [[[2], 1], [[3], 9], [[7, 3, 2], 18], [r.distinct(4, 2, 12), 20], [r.distinct(8, 2, 40), 40], [[2, 3, 5, 7, 11, 13], 30]],
  },
  "spiral-matrix": {
    hints: ["Peel the matrix like an onion, layer by layer.", "Keep four boundaries: top, bottom, left and right.", "Go right along top, down along right, left along bottom (if any rows remain), up along left (if any columns remain); shrink the boundaries each time."],
    brute: { time: "O(m·n)", idea: "Simulate with a visited grid and direction changes." },
    optimal: { time: "O(m·n)", space: "O(1) extra", idea: "Four shrinking boundaries." },
    ref: function (m: number[][]) {
      const res: number[] = []; let t = 0, b = m.length - 1, l = 0, r = m[0].length - 1;
      while (t <= b && l <= r) {
        for (let j = l; j <= r; j++) res.push(m[t][j]); t++;
        for (let i = t; i <= b; i++) res.push(m[i][r]); r--;
        if (t <= b) { for (let j = r; j >= l; j--) res.push(m[b][j]); b--; }
        if (l <= r) { for (let i = b; i >= t; i--) res.push(m[i][l]); l++; }
      }
      return res;
    },
    gen: (r) => {
      const mat = (R: number, C: number) => Array.from({ length: R }, () => r.arr(C, -100, 100));
      return [[[[1]]], [[[1, 2, 3]]], [[[1], [2], [3]]], [mat(2, 2)], [mat(4, 7)], [mat(7, 4)], [mat(10, 10)]];
    },
  },
  "rotate-image": {
    hints: ["Where does element (i, j) end up after a clockwise rotation?", "A rotation is the same as a transpose followed by something simple.", "Transpose (swap m[i][j] with m[j][i]), then reverse each row."],
    brute: { time: "O(n²)", idea: "Copy into a new matrix with res[j][n−1−i] = m[i][j] (O(n²) extra space)." },
    optimal: { time: "O(n²)", space: "O(1)", idea: "Transpose + reverse each row (or rotate four cells at a time)." },
    ref: function (m: number[][]) { const n = m.length; return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => m[n - 1 - j][i])); },
    gen: (r) => [[[[1, 2], [3, 4]]], [Array.from({ length: 4 }, () => r.arr(4, -100, 100))], [Array.from({ length: 7 }, () => r.arr(7, -1000, 1000))], [Array.from({ length: 20 }, () => r.arr(20, -1000, 1000))]],
  },
};
