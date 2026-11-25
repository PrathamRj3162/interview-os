import { describe, it, expect, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { testsFor } from "@/lib/dsa/tests";
import { buildProgram, encodeStdin, makeNonce, starterCode, parseOutput } from "@/lib/dsa/harness";
import { grade } from "@/lib/dsa/grade";
import type { Lang } from "@/lib/dsa/types";
import { PROBLEMS } from "@/lib/dsa/bank";

const dir = mkdtempSync(path.join(tmpdir(), "ios-harness-"));
// Judge0 uses GCC, which ships <bits/stdc++.h>; macOS clang doesn't, so provide a shim for local runs.
const shim = path.join(dir, "include");
mkdirSync(path.join(shim, "bits"), { recursive: true });
writeFileSync(path.join(shim, "bits", "stdc++.h"), ["algorithm", "array", "bitset", "cassert", "climits", "cmath", "cstdio", "cstdlib", "cstring", "deque", "functional", "iomanip", "iostream", "list", "map", "numeric", "queue", "set", "sstream", "stack", "string", "tuple", "unordered_map", "unordered_set", "utility", "vector"].map((h) => `#include <${h}>`).join("\n"));
const has = (cmd: string, args: string[]) => spawnSync(cmd, args).status === 0;
const HAS = { python: has("python3", ["--version"]), cpp: has("g++", ["--version"]), java: has("javac", ["-version"]) && has("java", ["-version"]), javascript: true };

/** Compile + run a generated program locally, mimicking what Judge0 does. */
function execLocal(lang: Lang, program: string, stdin: string, name: string): { stdout: string; stderr: string; status: number | null } {
  const d = path.join(dir, `${name}-${lang}`); mkdirSync(d, { recursive: true });
  const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { input: stdin, cwd: d, maxBuffer: 64 * 1024 * 1024, timeout: 60_000 });
  let r;
  if (lang === "python") { writeFileSync(path.join(d, "main.py"), program); r = run("python3", ["main.py"]); }
  else if (lang === "javascript") { writeFileSync(path.join(d, "main.js"), program); r = run("node", ["main.js"]); }
  else if (lang === "cpp") {
    writeFileSync(path.join(d, "main.cpp"), program);
    const c = spawnSync("g++", ["-std=c++17", "-O2", "-I", shim, "-o", "main", "main.cpp"], { cwd: d });
    if (c.status !== 0) return { stdout: "", stderr: c.stderr.toString(), status: -1 };
    r = run(path.join(d, "main"), []);
  } else {
    writeFileSync(path.join(d, "Main.java"), program);
    const c = spawnSync("javac", ["Main.java"], { cwd: d });
    if (c.status !== 0) return { stdout: "", stderr: c.stderr.toString(), status: -1 };
    r = run("java", ["-cp", d, "Main"]);
  }
  return { stdout: r.stdout.toString(), stderr: r.stderr.toString(), status: r.status };
}

function judge(lang: Lang, slug: string, code: string) {
  const { problem, tests } = testsFor(slug)!;
  const nonce = makeNonce();
  const r = execLocal(lang, buildProgram(lang, problem, code, nonce), encodeStdin(lang, problem, tests.map((t) => t.input)), slug);
  if (r.status === -1) return { status: "compile_error" as const, compileOutput: r.stderr, passed: 0, total: tests.length, tests: [] };
  return grade(problem, tests, { status: r.status === 0 ? "ok" : "runtime_error", stdout: r.stdout, stderr: r.stderr, timeMs: null }, nonce, "judge0");
}

// Hand-written solutions in each language, chosen to cover every value type the harness supports.
const SOLS: Record<string, Partial<Record<Lang, string>>> = {
  "two-sum": {
    python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, x in enumerate(nums):\n            if target - x in seen:\n                return [seen[target - x], i]\n            seen[x] = i\n",
    cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<long long,int> m;\n        for (int i = 0; i < (int)nums.size(); i++) {\n            auto it = m.find((long long)target - nums[i]);\n            if (it != m.end()) return {it->second, i};\n            m[nums[i]] = i;\n        }\n        return {};\n    }\n};\n",
    java: "public class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Long,Integer> m = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            Integer j = m.get((long) target - nums[i]);\n            if (j != null) return new int[]{j, i};\n            m.put((long) nums[i], i);\n        }\n        return new int[0];\n    }\n}\n",
  },
  "group-anagrams": {
    python: "class Solution:\n    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n        d = defaultdict(list)\n        for w in strs:\n            d[''.join(sorted(w))].append(w)\n        return list(d.values())\n",
    cpp: "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        map<string, vector<string>> m;\n        for (auto& w : strs) { string k = w; sort(k.begin(), k.end()); m[k].push_back(w); }\n        vector<vector<string>> r; for (auto& [k, v] : m) r.push_back(v); return r;\n    }\n};\n",
    java: "class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        Map<String, List<String>> m = new HashMap<>();\n        for (String w : strs) { char[] c = w.toCharArray(); Arrays.sort(c); m.computeIfAbsent(new String(c), k -> new ArrayList<>()).add(w); }\n        return new ArrayList<>(m.values());\n    }\n}\n",
  },
  "valid-palindrome": {
    python: "class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        t = [c.lower() for c in s if c.isalnum()]\n        return t == t[::-1]\n",
    cpp: "class Solution {\npublic:\n    bool isPalindrome(string s) {\n        int i = 0, j = (int)s.size() - 1;\n        while (i < j) {\n            if (!isalnum((unsigned char)s[i])) { i++; continue; }\n            if (!isalnum((unsigned char)s[j])) { j--; continue; }\n            if (tolower(s[i]) != tolower(s[j])) return false;\n            i++; j--;\n        }\n        return true;\n    }\n};\n",
    java: "class Solution {\n    public boolean isPalindrome(String s) {\n        String t = s.toLowerCase().replaceAll(\"[^a-z0-9]\", \"\");\n        return new StringBuilder(t).reverse().toString().equals(t);\n    }\n}\n",
  },
  "median-two-sorted": {
    python: "class Solution:\n    def findMedianSortedArrays(self, a: List[int], b: List[int]) -> float:\n        c = sorted(a + b); n = len(c)\n        return c[n // 2] if n % 2 else (c[n // 2 - 1] + c[n // 2]) / 2\n",
    cpp: "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {\n        vector<int> c(a); c.insert(c.end(), b.begin(), b.end()); sort(c.begin(), c.end());\n        int n = c.size(); return n % 2 ? c[n / 2] : (c[n / 2 - 1] + c[n / 2]) / 2.0;\n    }\n};\n",
    java: "class Solution {\n    public double findMedianSortedArrays(int[] a, int[] b) {\n        int[] c = new int[a.length + b.length]; System.arraycopy(a, 0, c, 0, a.length); System.arraycopy(b, 0, c, a.length, b.length); Arrays.sort(c);\n        int n = c.length; return n % 2 == 1 ? c[n / 2] : (c[n / 2 - 1] + c[n / 2]) / 2.0;\n    }\n}\n",
  },
  "merge-intervals": {
    python: "class Solution:\n    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n        res = []\n        for s, e in sorted(intervals):\n            if res and s <= res[-1][1]: res[-1][1] = max(res[-1][1], e)\n            else: res.append([s, e])\n        return res\n",
    cpp: "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& in) {\n        sort(in.begin(), in.end()); vector<vector<int>> r;\n        for (auto& v : in) { if (!r.empty() && v[0] <= r.back()[1]) r.back()[1] = max(r.back()[1], v[1]); else r.push_back(v); }\n        return r;\n    }\n};\n",
    java: "class Solution {\n    public int[][] merge(int[][] in) {\n        Arrays.sort(in, (x, y) -> x[0] - y[0]); List<int[]> r = new ArrayList<>();\n        for (int[] v : in) { if (!r.isEmpty() && v[0] <= r.get(r.size() - 1)[1]) r.get(r.size() - 1)[1] = Math.max(r.get(r.size() - 1)[1], v[1]); else r.add(v); }\n        return r.toArray(new int[0][]);\n    }\n}\n",
  },
  "number-of-islands": {
    python: "class Solution:\n    def numIslands(self, grid: List[str]) -> int:\n        g = [list(r) for r in grid]; R, C = len(g), len(g[0]); n = 0\n        for i in range(R):\n            for j in range(C):\n                if g[i][j] == '1':\n                    n += 1; st = [(i, j)]; g[i][j] = '0'\n                    while st:\n                        a, b = st.pop()\n                        for x, y in ((a+1,b),(a-1,b),(a,b+1),(a,b-1)):\n                            if 0 <= x < R and 0 <= y < C and g[x][y] == '1':\n                                g[x][y] = '0'; st.append((x, y))\n        return n\n",
    cpp: "class Solution {\npublic:\n    int numIslands(vector<string>& g) {\n        int R = g.size(), C = g[0].size(), n = 0;\n        for (int i = 0; i < R; i++) for (int j = 0; j < C; j++) if (g[i][j] == '1') {\n            n++; vector<pair<int,int>> st{{i, j}}; g[i][j] = '0';\n            while (!st.empty()) { auto [a, b] = st.back(); st.pop_back(); int d[5] = {1, 0, -1, 0, 1};\n                for (int k = 0; k < 4; k++) { int x = a + d[k], y = b + d[k + 1]; if (x >= 0 && y >= 0 && x < R && y < C && g[x][y] == '1') { g[x][y] = '0'; st.push_back({x, y}); } } }\n        }\n        return n;\n    }\n};\n",
  },
  "min-window-substring": {
    python: "class Solution:\n    def minWindow(self, s: str, t: str) -> str:\n        need = Counter(t); missing = len(t); l = 0; best = (0, float('inf'))\n        for r, c in enumerate(s):\n            if need[c] > 0: missing -= 1\n            need[c] -= 1\n            while missing == 0:\n                if r - l + 1 < best[1] - best[0]: best = (l, r + 1)\n                need[s[l]] += 1\n                if need[s[l]] > 0: missing += 1\n                l += 1\n        return '' if best[1] == float('inf') else s[best[0]:best[1]]\n",
    java: "class Solution {\n    public String minWindow(String s, String t) {\n        int[] need = new int[128]; for (char c : t.toCharArray()) need[c]++;\n        int missing = t.length(), l = 0, bs = 0, bl = Integer.MAX_VALUE;\n        for (int r = 0; r < s.length(); r++) { if (need[s.charAt(r)]-- > 0) missing--;\n            while (missing == 0) { if (r - l + 1 < bl) { bl = r - l + 1; bs = l; } if (++need[s.charAt(l++)] > 0) missing++; } }\n        return bl == Integer.MAX_VALUE ? \"\" : s.substring(bs, bs + bl);\n    }\n}\n",
  },
  // Linked lists and trees: conversions in and out of every language.
  "reverse-linked-list": {
    python: "class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        prev = None\n        while head:\n            head.next, prev, head = prev, head, head.next\n        return prev\n",
    cpp: "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        ListNode* prev = nullptr;\n        while (head) { ListNode* n = head->next; head->next = prev; prev = head; head = n; }\n        return prev;\n    }\n};\n",
    java: "class Solution {\n    public ListNode reverseList(ListNode head) {\n        ListNode prev = null;\n        while (head != null) { ListNode n = head.next; head.next = prev; prev = head; head = n; }\n        return prev;\n    }\n}\n",
    // The candidate defines their own ListNode class and builds new nodes: must not clash with the runner's.
    javascript: "class ListNode { constructor(val, next) { this.val = val ?? 0; this.next = next ?? null; } }\nfunction reverseList(head) {\n  let out = null;\n  for (let n = head; n; n = n.next) out = new ListNode(n.val, out);\n  return out;\n}\n",
  },
  "add-two-numbers": {
    python: "class Solution:\n    def addTwoNumbers(self, l1, l2):\n        d = t = ListNode()\n        c = 0\n        while l1 or l2 or c:\n            s = (l1.val if l1 else 0) + (l2.val if l2 else 0) + c\n            c, v = divmod(s, 10)\n            t.next = ListNode(v); t = t.next\n            l1 = l1.next if l1 else None\n            l2 = l2.next if l2 else None\n        return d.next\n",
  },
  "build-tree-preorder-inorder": {
    python: "class Solution:\n    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:\n        idx = {v: i for i, v in enumerate(inorder)}\n        it = iter(preorder)\n        def go(lo, hi):\n            if lo > hi:\n                return None\n            v = next(it)\n            n = TreeNode(v)\n            n.left = go(lo, idx[v] - 1)\n            n.right = go(idx[v] + 1, hi)\n            return n\n        return go(0, len(inorder) - 1)\n",
    cpp: "class Solution {\n    unordered_map<int,int> idx; int p = 0;\n    TreeNode* go(vector<int>& pre, int lo, int hi) {\n        if (lo > hi) return nullptr;\n        int v = pre[p++]; TreeNode* n = new TreeNode(v);\n        n->left = go(pre, lo, idx[v] - 1); n->right = go(pre, idx[v] + 1, hi);\n        return n;\n    }\npublic:\n    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {\n        for (int i = 0; i < (int)inorder.size(); i++) idx[inorder[i]] = i;\n        return go(preorder, 0, (int)inorder.size() - 1);\n    }\n};\n",
    java: "class Solution {\n    Map<Integer,Integer> idx = new HashMap<>(); int p = 0;\n    TreeNode go(int[] pre, int lo, int hi) {\n        if (lo > hi) return null;\n        int v = pre[p++]; TreeNode n = new TreeNode(v);\n        n.left = go(pre, lo, idx.get(v) - 1); n.right = go(pre, idx.get(v) + 1, hi);\n        return n;\n    }\n    public TreeNode buildTree(int[] preorder, int[] inorder) {\n        for (int i = 0; i < inorder.length; i++) idx.put(inorder[i], i);\n        return go(preorder, 0, inorder.length - 1);\n    }\n}\n",
  },
  "level-order-traversal": {
    cpp: "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        vector<vector<int>> out; if (!root) return out;\n        queue<TreeNode*> q; q.push(root);\n        while (!q.empty()) {\n            int n = q.size(); out.push_back({});\n            while (n--) { auto x = q.front(); q.pop(); out.back().push_back(x->val); if (x->left) q.push(x->left); if (x->right) q.push(x->right); }\n        }\n        return out;\n    }\n};\n",
  },
  "same-tree": {
    java: "class Solution {\n    public boolean isSameTree(TreeNode p, TreeNode q) {\n        if (p == null || q == null) return p == q;\n        return p.val == q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);\n    }\n}\n",
  },
  "lca-bst": {
    java: "class Solution {\n    public int lowestCommonAncestor(TreeNode root, int p, int q) {\n        while (true) {\n            if (p < root.val && q < root.val) root = root.left;\n            else if (p > root.val && q > root.val) root = root.right;\n            else return root.val;\n        }\n    }\n}\n",
  },
  "max-path-sum": {
    cpp: "class Solution {\n    int best = INT_MIN;\n    int gain(TreeNode* n) {\n        if (!n) return 0;\n        int a = max(0, gain(n->left)), b = max(0, gain(n->right));\n        best = max(best, n->val + a + b);\n        return n->val + max(a, b);\n    }\npublic:\n    int maxPathSum(TreeNode* root) { gain(root); return best; }\n};\n",
  },
  "invert-binary-tree": {
    python: "class Solution:\n    def invertTree(self, root):\n        if root:\n            root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)\n        return root\n",
  },
};

const cases = Object.entries(SOLS).flatMap(([slug, by]) => (Object.entries(by) as [Lang, string][]).map(([lang, code]) => [lang, slug, code] as const));

describe("language harnesses (local toolchains)", () => {
  it.each(cases)("%s %s passes every test", (lang, slug, code) => {
    if (!HAS[lang]) return; // toolchain missing locally; CI (ubuntu) has all of them
    const out = judge(lang, slug, code);
    const bad = out.tests.filter((t) => t.verdict !== "pass");
    expect(bad, JSON.stringify(bad.slice(0, 2)) + ("compileOutput" in out ? out.compileOutput ?? "" : "")).toEqual([]);
    expect(out.status).toBe("accepted");
  }, 30_000);

  it.each(PROBLEMS.map((p) => [p.slug]))("%s: starter code compiles in C++ (and fails tests, not the build)", (slug) => {
    if (!HAS.cpp) return;
    const out = judge("cpp", slug, starterCode(testsFor(slug)!.problem, "cpp"));
    expect(out.status).not.toBe("compile_error");
  }, 30_000);

  it("Java starter code compiles for every signature", () => {
    if (!HAS.java) return;
    for (const p of PROBLEMS) expect(judge("java", p.slug, starterCode(p, "java")).status, p.slug).not.toBe("compile_error");
  }, 180_000); // javac × 59 takes ~45 s on CI

  it("Python and JS starter code run (and simply fail)", () => {
    for (const lang of ["python", "javascript"] as const) {
      if (!HAS[lang]) continue;
      const out = judge(lang, "two-sum", starterCode(testsFor("two-sum")!.problem, lang));
      expect(out.status).toBe("wrong_answer");
    }
  });
});

describe("grading edge cases", () => {
  it("keeps going after a per-test exception and reports it", () => {
    const code = "class Solution:\n    def twoSum(self, nums, target):\n        if len(nums) == 2: raise ValueError('boom')\n        d = {}\n        for i, x in enumerate(nums):\n            if target - x in d: return [d[target - x], i]\n            d[x] = i\n";
    const out = judge("python", "two-sum", code);
    expect(out.status).toBe("runtime_error");
    expect(out.tests.some((t) => t.verdict === "error" && t.error?.includes("boom"))).toBe(true);
    expect(out.tests.filter((t) => t.verdict === "pass").length).toBeGreaterThan(3);
  });

  it("separates debug prints from results and ignores spoofed markers", () => {
    const code = "function twoSum(nums, target) { console.log('debug', nums.length); console.log('@@R:000000000000@@0 [0,1]'); return [-1, -1]; }";
    const out = judge("javascript", "two-sum", code);
    expect(out.passed).toBe(0);
    expect(out.status).toBe("wrong_answer");
    if ("stdout" in out) expect(out.stdout).toContain("debug");
  });

  it("reveals only the first failing hidden test", () => {
    const out = judge("javascript", "two-sum", "function twoSum(){ return [0, 0]; }");
    const shown = out.tests.filter((t) => t.hidden && t.input);
    expect(shown).toHaveLength(1);
    expect(out.tests.filter((t) => !t.hidden).every((t) => t.input && t.expected)).toBe(true);
  });

  it("reports compile errors", () => {
    if (!HAS.cpp) return;
    expect(judge("cpp", "two-sum", "class Solution { public: vector<int> twoSum(vector<int>& a, int t) { return oops; } };").status).toBe("compile_error");
  });

  it("parses the last marker per index", () => {
    const { results } = parseOutput("x\n@@R:ab@@0 1\n@@R:ab@@0 2\n@@E:ab@@1 boom\n@@R:zz@@1 9", 3, "ab");
    expect(results[0]).toMatchObject({ kind: "ok", value: 2 });
    expect(results[1]).toMatchObject({ kind: "error" });
    expect(results[2]).toMatchObject({ kind: "missing" });
  });

  it("encodes strings with spaces and empties for token-based languages", () => {
    const p = testsFor("valid-palindrome")!.problem;
    expect(encodeStdin("cpp", p, [[" a b "], [""]])).toBe("2\n5  a b \n0 \n");
  });
});


describe("line numbers", () => {
  it("maps compiler line numbers back to the candidate's code", async () => {
    const { codeLineOffset, fixLineNumbers } = await import("@/lib/dsa/harness");
    const p = testsFor("two-sum")!.problem;
    const off = codeLineOffset("python", p);
    const prog = buildProgram("python", p, "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n", "n");
    expect(prog.split("\n")[off]).toBe("class Solution:");
    expect(fixLineNumbers("python", `File "x", line ${off + 3}`, off)).toBe('File "x", line 3');
  });
});
