import type { Lang, Problem, ValueType } from "./types";

/**
 * Turns a candidate's solution into a complete program that runs every test case in ONE process.
 * Each test prints a marker line `@@R:<nonce>@@<i> <json>` (result) or `@@E:<nonce>@@<i> <msg>` (exception).
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
};
const JSDOC: Record<ValueType, string> = {
  int: "number", double: "number", bool: "boolean", string: "string",
  "int[]": "number[]", "string[]": "string[]", "int[][]": "number[][]", "string[][]": "string[][]",
};
const CPP: Record<ValueType, string> = {
  int: "int", double: "double", bool: "bool", string: "string",
  "int[]": "vector<int>", "string[]": "vector<string>", "int[][]": "vector<vector<int>>", "string[][]": "vector<vector<string>>",
};
const JAVA: Record<ValueType, string> = {
  int: "int", double: "double", bool: "boolean", string: "String",
  "int[]": "int[]", "string[]": "String[]", "int[][]": "int[][]", "string[][]": "List<List<String>>",
};
const JAVA_DEFAULT: Record<ValueType, string> = {
  int: "0", double: "0.0", bool: "false", string: '""',
  "int[]": "new int[0]", "string[]": "new String[0]", "int[][]": "new int[0][0]", "string[][]": "new ArrayList<>()",
};
const JAVA_READ: Record<ValueType, string> = {
  int: "rI()", double: "rD()", bool: "rB()", string: "rS()",
  "int[]": "rIA()", "string[]": "rSA()", "int[][]": "rIAA()", "string[][]": "rSAA()",
};
const cppParam = (t: ValueType) => (t.endsWith("]") || t === "string" ? `${CPP[t]}&` : CPP[t]);

// ───────────────────────── Starter code ─────────────────────────

export function starterCode(p: Problem, lang: Lang): string {
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
  }
}

export function encodeStdin(lang: Lang, p: Problem, inputs: unknown[][]): string {
  if (lang === "python" || lang === "javascript") return JSON.stringify(inputs);
  const out = [String(inputs.length)];
  for (const args of inputs) p.params.forEach((param, i) => out.push(tokens(param.type, args[i])));
  return out.join("\n") + "\n";
}

// ───────────────────────── Program builders ─────────────────────────

const PY_PRELUDE = `import sys, json, math, heapq, bisect, itertools, functools, collections
from typing import *
from collections import *
from functools import lru_cache, cache
sys.setrecursionlimit(10000)
`;

function python(p: Problem, code: string, nonce: string) {
  return `${PY_PRELUDE}
${code}

def __ser(x):
    return json.dumps(x, separators=(",", ":"), default=lambda o: list(o))

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
            r = fn(*args)
            print("\\n@@R:${nonce}@@%d %s" % (i, __ser(r)), flush=True)
        except Exception as e:
            print("\\n@@E:${nonce}@@%d %s: %s" % (i, type(e).__name__, str(e)[:300]), flush=True)

__main()
`;
}

function javascript(p: Problem, code: string, nonce: string) {
  return `${code}

;(function () {
  const raw = typeof __STDIN__ === "string" ? __STDIN__ : require("fs").readFileSync(0, "utf8");
  const data = JSON.parse(raw);
  const fn = typeof ${p.fn} === "function" ? ${p.fn}
    : (typeof Solution === "function" && typeof new Solution().${p.fn} === "function") ? ((s) => s.${p.fn}.bind(s))(new Solution()) : null;
  const ser = (x) => { const s = JSON.stringify(x === undefined ? null : x); return s === undefined ? "null" : s; };
  data.forEach((args, i) => {
    try {
      if (!fn) throw new ReferenceError("function ${p.fn} not found — keep the given signature");
      console.log("\\n@@R:${nonce}@@" + i + " " + ser(fn(...args)));
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
  return `${CPP_PRELUDE}
${code}
${CPP_IO}
int main() {
  int T; if (!(cin >> T)) return 0;
  for (int t = 0; t < T; t++) {
    ${decl}
    try {
      Solution s;
      auto r = s.${p.fn}(${args});
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

function java(p: Problem, code: string, nonce: string) {
  // The runner's entry class must be the only public class.
  const user = code.replace(/\bpublic\s+(final\s+)?class\s+Solution\b/, "class Solution");
  const decl = p.params.map((x, i) => `${JAVA[x.type]} a${i} = ${JAVA_READ[x.type]};`).join(" ");
  const args = p.params.map((_, i) => `a${i}`).join(", ");
  return `import java.util.*;
import java.util.stream.*;
import java.io.*;

${user}

public class Main {
${JAVA_IO}
  public static void main(String[] argv) throws Exception {
    IN = new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
    int T = rI();
    for (int t = 0; t < T; t++) {
      ${decl}
      try {
        Object r = new Solution().${p.fn}(${args});
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

export function parseOutput(stdout: string, count: number, nonce: string): { results: ParsedLine[]; userOutput: string } {
  const results: ParsedLine[] = Array.from({ length: count }, () => ({ kind: "missing" as const }));
  const re = new RegExp(`^@@([RE]):${nonce}@@(\\d+) ?(.*)$`);
  const user: string[] = [];
  for (const line of stdout.split("\n")) {
    const m = re.exec(line);
    if (!m) { user.push(line); continue; }
    const i = Number(m[2]);
    if (i < 0 || i >= count) continue;
    if (m[1] === "E") results[i] = { kind: "error", message: m[3] };
    else {
      try { results[i] = { kind: "ok", raw: m[3], value: JSON.parse(m[3]) }; }
      catch { results[i] = { kind: "error", message: `Unreadable return value: ${m[3].slice(0, 120)}` }; }
    }
  }
  // Our markers start with a newline; drop the blank lines that leaves behind.
  const userOutput = user.join("\n").replace(/\n{2,}/g, "\n").trim();
  return { results, userOutput: userOutput.slice(0, 4000) };
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
