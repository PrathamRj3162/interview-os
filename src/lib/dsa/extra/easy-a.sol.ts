import type { Solution } from "../solutions";
import { randomTree } from "../nodes";

/* eslint-disable @typescript-eslint/no-explicit-any */
type L = { val: number; next: L | null } | null;
type T = { val: number; left: T; right: T } | null;

export const EASY_A_SOL: Record<string, Solution> = {
  "single-number": {
    hints: ["What happens when you XOR a number with itself?", "XOR is associative and commutative, and x ^ 0 = x.", "XOR every element together: the pairs cancel out and the single value remains."],
    brute: { time: "O(n)", idea: "Count occurrences in a hash map (O(n) extra space)." },
    optimal: { time: "O(n)", space: "O(1)", idea: "XOR all values; duplicates cancel." },
    ref: function (nums: number[]) { let x = 0; for (const v of nums) x ^= v; return x; },
    gen: (r) => {
      const out: unknown[][] = [[[7]], [[-1, -1, -2]]];
      for (const n of [5, 101, 29999]) { const vals = r.distinct((n + 1) / 2, -30000, 30000); out.push([r.shuffle([...vals, ...vals.slice(1)])]); }
      return out;
    },
  },
  "counting-bits": {
    hints: ["How is the bit count of i related to the bit count of i / 2?", "Shifting right drops the last bit, which is i & 1.", "ans[i] = ans[i >> 1] + (i & 1), filling from 1 upward."],
    brute: { time: "O(n log n)", idea: "Count the bits of every number separately." },
    optimal: { time: "O(n)", space: "O(1) besides the output", idea: "DP: ans[i] = ans[i >> 1] + (i & 1)." },
    ref: function (n: number) { const a = new Array(n + 1).fill(0); for (let i = 1; i <= n; i++) a[i] = a[i >> 1] + (i & 1); return a; },
    gen: () => [[0], [1], [16], [1000], [100000]],
  },
  "number-of-1-bits": {
    hints: ["Look at the lowest bit with n & 1, then shift.", "There's a trick to clear the lowest set bit in one step.", "n & (n − 1) removes the lowest 1 bit — count how many times until n is 0."],
    brute: { time: "O(32)", idea: "Check all 32 bits." },
    optimal: { time: "O(number of 1 bits)", space: "O(1)", idea: "Repeatedly clear the lowest set bit with n & (n − 1)." },
    ref: function (n: number) { let c = 0; while (n) { n &= n - 1; c++; } return c; },
    gen: (r) => [[0], [1], [2147483647], [1073741824], ...Array.from({ length: 6 }, () => [r.int(0, 2147483647)])],
  },
  "missing-number": {
    hints: ["What should the numbers 0..n add up to?", "Compare that with the actual sum.", "Expected n(n+1)/2 minus the actual sum (or XOR all indices and values)."],
    brute: { time: "O(n log n)", idea: "Sort and find the first index where nums[i] ≠ i." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Gauss sum minus actual sum, or XOR of indices and values." },
    ref: function (nums: number[]) { const n = nums.length; let s = (n * (n + 1)) / 2; for (const v of nums) s -= v; return s; },
    gen: (r) => [[[0]], [[1]], ...[10, 500, 10000].map((n) => { const miss = r.int(0, n); return [r.shuffle(Array.from({ length: n + 1 }, (_, i) => i).filter((x) => x !== miss))]; })],
  },
  "power-of-two": {
    hints: ["How many 1 bits does a power of two have?", "Negative numbers and zero are never powers of two.", "n > 0 && (n & (n − 1)) == 0."],
    brute: { time: "O(log n)", idea: "Divide by 2 while even and check you reach 1." },
    optimal: { time: "O(1)", space: "O(1)", idea: "A positive power of two has exactly one set bit." },
    ref: function (n: number) { return n > 0 && (n & (n - 1)) === 0; },
    gen: () => [[2], [1073741824], [-2147483648], [-16], [6], [1073741823], [536870912], [2147483647]],
  },
  "palindrome-number": {
    hints: ["Negative numbers can't be palindromes; neither can numbers ending in 0 (except 0).", "Reverse only half of the digits.", "Build the reversed lower half until it's ≥ the remaining upper half, then compare (ignoring the middle digit for odd lengths)."],
    brute: { time: "O(d)", idea: "Convert to a string and compare with its reverse." },
    optimal: { time: "O(d)", space: "O(1)", idea: "Reverse half the digits arithmetically and compare." },
    ref: function (x: number) {
      if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
      let rev = 0;
      while (x > rev) { rev = rev * 10 + (x % 10); x = Math.floor(x / 10); }
      return x === rev || x === Math.floor(rev / 10);
    },
    gen: () => [[0], [7], [11], [1221], [12321], [123], [1000021], [2147447412], [-1], [1410110141]],
  },
  "add-digits": {
    hints: ["Try the loop first: sum the digits until one remains.", "The result follows a pattern with period 9.", "Digital root: 0 if num is 0, otherwise 1 + (num − 1) % 9."],
    brute: { time: "O(log n) per round", idea: "Repeatedly sum the digits." },
    optimal: { time: "O(1)", space: "O(1)", idea: "Digital root formula 1 + (n − 1) mod 9." },
    ref: function (num: number) { return num === 0 ? 0 : 1 + ((num - 1) % 9); },
    gen: (r) => [[9], [10], [18], [2147483647], ...Array.from({ length: 5 }, () => [r.int(0, 2147483647)])],
  },
  "excel-column-number": {
    hints: ["It's like reading a number in some base.", "Which base, and where does A start?", "Base 26 with A = 1: result = result × 26 + (letter − 'A' + 1)."],
    brute: { time: "O(n)", idea: "Same as optimal — there's no slower sensible approach." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Base-26 conversion with digits 1..26." },
    ref: function (s: string) { let r = 0; for (const c of s) r = r * 26 + (c.charCodeAt(0) - 64); return r; },
    gen: () => [["Z"], ["AA"], ["AZ"], ["BA"], ["ZZ"], ["AAA"], ["FXSHRXW"]],
  },
  "plus-one": {
    hints: ["Add from the last digit.", "A 9 becomes 0 and carries.", "If every digit was 9, the answer is 1 followed by zeros."],
    brute: { time: "O(n)", idea: "Convert to a big integer and back (breaks for long inputs)." },
    optimal: { time: "O(n)", space: "O(1) extra", idea: "Propagate the carry from the end." },
    ref: function (d: number[]) {
      const a = [...d];
      for (let i = a.length - 1; i >= 0; i--) { if (a[i] < 9) { a[i]++; return a; } a[i] = 0; }
      return [1, ...a];
    },
    gen: (r) => [[[0]], [[1, 9, 9]], [Array(100).fill(9)], [[r.int(1, 9), ...r.arr(99, 0, 9)]], [[r.int(1, 9), ...r.arr(10, 0, 9)]]],
  },
  "happy-number": {
    hints: ["If it never reaches 1, the sequence must repeat.", "Detecting a repeat is cycle detection.", "Use a hash set of seen values, or fast/slow pointers on the sequence."],
    brute: { time: "O(log n) per step", idea: "Remember every value seen in a set." },
    optimal: { time: "O(log n)", space: "O(1)", idea: "Floyd's cycle detection on the digit-square sequence." },
    ref: function (n: number) {
      const next = (x: number) => { let s = 0; while (x) { const d = x % 10; s += d * d; x = Math.floor(x / 10); } return s; };
      let slow = n, fast = next(n);
      while (fast !== 1 && slow !== fast) { slow = next(slow); fast = next(next(fast)); }
      return fast === 1;
    },
    gen: () => [[1], [7], [4], [100], [116], [2147483647], [1111111], [3]],
  },
  "sqrt-x": {
    hints: ["The answer is the largest k with k × k ≤ x.", "That condition is monotonic in k.", "Binary search k in [0, x]; compare k with x / k to avoid overflow."],
    brute: { time: "O(√x)", idea: "Try k = 0, 1, 2, … until k² > x." },
    optimal: { time: "O(log x)", space: "O(1)", idea: "Binary search on the answer (or Newton's method)." },
    ref: function (x: number) { return Math.floor(Math.sqrt(x)); },
    gen: (r) => [[0], [1], [3], [2147483647], [2147395600], ...Array.from({ length: 5 }, () => [r.int(0, 2147483647)])],
  },
  "running-sum": {
    hints: ["Each output depends on the previous output.", "out[i] = out[i − 1] + nums[i].", "Accumulate in one pass."],
    brute: { time: "O(n²)", idea: "Recompute each prefix from scratch." },
    optimal: { time: "O(n)", space: "O(1) extra", idea: "Running total." },
    ref: function (nums: number[]) { const a: number[] = []; let s = 0; for (const v of nums) { s += v; a.push(s); } return a; },
    gen: (r) => [[[0]], [[-5]], [r.arr(20, -100000, 100000)], [r.arr(10000, -100000, 100000)]],
  },
  "pivot-index": {
    hints: ["If you know the total, can you get the right sum from the left sum?", "right = total − left − nums[i].", "One pass keeping a running left sum; return the first i where left == total − left − nums[i]."],
    brute: { time: "O(n²)", idea: "Sum both sides for every index." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Total sum plus a running prefix." },
    ref: function (nums: number[]) {
      const total = nums.reduce((a, b) => a + b, 0);
      let left = 0;
      for (let i = 0; i < nums.length; i++) { if (left === total - left - nums[i]) return i; left += nums[i]; }
      return -1;
    },
    gen: (r) => [[[1]], [[0, 0]], [[-1, -1, 0, 1, 1, 0]], [r.arr(10, -3, 3)], [r.arr(200, -2, 2)], [r.arr(10000, -1000, 1000)]],
  },
  "highest-altitude": {
    hints: ["Track the altitude as a running sum.", "Remember the starting altitude 0 counts too.", "max over prefix sums, including 0."],
    brute: { time: "O(n²)", idea: "Recompute each altitude from the start." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Running sum and running max." },
    ref: function (g: number[]) { let a = 0, best = 0; for (const x of g) { a += x; best = Math.max(best, a); } return best; },
    gen: (r) => [[[-1]], [[5]], [r.arr(100, -100, 100)], [r.arr(50, -10, 3)]],
  },
  "time-to-buy-tickets": {
    hints: ["Simulating the queue works, but think about each person's contribution.", "People ahead of k (and k) buy at most tickets[k] tickets; people behind buy at most tickets[k] − 1.", "Sum min(tickets[i], tickets[k]) for i ≤ k and min(tickets[i], tickets[k] − 1) for i > k."],
    brute: { time: "O(n · max)", idea: "Simulate the queue second by second." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Count each person's purchases before k finishes." },
    ref: function (t: number[], k: number) { let s = 0; for (let i = 0; i < t.length; i++) s += Math.min(t[i], i <= k ? t[k] : t[k] - 1); return s; },
    gen: (r) => [[[1], 0], [[3, 3, 3], 1], ...[10, 100].map((n) => [r.arr(n, 1, 100), r.int(0, n - 1)])],
  },
  "students-unable-to-eat": {
    hints: ["The order of the queue doesn't matter much — why?", "A student can always rotate to the front eventually.", "Count students wanting 0 and 1; go through the sandwich stack and stop at the first sandwich nobody wants."],
    brute: { time: "O(n²)", idea: "Simulate the queue rotations." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Count preferences, then walk the sandwich stack." },
    ref: function (st: number[], sw: number[]) {
      const c = [0, 0]; for (const x of st) c[x]++;
      for (let i = 0; i < sw.length; i++) { if (c[sw[i]] === 0) return sw.length - i; c[sw[i]]--; }
      return 0;
    },
    gen: (r) => [[[0], [1]], [[1], [1]], ...[6, 50, 100].map((n) => [r.arr(n, 0, 1), r.arr(n, 0, 1)])],
  },
  "recent-calls": {
    hints: ["Old requests never come back into the window.", "Keep a queue of times; drop the ones too old from the front.", "Push t, pop while front < t − 3000, answer = queue size."],
    brute: { time: "O(n²)", idea: "For each request, scan all earlier ones." },
    optimal: { time: "O(n)", space: "O(window)", idea: "Queue (or two pointers) over the sorted times." },
    ref: function (times: number[]) { const out: number[] = []; let l = 0; for (let i = 0; i < times.length; i++) { while (times[l] < times[i] - 3000) l++; out.push(i - l + 1); } return out; },
    gen: (r) => {
      const inc = (n: number, step: number) => { let t = 0; return Array.from({ length: n }, () => (t += r.int(1, step))); };
      return [[[3000, 6000]], [[1, 3001, 3002]], [inc(50, 200)], [inc(10000, 500)]];
    },
  },
  "last-stone-weight": {
    hints: ["You always need the two heaviest stones.", "A max-heap gives the largest quickly.", "Pop two, push the difference if non-zero, repeat."],
    brute: { time: "O(n² log n)", idea: "Sort after every smash." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Max-heap simulation." },
    ref: function (stones: number[]) {
      const a = [...stones];
      while (a.length > 1) { a.sort((x, y) => y - x); const y = a.shift()!, x = a.shift()!; if (y !== x) a.push(y - x); }
      return a[0] ?? 0;
    },
    gen: (r) => [[[3, 3]], [[1, 1, 1]], [r.arr(10, 1, 20)], [r.arr(30, 1, 1000)]],
  },
  "relative-ranks": {
    hints: ["You need each athlete's position in the sorted order.", "Sort indices by score, descending.", "Assign medals to the first three sorted indices and numbers after."],
    brute: { time: "O(n²)", idea: "For each athlete count how many scored higher." },
    optimal: { time: "O(n log n)", space: "O(n)", idea: "Sort indices by score (or use a max-heap)." },
    ref: function (score: number[]) {
      const idx = score.map((_, i) => i).sort((a, b) => score[b] - score[a]);
      const out: string[] = new Array(score.length);
      idx.forEach((i, rank) => { out[i] = rank === 0 ? "Gold Medal" : rank === 1 ? "Silver Medal" : rank === 2 ? "Bronze Medal" : String(rank + 1); });
      return out;
    },
    gen: (r) => [[[7]], [[1, 2]], [r.distinct(10, 0, 1000000)], [r.distinct(10000, 0, 1000000)]],
  },
  "roman-to-integer": {
    hints: ["Map each symbol to its value.", "When is a symbol subtracted?", "Scan left to right: subtract a value if the next one is larger, otherwise add it."],
    brute: { time: "O(n)", idea: "Handle each of the six subtractive pairs explicitly." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Compare each symbol with its right neighbour." },
    ref: function (s: string) {
      const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let t = 0;
      for (let i = 0; i < s.length; i++) t += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
      return t;
    },
    gen: (r) => {
      const toRoman = (n: number) => { const m: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]; let s = ""; for (const [v, c] of m) while (n >= v) { s += c; n -= v; } return s; };
      return [1, 4, 9, 40, 3999, 444, 2024, r.int(1, 3999), r.int(1, 3999)].map((n) => [toRoman(n)]);
    },
  },
  "longest-common-prefix": {
    hints: ["The prefix can't be longer than the shortest string.", "Compare character by character across all strings.", "Vertical scan: for each position, check every string; stop at the first mismatch."],
    brute: { time: "O(S)", idea: "Shrink a candidate prefix until every string starts with it." },
    optimal: { time: "O(S)", space: "O(1)", idea: "Vertical scanning (or a trie)." },
    ref: function (strs: string[]) {
      let p = strs[0];
      for (const s of strs) while (!s.startsWith(p)) p = p.slice(0, -1);
      return p;
    },
    gen: (r) => {
      const pre = r.str(30, "ab");
      return [[[""]], [["a"]], [["ab", "a"]], [Array.from({ length: 200 }, () => pre + r.str(r.int(0, 20), "abc"))], [["abc", "abc", "abd"]], [[r.str(200, "z"), r.str(199, "z")]]];
    },
  },
  "isomorphic-strings": {
    hints: ["A mapping must be consistent in both directions.", "Two maps: s→t and t→s.", "For each position check both maps agree, then record the pair."],
    brute: { time: "O(n²)", idea: "For every pair of positions, check equalities match." },
    optimal: { time: "O(n)", space: "O(alphabet)", idea: "Two hash maps (or first-occurrence index patterns)." },
    ref: function (s: string, t: string) {
      const a = new Map<string, string>(), b = new Map<string, string>();
      for (let i = 0; i < s.length; i++) {
        if ((a.has(s[i]) && a.get(s[i]) !== t[i]) || (b.has(t[i]) && b.get(t[i]) !== s[i])) return false;
        a.set(s[i], t[i]); b.set(t[i], s[i]);
      }
      return true;
    },
    gen: (r) => {
      const s = r.str(5000, "abcdefgh");
      const map: Record<string, string> = Object.fromEntries("abcdefgh".split("").map((c, i) => [c, "qrstuvwx"[i]]));
      const t = s.split("").map((c) => map[c]).join("");
      const broken = t.slice(0, 2500) + (t[2500] === "q" ? "r" : "q") + t.slice(2501);
      return [["a", "a"], ["ab", "aa"], ["paper", "title"], [s, t], [s, broken]];
    },
  },
  "ransom-note": {
    hints: ["Only the letter counts matter.", "Count the magazine's letters.", "Decrement counts for each ransom letter; fail if any goes negative."],
    brute: { time: "O(n·m)", idea: "Find and remove each letter from the magazine string." },
    optimal: { time: "O(n + m)", space: "O(26)", idea: "Letter frequency counts." },
    ref: function (note: string, mag: string) { const c = new Array(26).fill(0); for (const ch of mag) c[ch.charCodeAt(0) - 97]++; for (const ch of note) if (--c[ch.charCodeAt(0) - 97] < 0) return false; return true; },
    gen: (r) => { const m = r.str(100000, "abcdefghijklmnopqrstuvwxyz"); return [["z", "z"], ["abc", "cba"], ["aab", "baa"], [r.str(500, "abc"), m], [r.str(99999, "a"), m]]; },
  },
  "intersection-of-arrays": {
    hints: ["Duplicates in the output aren't allowed.", "A set of the first array answers membership quickly.", "Collect values of nums2 that are in set(nums1), using another set to avoid repeats."],
    brute: { time: "O(n·m)", idea: "Nested loops plus de-duplication." },
    optimal: { time: "O(n + m)", space: "O(n)", idea: "Two hash sets." },
    ref: function (a: number[], b: number[]) { const s = new Set(a); return [...new Set(b.filter((x) => s.has(x)))]; },
    gen: (r) => [[[1], [2]], [[1, 1], [1]], [r.arr(50, 0, 30), r.arr(40, 0, 30)], [r.arr(1000, 0, 1000), r.arr(1000, 0, 1000)]],
  },
  "is-subsequence": {
    hints: ["Match characters of s in order.", "Use one pointer per string.", "Advance the s pointer only when characters match; s is a subsequence if it reaches the end."],
    brute: { time: "O(2ⁿ)", idea: "Generate subsequences of t." },
    optimal: { time: "O(|t|)", space: "O(1)", idea: "Two pointers." },
    ref: function (s: string, t: string) { let i = 0; for (const c of t) if (i < s.length && s[i] === c) i++; return i === s.length; },
    gen: (r) => { const t = r.str(10000, "abc"); return [["", ""], ["", "a"], ["a", ""], ["b", "abc"], ["acb", "ahbgdc"], [r.str(100, "abc"), t], [t.split("").filter((_, i) => i % 97 === 0).join("").slice(0, 100), t]]; },
  },
  "merge-sorted-array": {
    hints: ["Filling from the front overwrites values you still need.", "The back of nums1 is empty space.", "Three pointers from the end: place the larger of nums1[i] and nums2[j] at position k."],
    brute: { time: "O((m+n) log(m+n))", idea: "Copy nums2 in and sort." },
    optimal: { time: "O(m + n)", space: "O(1)", idea: "Merge from the back." },
    ref: function (a: number[], m: number, b: number[], n: number) { return [...a.slice(0, m), ...b.slice(0, n)].sort((x, y) => x - y); },
    gen: (r) => {
      const s = (n: number) => r.arr(n, -1000000000, 1000000000).sort((x, y) => x - y);
      return [[3, 50], [0, 5], [5, 0], [200, 200]].map(([m, n]) => { const a = s(m); return [[...a, ...Array(n).fill(0)], m, s(n), n]; });
    },
  },
  "remove-duplicates-sorted": {
    hints: ["Duplicates are adjacent because the array is sorted.", "Keep a write pointer for the next unique slot.", "Copy nums[i] to the write position whenever it differs from the last written value."],
    brute: { time: "O(n)", idea: "Use a set (extra space)." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Two pointers: read and write." },
    ref: function (nums: number[]) { return nums.filter((x, i) => i === 0 || x !== nums[i - 1]); },
    gen: (r) => [[[1]], [[2, 2, 2]], [r.arr(30, -5, 5).sort((a, b) => a - b)], [r.arr(30000, -100, 100).sort((a, b) => a - b)]],
  },
  "search-insert-position": {
    hints: ["Binary search for the first index whose value is ≥ target.", "That's the classic lower-bound search.", "lo = 0, hi = n; while lo < hi: mid; if nums[mid] < target lo = mid + 1 else hi = mid."],
    brute: { time: "O(n)", idea: "Linear scan for the first value ≥ target." },
    optimal: { time: "O(log n)", space: "O(1)", idea: "Lower-bound binary search." },
    ref: function (nums: number[], t: number) { let lo = 0, hi = nums.length; while (lo < hi) { const m = (lo + hi) >> 1; if (nums[m] < t) lo = m + 1; else hi = m; } return lo; },
    gen: (r) => { const a = r.distinct(10000, -100000, 100000).sort((x, y) => x - y); return [[[1], 0], [[1], 2], [[1, 3], 3], [a, a[r.int(0, 9999)]], [a, a[0] - 1], [a, a[9999] + 1], [a, r.int(-100000, 100000)]]; },
  },
  "min-cost-climbing-stairs": {
    hints: ["What's the cheapest way to reach stair i?", "dp[i] = cost[i] + min(dp[i − 1], dp[i − 2]).", "The answer is min(dp[n − 1], dp[n − 2]); two variables are enough."],
    brute: { time: "O(2ⁿ)", idea: "Try every sequence of 1- and 2-steps." },
    optimal: { time: "O(n)", space: "O(1)", idea: "DP over stairs with two rolling values." },
    ref: function (c: number[]) { let a = c[0], b = c[1]; for (let i = 2; i < c.length; i++) [a, b] = [b, c[i] + Math.min(a, b)]; return Math.min(a, b); },
    gen: (r) => [[[0, 0]], [[1, 2]], [r.arr(10, 0, 20)], [r.arr(1000, 0, 999)]],
  },
  "pascals-triangle": {
    hints: ["Each row starts and ends with 1.", "Inner values come from the previous row.", "row[j] = prev[j − 1] + prev[j]."],
    brute: { time: "O(n²)", idea: "Compute binomial coefficients directly." },
    optimal: { time: "O(n²)", space: "O(n²) output", idea: "Build each row from the previous one." },
    ref: function (n: number) { const rows: number[][] = []; for (let i = 0; i < n; i++) { const row = [1]; for (let j = 1; j < i; j++) row.push(rows[i - 1][j - 1] + rows[i - 1][j]); if (i > 0) row.push(1); rows.push(row); } return rows; },
    gen: () => [[2], [3], [10], [30]],
  },
  "symmetric-tree": {
    hints: ["Compare the left subtree with the mirror of the right one.", "Two nodes mirror each other if their values match and their children mirror crosswise.", "mirror(a, b) = a.val == b.val && mirror(a.left, b.right) && mirror(a.right, b.left)."],
    brute: { time: "O(n)", idea: "Invert a copy of one subtree and compare." },
    optimal: { time: "O(n)", space: "O(h)", idea: "Simultaneous DFS (or BFS with pairs)." },
    ref: function (root: any) {
      const st: [T, T][] = [[root.left, root.right]];
      while (st.length) { const [a, b] = st.pop()!; if (!a && !b) continue; if (!a || !b || a.val !== b.val) return false; st.push([a.left, b.right], [a.right, b.left]); }
      return true;
    },
    gen: (r) => {
      const half = randomTree(r, r.arr(15, 0, 9));
      const mirror = (lv: (number | null)[]): (number | null)[] => {
        type N = { v: number; l: N | null; r: N | null } | null;
        const nodes: N[] = lv.map((v) => (v === null ? null : { v, l: null, r: null }));
        const q = nodes[0] ? [nodes[0]] : []; let i = 1;
        for (let k = 0; k < q.length && i < nodes.length; k++) { const n = q[k]!; n.l = nodes[i++] ?? null; if (n.l) q.push(n.l); if (i < nodes.length) { n.r = nodes[i++] ?? null; if (n.r) q.push(n.r); } }
        const flip = (n: N): N => (n ? { v: n.v, l: flip(n.r), r: flip(n.l) } : null);
        const root: N = { v: 0, l: nodes[0] ?? null, r: flip(nodes[0] ?? null) };
        const out: (number | null)[] = []; const qq: N[] = [root];
        for (let k = 0; k < qq.length; k++) { const n = qq[k]; if (!n) { out.push(null); continue; } out.push(n.v); qq.push(n.l, n.r); }
        while (out.length && out[out.length - 1] === null) out.pop();
        return out;
      };
      const sym = mirror(half);
      const asym = [...sym]; const j = asym.findIndex((x, k) => k > 3 && x !== null); if (j > 0) asym[j] = (asym[j] as number) + 1;
      return [[[1]], [[1, 2, 2]], [[1, 2, 3]], [sym], [asym]];
    },
  },
  "path-sum": {
    hints: ["Subtract each node's value from the target as you go down.", "Only leaves can end a path.", "DFS(node, rest): at a leaf, check rest == node.val."],
    brute: { time: "O(n·h)", idea: "List every root-to-leaf path and sum it." },
    optimal: { time: "O(n)", space: "O(h)", idea: "DFS with the remaining sum." },
    ref: function (root: any, target: number) {
      if (!root) return false;
      const st: [NonNullable<T>, number][] = [[root, target - root.val]];
      while (st.length) { const [n, rest] = st.pop()!; if (!n.left && !n.right && rest === 0) return true; if (n.left) st.push([n.left, rest - n.left.val]); if (n.right) st.push([n.right, rest - n.right.val]); }
      return false;
    },
    gen: (r) => [[[1, 2], 1], [[1, 2], 3], [[-2, null, -3], -5], [randomTree(r, r.arr(30, -10, 10)), r.int(-20, 20)], [randomTree(r, r.arr(3000, -1000, 1000), "left"), 0], [randomTree(r, r.arr(500, 0, 3)), 6]],
  },
  "min-depth-binary-tree": {
    hints: ["A node with one child isn't a leaf.", "Breadth-first search finds the nearest leaf first.", "BFS level by level; return the depth of the first node with no children."],
    brute: { time: "O(n)", idea: "DFS over all paths, taking the minimum leaf depth." },
    optimal: { time: "O(n)", space: "O(width)", idea: "BFS, stop at the first leaf." },
    ref: function (root: any) {
      if (!root) return 0;
      let level: NonNullable<T>[] = [root], d = 1;
      for (;;) { const next: NonNullable<T>[] = []; for (const n of level) { if (!n.left && !n.right) return d; if (n.left) next.push(n.left); if (n.right) next.push(n.right); } level = next; d++; }
    },
    gen: (r) => [[[]], [[1]], [[1, 2]], [randomTree(r, r.arr(50, 0, 9))], [randomTree(r, r.arr(3000, 0, 9), "right")], [randomTree(r, r.arr(20000, 0, 9), "balanced")]],
  },
  "remove-list-elements": {
    hints: ["The head itself might need removing.", "A dummy node in front simplifies that.", "Walk with prev; skip nodes whose value matches."],
    brute: { time: "O(n)", idea: "Copy the values you keep into a new list." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Dummy head and in-place unlinking." },
    ref: function (head: any, val: number) {
      const dummy = { val: 0, next: head as L }; let p: NonNullable<L> = dummy;
      while (p.next) { if (p.next.val === val) p.next = p.next.next; else p = p.next; }
      return dummy.next;
    },
    gen: (r) => [[[], 1], [[1], 1], [[1, 2, 1], 1], [r.arr(30, 1, 5), r.int(1, 5)], [r.arr(10000, 1, 50), r.int(1, 50)]],
  },
  "find-town-judge": {
    hints: ["Count how many people each person trusts, and how many trust them.", "The judge trusts 0 people and is trusted by n − 1.", "One pass over trust with an in-degree minus out-degree score; find the person with score n − 1."],
    brute: { time: "O(n · |trust|)", idea: "For each candidate, scan all trust pairs." },
    optimal: { time: "O(n + |trust|)", space: "O(n)", idea: "Net trust score per person." },
    ref: function (n: number, trust: number[][]) { const s = new Array(n + 1).fill(0); for (const [a, b] of trust) { s[a]--; s[b]++; } for (let i = 1; i <= n; i++) if (s[i] === n - 1) return i; return -1; },
    gen: (r) => {
      const withJudge = (n: number) => { const j = r.int(1, n); const t: number[][] = []; for (let i = 1; i <= n; i++) if (i !== j) { t.push([i, j]); if (r.next() < 0.5) { const k = r.int(1, n); if (k !== i && k !== j) t.push([i, k]); } } return [n, t]; };
      return [[1, []], [2, []], [3, [[1, 2], [2, 3]]], withJudge(10), withJudge(1000), [4, [[1, 3], [1, 4], [2, 3], [2, 4], [4, 3]]]];
    },
  },
  "assign-cookies": {
    hints: ["Give the smallest cookie that satisfies the least greedy child.", "Sort both arrays.", "Two pointers: if s[j] ≥ g[i], satisfy child i and move both; otherwise try the next cookie."],
    brute: { time: "O(n·m)", idea: "For each child, search all remaining cookies." },
    optimal: { time: "O(n log n + m log m)", space: "O(1)", idea: "Sort and match greedily with two pointers." },
    ref: function (g: number[], s: number[]) { const a = [...g].sort((x, y) => x - y), b = [...s].sort((x, y) => x - y); let i = 0; for (let j = 0; j < b.length && i < a.length; j++) if (b[j] >= a[i]) i++; return i; },
    gen: (r) => [[[1], []], [[5], [4]], [r.arr(20, 1, 10), r.arr(15, 1, 10)], [r.arr(30000, 1, 1000000), r.arr(30000, 1, 1000000)]],
  },
  "lemonade-change": {
    hints: ["Only 5s and 10s are useful as change.", "For a 20, which change is better to give back?", "Prefer giving 10 + 5 over three 5s; fail if you can't make change."],
    brute: { time: "O(n)", idea: "Same greedy — the trick is the preference order." },
    optimal: { time: "O(n)", space: "O(1)", idea: "Count 5s and 10s; greedy change." },
    ref: function (bills: number[]) {
      let f = 0, t = 0;
      for (const b of bills) {
        if (b === 5) f++;
        else if (b === 10) { if (!f) return false; f--; t++; }
        else if (t && f) { t--; f--; } else if (f >= 3) f -= 3; else return false;
      }
      return true;
    },
    gen: (r) => [[[5]], [[10]], [[5, 5, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 20, 5, 20, 5]], [Array.from({ length: 1000 }, (_, i) => (i < 300 ? 5 : r.pick([5, 10, 20])))], [Array.from({ length: 100000 }, () => r.pick([5, 5, 5, 10, 20]))]],
  },
};
