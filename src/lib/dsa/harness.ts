import type { Lang, Problem, ValueType } from "./types";

/**
 * Turns a candidate's solution into a complete program that runs every test case in ONE process.
 * Each test prints a marker line `@@R:<nonce>@@<i> <json>` (result) or `@@E:<nonce>@@<i> <msg>` (exception),
 * preceded by `@@T:<nonce>@@<i> <ms>`: how long the call itself took (input parsing excluded).
 * Anything else on stdout is the candidate's own debug output. The nonce stops debug prints from being
 * mistaken for results; for each index the last marker wins, because ours is printed after the call returns.
 *
 * Input format: Python and JavaScript read JSON from stdin. C++ and Java read a simple token stream
 * (no JSON library needed): numbers as tokens, bool as 1/0, strings as `<len> <raw chars>`,
 * and arrays as `<n>` followed by their elements.
 */

// ───────────────────────── Type mapping ─────────────────────────

const PY: Record<ValueType, string> = {
  int: "int", double: "float", bool: "bool", string: "str",
  "int[]": "List[int]", "string[]": "List[str]", "int[][]": "List[List[int]]", "string[][]": "List[List[str]]",
  ListNode: "Optional[ListNode]", TreeNode: "Optional[TreeNode]",
};
const JSDOC: Record<ValueType, string> = {
  int: "number", double: "number", bool: "boolean", string: "string",
  "int[]": "number[]", "string[]": "string[]", "int[][]": "number[][]", "string[][]": "string[][]",
  ListNode: "ListNode | null", TreeNode: "TreeNode | null",
};
const CPP: Record<ValueType, string> = {
  int: "int", double: "double", bool: "bool", string: "string",
  "int[]": "vector<int>", "string[]": "vector<string>", "int[][]": "vector<vector<int>>", "string[][]": "vector<vector<string>>",
  ListNode: "ListNode*", TreeNode: "TreeNode*",
};
const JAVA: Record<ValueType, string> = {
  int: "int", double: "double", bool: "boolean", string: "String",
  "int[]": "int[]", "string[]": "String[]", "int[][]": "int[][]", "string[][]": "List<List<String>>",
  ListNode: "ListNode", TreeNode: "TreeNode",
};
const JAVA_DEFAULT: Record<ValueType, string> = {
  int: "0", double: "0.0", bool: "false", string: '""',
  "int[]": "new int[0]", "string[]": "new String[0]", "int[][]": "new int[0][0]", "string[][]": "new ArrayList<>()",
  ListNode: "null", TreeNode: "null",
};
const JAVA_READ: Record<ValueType, string> = {
  int: "rI()", double: "rD()", bool: "rB()", string: "rS()",
  "int[]": "rIA()", "string[]": "rSA()", "int[][]": "rIAA()", "string[][]": "rSAA()",
  ListNode: "rL()", TreeNode: "rT()",
};
const cppParam = (t: ValueType) => (t.endsWith("]") || t === "string" ? `${CPP[t]}&` : CPP[t]);

// ───────────────────────── Linked lists & trees ─────────────────────────

/** Which node types a problem uses (in its parameters or its return type). */
export function nodeTypes(p: Problem) {
  const all = [...p.params.map((x) => x.type), p.returns];
  return { list: all.includes("ListNode"), tree: all.includes("TreeNode") };
}

const DEFS: Record<Lang, { list: string; tree: string }> = {
  python: {
    list: "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next",
    tree: "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right",
  },
  javascript: {
    list: "// function ListNode(val, next) { this.val = val ?? 0; this.next = next ?? null; }",
    tree: "// function TreeNode(val, left, right) { this.val = val ?? 0; this.left = left ?? null; this.right = right ?? null; }",
  },
  cpp: {
    list: "// struct ListNode {\n//     int val; ListNode *next;\n//     ListNode() : val(0), next(nullptr) {}\n//     ListNode(int x) : val(x), next(nullptr) {}\n//     ListNode(int x, ListNode *next) : val(x), next(next) {}\n// };",
    tree: "// struct TreeNode {\n//     int val; TreeNode *left, *right;\n//     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n//     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n//     TreeNode(int x, TreeNode *l, TreeNode *r) : val(x), left(l), right(r) {}\n// };",
  },
  java: {
    list: "// class ListNode {\n//     int val; ListNode next;\n//     ListNode() {}\n//     ListNode(int val) { this.val = val; }\n//     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n// }",
    tree: "// class TreeNode {\n//     int val; TreeNode left, right;\n//     TreeNode() {}\n//     TreeNode(int val) { this.val = val; }\n//     TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }\n// }",
  },
};

/** "Definition for ..." comment shown above the starter (already provided by the runner — don't redefine it). */
function nodeComment(p: Problem, lang: Lang) {
  const { list, tree } = nodeTypes(p);
  if (!list && !tree) return "";
  const c = lang === "python" ? "#" : "//";
  const parts = [`${c} Already defined for you (don't redefine):`];
  if (list) parts.push(DEFS[lang].list);
  if (tree) parts.push(DEFS[lang].tree);
  return parts.join("\n") + "\n\n";
}

// ───────────────────────── Starter code ─────────────────────────

export function starterCode(p: Problem, lang: Lang): string {
  return nodeComment(p, lang) + starterBody(p, lang);
}

function starterBody(p: Problem, lang: Lang): string {
  const names = p.params.map((x) => x.name);
  switch (lang) {
    case "python":
      return `class Solution:\n    def ${p.fn}(self, ${p.params.map((x) => `${x.name}: ${PY[x.type]}`).join(", ")}) -> ${PY[p.returns]}:\n        pass\n`;
    case "javascript":
      return `/**\n${p.params.map((x) => ` * @param {${JSDOC[x.type]}} ${x.name}`).join("\n")}\n * @return {${JSDOC[p.returns]}}\n */\nfunction ${p.fn}(${names.join(", ")}) {\n  \n}\n`;
    case "cpp":
      return `class Solution {\npublic:\n    ${CPP[p.returns]} ${p.fn}(${p.params.map((x) => `${cppParam(x.type)} ${x.name}`).join(", ")}) {\n        \n        return {};\n    }\n};\n`;
    case "java":
      return `class Solution {\n    public ${JAVA[p.returns]} ${p.fn}(${p.params.map((x) => `${JAVA[x.type]} ${x.name}`).join(", ")}) {\n        \n        return ${JAVA_DEFAULT[p.returns]};\n    }\n}\n`;
  }
}

// ───────────────────────── Stdin encoding ─────────────────────────

function tokens(t: ValueType, v: unknown): string {
  switch (t) {
    case "int": case "double": return String(v);
    case "bool": return v ? "1" : "0";
    case "string": { const s = String(v); return `${s.length} ${s}`; }
    case "int[]": return [(v as unknown[]).length, ...(v as unknown[]).map((x) => tokens("int", x))].join(" ");
    case "string[]": return [(v as unknown[]).length, ...(v as unknown[]).map((x) => tokens("string", x))].join("\n");
    case "int[][]": return [(v as unknown[]).length, ...(v as unknown[]).map((x) => tokens("int[]", x))].join("\n");
    case "string[][]": return [(v as unknown[]).length, ...(v as unknown[]).map((x) => tokens("string[]", x))].join("\n");
    case "ListNode": return tokens("int[]", v);
    case "TreeNode": return [(v as unknown[]).length, ...(v as unknown[]).map((x) => (x === null || x === undefined ? "#" : String(x)))].join(" ");
  }
}

export function encodeStdin(lang: Lang, p: Problem, inputs: unknown[][]): string {
  if (lang === "python" || lang === "javascript") return JSON.stringify(inputs);
  const out = [String(inputs.length)];
  for (const args of inputs) p.params.forEach((param, i) => out.push(tokens(param.type, args[i])));
  return out.join("\n") + "\n";
}

// ───────────────────────── Program builders ─────────────────────────

const PY_PRELUDE = `import sys, json, math, time, heapq, bisect, itertools, functools, collections
from typing import *
from collections import *
from functools import lru_cache, cache
sys.setrecursionlimit(10000)

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
`;

const PY_NODES = `
def __to_list(a):
    h = None
    for v in reversed(a):
        h = ListNode(v, h)
    return h

def __from_list(h):
    out = []
    while h is not None:
        if len(out) >= 200000:
            raise ValueError("returned list has a cycle or is too long")
        out.append(h.val)
        h = h.next
    return out

def __to_tree(a):
    if not a or a[0] is None:
        return None
    root = TreeNode(a[0]); q = [root]; i = 1; k = 0
    while k < len(q) and i < len(a):
        n = q[k]; k += 1
        if i < len(a) and a[i] is not None:
            n.left = TreeNode(a[i]); q.append(n.left)
        i += 1
        if i < len(a) and a[i] is not None:
            n.right = TreeNode(a[i]); q.append(n.right)
        i += 1
    return root

def __from_tree(r):
    out = []; q = [r]; k = 0
    while k < len(q):
        if k > 400000:
            raise ValueError("returned tree has a cycle or is too large")
        n = q[k]; k += 1
        if n is None:
            out.append(None); continue
        out.append(n.val); q.append(n.left); q.append(n.right)
    while out and out[-1] is None:
        out.pop()
    return out

def __ident(x):
    return x
`;
const pyConv = (t: ValueType, dir: "in" | "out") => (t === "ListNode" ? (dir === "in" ? "__to_list" : "__from_list") : t === "TreeNode" ? (dir === "in" ? "__to_tree" : "__from_tree") : "__ident");

function python(p: Problem, code: string, nonce: string) {
  return `${PY_PRELUDE}
${code}

def __ser(x):
    return json.dumps(x, separators=(",", ":"), default=lambda o: list(o))
${PY_NODES}
__CONV = [${p.params.map((x) => pyConv(x.type, "in")).join(", ")}]
__OUT = ${pyConv(p.returns, "out")}

def __main():
    data = json.loads(sys.stdin.read())
    if "Solution" in globals():
        fn = getattr(Solution(), "${p.fn}", None)
    else:
        fn = globals().get("${p.fn}")
    for i, args in enumerate(data):
        try:
            if fn is None:
                raise NameError("method ${p.fn} not found — keep the given signature")
            args = [c(a) for c, a in zip(__CONV, args)]
            __t = time.perf_counter()
            r = fn(*args)
            __ms = (time.perf_counter() - __t) * 1000
            r = __OUT(r)
            print("\\n@@T:${nonce}@@%d %.1f" % (i, __ms), flush=True)
            print("\\n@@R:${nonce}@@%d %s" % (i, __ser(r)), flush=True)
        except Exception as e:
            print("\\n@@E:${nonce}@@%d %s: %s" % (i, type(e).__name__, str(e)[:300]), flush=True)

__main()
`;
}

// Defined only if the candidate's code didn't define its own (a duplicate declaration would be a syntax error).
const JS_NODES = `
if (typeof ListNode === "undefined") globalThis.ListNode = function ListNode(val, next) { this.val = val === undefined ? 0 : val; this.next = next === undefined ? null : next; };
if (typeof TreeNode === "undefined") globalThis.TreeNode = function TreeNode(val, left, right) { this.val = val === undefined ? 0 : val; this.left = left === undefined ? null : left; this.right = right === undefined ? null : right; };
`;
const JS_CONV = `
  const toList = (a) => { let h = null; for (let i = a.length - 1; i >= 0; i--) h = new ListNode(a[i], h); return h; };
  const fromList = (h) => { const o = []; for (let n = h; n; n = n.next) { if (o.length >= 200000) throw new Error("returned list has a cycle or is too long"); o.push(n.val); } return o; };
  const toTree = (a) => {
    if (!a.length || a[0] === null) return null;
    const root = new TreeNode(a[0]); const q = [root]; let i = 1;
    for (let k = 0; k < q.length && i < a.length; k++) {
      const n = q[k];
      if (i < a.length && a[i] !== null) { n.left = new TreeNode(a[i]); q.push(n.left); } i++;
      if (i < a.length && a[i] !== null) { n.right = new TreeNode(a[i]); q.push(n.right); } i++;
    }
    return root;
  };
  const fromTree = (r) => {
    const o = []; const q = [r];
    for (let k = 0; k < q.length; k++) {
      if (k > 400000) throw new Error("returned tree has a cycle or is too large");
      const n = q[k]; if (!n) { o.push(null); continue; } o.push(n.val); q.push(n.left, n.right);
    }
    while (o.length && o[o.length - 1] === null) o.pop();
    return o;
  };
  const ident = (x) => x;
`;
const jsConv = (t: ValueType, dir: "in" | "out") => (t === "ListNode" ? (dir === "in" ? "toList" : "fromList") : t === "TreeNode" ? (dir === "in" ? "toTree" : "fromTree") : "ident");

function javascript(p: Problem, code: string, nonce: string) {
  const nodes = nodeTypes(p);
  return `${code}
${nodes.list || nodes.tree ? JS_NODES : ""}
;(function () {
  const raw = typeof __STDIN__ === "string" ? __STDIN__ : require("fs").readFileSync(0, "utf8");
  const data = JSON.parse(raw);
  const fn = typeof ${p.fn} === "function" ? ${p.fn}
    : (typeof Solution === "function" && typeof new Solution().${p.fn} === "function") ? ((s) => s.${p.fn}.bind(s))(new Solution()) : null;
  const ser = (x) => { const s = JSON.stringify(x === undefined ? null : x); return s === undefined ? "null" : s; };
${nodes.list || nodes.tree ? JS_CONV : "  const ident = (x) => x;"}
  const conv = [${p.params.map((x) => jsConv(x.type, "in")).join(", ")}];
  const out = ${jsConv(p.returns, "out")};
  data.forEach((args, i) => {
    try {
      if (!fn) throw new ReferenceError("function ${p.fn} not found — keep the given signature");
      const clock = typeof performance !== "undefined" ? performance : Date;
      const a = args.map((v, k) => conv[k](v));
      const t0 = clock.now();
      let r = fn(...a);
      console.log("\\n@@T:${nonce}@@" + i + " " + (clock.now() - t0).toFixed(1));
      r = out(r);
      console.log("\\n@@R:${nonce}@@" + i + " " + ser(r));
    } catch (e) {
      console.log("\\n@@E:${nonce}@@" + i + " " + String(e && e.name ? e.name + ": " + e.message : e).slice(0, 300));
    }
  });
})();
`;
}

const CPP_PRELUDE = `#include <bits/stdc++.h>
using namespace std;
`;

const CPP_LIST = `struct ListNode {
    int val; ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
`;
const CPP_TREE = `struct TreeNode {
    int val; TreeNode *left, *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *l, TreeNode *r) : val(x), left(l), right(r) {}
};
`;
const CPP_LIST_IO = `
namespace __io {
void rd(ListNode*& h) { int n; cin >> n; ListNode d; ListNode* c = &d; for (int i = 0; i < n; i++) { long long v; cin >> v; c->next = new ListNode((int)v); c = c->next; } h = d.next; }
string js(ListNode* h) {
  string o = "["; int n = 0;
  for (ListNode* c = h; c; c = c->next) { if (++n > 200000) throw runtime_error("returned list has a cycle or is too long"); if (n > 1) o += ","; o += to_string(c->val); }
  return o + "]";
}
}
`;
const CPP_TREE_IO = `
namespace __io {
void rd(TreeNode*& root) {
  int n; cin >> n; vector<TreeNode*> a(n, nullptr);
  for (int i = 0; i < n; i++) { string t; cin >> t; if (t != "#") a[i] = new TreeNode(stoi(t)); }
  root = n ? a[0] : nullptr; if (!root) return;
  deque<TreeNode*> q{root}; int i = 1;
  while (!q.empty() && i < n) {
    TreeNode* x = q.front(); q.pop_front();
    if (i < n) { x->left = a[i++]; if (x->left) q.push_back(x->left); }
    if (i < n) { x->right = a[i++]; if (x->right) q.push_back(x->right); }
  }
}
string js(TreeNode* root) {
  vector<string> out; deque<TreeNode*> q{root}; size_t k = 0;
  while (!q.empty()) {
    if (++k > 400000) throw runtime_error("returned tree has a cycle or is too large");
    TreeNode* x = q.front(); q.pop_front();
    if (!x) { out.push_back("null"); continue; }
    out.push_back(to_string(x->val)); q.push_back(x->left); q.push_back(x->right);
  }
  while (!out.empty() && out.back() == "null") out.pop_back();
  string o = "["; for (size_t i = 0; i < out.size(); i++) { if (i) o += ","; o += out[i]; } return o + "]";
}
}
`;

const CPP_IO = `
namespace __io {
void rd(int& x) { long long t; cin >> t; x = (int)t; }
void rd(double& x) { cin >> x; }
void rd(bool& x) { int t; cin >> t; x = t != 0; }
void rd(string& s) { int n; cin >> n; cin.get(); s.assign(n, '\\0'); if (n) cin.read(&s[0], n); }
template <class T> void rd(vector<T>& v) { int n; cin >> n; v.resize(n); for (auto& e : v) rd(e); }
string js(int x) { return to_string(x); }
string js(long long x) { return to_string(x); }
string js(double x) { if (!isfinite(x)) return "null"; ostringstream o; o << setprecision(12) << x; return o.str(); }
string js(bool x) { return x ? "true" : "false"; }
string js(const string& s) {
  string o = "\\"";
  for (unsigned char c : s) {
    if (c == '"' || c == '\\\\') { o += '\\\\'; o += (char)c; }
    else if (c == '\\n') o += "\\\\n";
    else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\\\u%04x", c); o += b; }
    else o += (char)c;
  }
  return o + "\\"";
}
string js(const char* s) { return js(string(s)); }
template <class T> string js(const vector<T>& v) {
  string o = "[";
  for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += js(v[i]); }
  return o + "]";
}
}
`;

function cpp(p: Problem, code: string, nonce: string) {
  const decl = p.params.map((x, i) => `${CPP[x.type]} a${i}; __io::rd(a${i});`).join(" ");
  const args = p.params.map((_, i) => `a${i}`).join(", ");
  const nodes = nodeTypes(p);
  return `${CPP_PRELUDE}${nodes.list ? CPP_LIST : ""}${nodes.tree ? CPP_TREE : ""}
${code}
${CPP_IO}${nodes.list ? CPP_LIST_IO : ""}${nodes.tree ? CPP_TREE_IO : ""}
int main() {
  int T; if (!(cin >> T)) return 0;
  for (int t = 0; t < T; t++) {
    ${decl}
    try {
      Solution s;
      auto __t0 = chrono::steady_clock::now();
      auto r = s.${p.fn}(${args});
      double __ms = chrono::duration<double, milli>(chrono::steady_clock::now() - __t0).count();
      cout << "\\n@@T:${nonce}@@" << t << " " << fixed << setprecision(1) << __ms << defaultfloat << endl;
      cout << "\\n@@R:${nonce}@@" << t << " " << __io::js(r) << endl;
    } catch (const exception& e) {
      cout << "\\n@@E:${nonce}@@" << t << " exception: " << e.what() << endl;
    } catch (...) {
      cout << "\\n@@E:${nonce}@@" << t << " unknown exception" << endl;
    }
  }
  return 0;
}
`;
}

const JAVA_IO = `
  static String IN; static int P = 0;
  static String tok() { while (P < IN.length() && Character.isWhitespace(IN.charAt(P))) P++; int s = P; while (P < IN.length() && !Character.isWhitespace(IN.charAt(P))) P++; return IN.substring(s, P); }
  static int rI() { return Integer.parseInt(tok()); }
  static double rD() { return Double.parseDouble(tok()); }
  static boolean rB() { return tok().equals("1"); }
  static String rS() { int n = rI(); P++; String s = IN.substring(P, P + n); P += n; return s; }
  static int[] rIA() { int n = rI(); int[] a = new int[n]; for (int i = 0; i < n; i++) a[i] = rI(); return a; }
  static String[] rSA() { int n = rI(); String[] a = new String[n]; for (int i = 0; i < n; i++) a[i] = rS(); return a; }
  static int[][] rIAA() { int n = rI(); int[][] a = new int[n][]; for (int i = 0; i < n; i++) a[i] = rIA(); return a; }
  static List<List<String>> rSAA() { int n = rI(); List<List<String>> a = new ArrayList<>(); for (int i = 0; i < n; i++) a.add(Arrays.asList(rSA())); return a; }
  static String q(String s) {
    StringBuilder b = new StringBuilder("\\"");
    for (char c : s.toCharArray()) {
      if (c == '"' || c == '\\\\') b.append('\\\\').append(c);
      else if (c == '\\n') b.append("\\\\n");
      else if (c < 0x20) b.append(String.format("\\\\u%04x", (int) c));
      else b.append(c);
    }
    return b.append('"').toString();
  }
  static String ser(Object o) {
    if (o == null) return "null";
    if (o instanceof String) return q((String) o);
    if (o instanceof Character) return q(String.valueOf(o));
    if (o instanceof Boolean || o instanceof Integer || o instanceof Long || o instanceof Short) return String.valueOf(o);
    if (o instanceof Double || o instanceof Float) { double d = ((Number) o).doubleValue(); if (Double.isNaN(d) || Double.isInfinite(d)) return "null"; if (d == Math.rint(d) && Math.abs(d) < 1e15) return String.valueOf((long) d); return String.valueOf(d); }
    StringBuilder b = new StringBuilder("[");
    if (o instanceof int[]) { int[] a = (int[]) o; for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); } }
    else if (o instanceof long[]) { long[] a = (long[]) o; for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); } }
    else if (o instanceof double[]) { double[] a = (double[]) o; for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(ser(a[i])); } }
    else if (o instanceof boolean[]) { boolean[] a = (boolean[]) o; for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); } }
    else if (o instanceof char[]) { return q(new String((char[]) o)); }
    else if (o instanceof Object[]) { Object[] a = (Object[]) o; for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(ser(a[i])); } }
    else if (o instanceof Iterable) { boolean first = true; for (Object x : (Iterable<?>) o) { if (!first) b.append(','); first = false; b.append(ser(x)); } }
    else return q(String.valueOf(o));
    return b.append(']').toString();
  }
`;

const JAVA_LIST = `
class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
`;
const JAVA_TREE = `
class TreeNode {
    int val; TreeNode left, right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
`;
const JAVA_LIST_IO = `
  static ListNode rL() { int n = rI(); ListNode d = new ListNode(), c = d; for (int i = 0; i < n; i++) { c.next = new ListNode(rI()); c = c.next; } return d.next; }
  static List<Integer> outL(ListNode h) { List<Integer> o = new ArrayList<>(); for (ListNode c = h; c != null; c = c.next) { if (o.size() >= 200000) throw new RuntimeException("returned list has a cycle or is too long"); o.add(c.val); } return o; }
`;
const JAVA_TREE_IO = `
  static TreeNode rT() {
    int n = rI(); TreeNode[] a = new TreeNode[n];
    for (int i = 0; i < n; i++) { String t = tok(); if (!t.equals("#")) a[i] = new TreeNode(Integer.parseInt(t)); }
    if (n == 0 || a[0] == null) return null;
    ArrayDeque<TreeNode> q = new ArrayDeque<>(); q.add(a[0]); int i = 1;
    while (!q.isEmpty() && i < n) {
      TreeNode x = q.poll();
      if (i < n) { x.left = a[i++]; if (x.left != null) q.add(x.left); }
      if (i < n) { x.right = a[i++]; if (x.right != null) q.add(x.right); }
    }
    return a[0];
  }
  static List<Integer> outT(TreeNode r) {
    List<Integer> o = new ArrayList<>(); LinkedList<TreeNode> q = new LinkedList<>(); q.add(r); int k = 0;
    while (!q.isEmpty()) {
      if (++k > 400000) throw new RuntimeException("returned tree has a cycle or is too large");
      TreeNode x = q.poll();
      if (x == null) { o.add(null); continue; }
      o.add(x.val); q.add(x.left); q.add(x.right);
    }
    while (!o.isEmpty() && o.get(o.size() - 1) == null) o.remove(o.size() - 1);
    return o;
  }
`;

function java(p: Problem, code: string, nonce: string) {
  const nodes = nodeTypes(p);
  const outConv = p.returns === "ListNode" ? "outL" : p.returns === "TreeNode" ? "outT" : "";
  // The runner's entry class must be the only public class.
  const user = code.replace(/\bpublic\s+(final\s+)?class\s+Solution\b/, "class Solution");
  const decl = p.params.map((x, i) => `${JAVA[x.type]} a${i} = ${JAVA_READ[x.type]};`).join(" ");
  const args = p.params.map((_, i) => `a${i}`).join(", ");
  return `import java.util.*;
import java.util.stream.*;
import java.io.*;

${user}
${nodes.list ? JAVA_LIST : ""}${nodes.tree ? JAVA_TREE : ""}
public class Main {
${JAVA_IO}${nodes.list ? JAVA_LIST_IO : ""}${nodes.tree ? JAVA_TREE_IO : ""}
  public static void main(String[] argv) throws Exception {
    IN = new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
    int T = rI();
    for (int t = 0; t < T; t++) {
      ${decl}
      try {
        long __t0 = System.nanoTime();
        Object r = new Solution().${p.fn}(${args});
        long __ns = System.nanoTime() - __t0;
        ${outConv ? `r = ${outConv}((${JAVA[p.returns]}) r);` : ""}
        System.out.println("\\n@@T:${nonce}@@" + t + " " + (__ns / 100000) / 10.0);
        System.out.println("\\n@@R:${nonce}@@" + t + " " + ser(r));
      } catch (Throwable e) {
        System.out.println("\\n@@E:${nonce}@@" + t + " " + e.toString().substring(0, Math.min(300, e.toString().length())));
      }
      System.out.flush();
    }
  }
}
`;
}

export function buildProgram(lang: Lang, p: Problem, code: string, nonce: string): string {
  switch (lang) {
    case "python": return python(p, code, nonce);
    case "javascript": return javascript(p, code, nonce);
    case "cpp": return cpp(p, code, nonce);
    case "java": return java(p, code, nonce);
  }
}

export function makeNonce(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ───────────────────────── Output parsing ─────────────────────────

export type ParsedLine = { kind: "ok"; raw: string; value: unknown } | { kind: "error"; message: string } | { kind: "missing" };

export function parseOutput(stdout: string, count: number, nonce: string): { results: ParsedLine[]; times: (number | null)[]; userOutput: string } {
  const results: ParsedLine[] = Array.from({ length: count }, () => ({ kind: "missing" as const }));
  const times: (number | null)[] = Array.from({ length: count }, () => null);
  const re = new RegExp(`^@@([RET]):${nonce}@@(\\d+) ?(.*)$`);
  const user: string[] = [];
  for (const line of stdout.split("\n")) {
    const m = re.exec(line);
    if (!m) { user.push(line); continue; }
    const i = Number(m[2]);
    if (i < 0 || i >= count) continue;
    if (m[1] === "T") { const ms = Number(m[3]); times[i] = Number.isFinite(ms) && ms >= 0 ? ms : null; continue; }
    if (m[1] === "E") results[i] = { kind: "error", message: m[3] };
    else {
      try { results[i] = { kind: "ok", raw: m[3], value: JSON.parse(m[3]) }; }
      catch { results[i] = { kind: "error", message: `Unreadable return value: ${m[3].slice(0, 120)}` }; }
    }
  }
  // Our markers start with a newline; drop the blank lines that leaves behind.
  const userOutput = user.join("\n").replace(/\n{2,}/g, "\n").trim();
  return { results, times, userOutput: userOutput.slice(0, 4000) };
}

// ───────────────────────── Line numbers ─────────────────────────

/** How many lines of harness code precede the candidate's code in the generated program. */
export function codeLineOffset(lang: Lang, p: Problem): number {
  const marker = "__IOS_USER_CODE_MARKER__";
  const lines = buildProgram(lang, p, marker, "0").split("\n");
  return Math.max(0, lines.findIndex((l) => l.includes(marker)));
}

/** Rewrite compiler/runtime line numbers so they point at the candidate's own code. */
export function fixLineNumbers(lang: Lang, text: string, offset: number): string {
  const shift = (n: string) => String(Math.max(1, Number(n) - offset));
  if (lang === "python") return text.replace(/line (\d+)/g, (_, n) => `line ${shift(n)}`);
  if (lang === "cpp") return text.replace(/main\.cpp:(\d+)/g, (_, n) => `line ${shift(n)}`).replace(/\/box\/|\/tmp\/[^\s:]*\//g, "");
  if (lang === "java") return text.replace(/Main\.java:(\d+)/g, (_, n) => `line ${shift(n)}`);
  return text.replace(/<anonymous>:(\d+)/g, (_, n) => `line ${shift(n)}`);
}
