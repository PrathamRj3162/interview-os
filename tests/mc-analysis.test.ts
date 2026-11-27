import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
vi.mock("server-only", () => ({}));
import { zipFiles } from "@/lib/mc/zip";
import { buildZip, parseRunOutput, normOut } from "@/lib/mc/runner";
import { lineChanges, extensionDiff, staticFacts } from "@/lib/mc/analysis";
import { validateFiles } from "@/lib/mc/types";

const hasUnzip = (() => { try { execFileSync("unzip", ["-v"], { stdio: "ignore" }); return true; } catch { return false; } })();

describe("multi-file zip", () => {
  it.skipIf(!hasUnzip)("produces an archive unzip can read back exactly", () => {
    const dir = mkdtempSync(join(tmpdir(), "mczip-"));
    const p = join(dir, "a.zip");
    writeFileSync(p, zipFiles({ "Main.java": "class Main {}\n", "nested_ok.py": "print('é ✓')\n" }));
    expect(execFileSync("unzip", ["-p", p, "nested_ok.py"]).toString()).toBe("print('é ✓')\n");
    expect(execFileSync("unzip", ["-l", p]).toString()).toMatch(/Main\.java/);
  });
  it.skipIf(!hasUnzip)("the run bundle contains the inputs and the compile/run scripts", () => {
    const dir = mkdtempSync(join(tmpdir(), "mczip-"));
    const p = join(dir, "b.zip");
    writeFileSync(p, buildZip("java", { "Main.java": "x" }, ["a", "b\n"], "abc"));
    expect(execFileSync("unzip", ["-p", p, "__in_0.txt"]).toString()).toBe("a\n");
    expect(execFileSync("unzip", ["-p", p, "run"]).toString()).toContain("timeout 4 /usr/local/jdk17/bin/java -cp build Main");
  });
});

describe("run output parsing", () => {
  it("splits per input by the nonce and ignores markers printed by the program", () => {
    const out = "@@n1:BEGIN:0\nhello\n@@fake:END:0:0\n\n@@n1:STDERR:0\noops\n@@n1:END:0:0\n@@n1:BEGIN:1\n\n@@n1:STDERR:1\n\n@@n1:END:1:124\n";
    const r = parseRunOutput(out, "n1", 3);
    expect(r[0]).toEqual({ stdout: "hello\n@@fake:END:0:0", stderr: "oops", exitCode: 0, timedOut: false });
    expect(r[1]).toMatchObject({ exitCode: 124, timedOut: true });
    expect(r[2]).toMatchObject({ exitCode: null, timedOut: true }); // never ran (judge limit hit)
  });
  it("normalises trailing whitespace only", () => {
    expect(normOut("a  \r\nb\n\n")).toBe("a\nb");
    expect(normOut(" a")).toBe(" a");
  });
});

describe("files", () => {
  it("requires the entry file and flat, safe names", () => {
    expect(validateFiles({ "Main.java": "" }, "java")).toBeNull();
    expect(validateFiles({ "App.java": "" }, "java")).toMatch(/Main\.java/);
    expect(validateFiles({ "Main.java": "", "../x.java": "" }, "java")).toMatch(/valid file name/);
    expect(validateFiles({ "main.py": "x".repeat(31_000) }, "python")).toMatch(/too long/);
  });
});

describe("extensibility diff", () => {
  it("counts added/removed lines and files", () => {
    expect(lineChanges("a\nb\nc", "a\nB\nc\nd")).toEqual({ added: 2, removed: 1 });
    const d = extensionDiff({ "Main.java": "a\nb", "Old.java": "x" }, { "Main.java": "a\nb\nc", "New.java": "n1\nn2" });
    expect(d).toMatchObject({ filesChanged: 1, filesAdded: 1, filesDeleted: 1, linesAdded: 3, linesRemoved: 1 });
  });
  it("ignores whitespace-only edits", () => {
    expect(extensionDiff({ "A.java": "a\n  b" }, { "A.java": "a\nb  " }).perFile).toEqual([]);
  });
});

describe("static facts", () => {
  const java = {
    "Main.java": "public class Main {\n  public static void main(String[] args) {\n    Bank b = new Bank();\n    b.deposit(\"x\", 5);\n  }\n}",
    "Bank.java": "import java.util.*;\npublic class Bank implements Ledger {\n  private Map<String, Integer> balances = new HashMap<>();\n  public void deposit(String user, int amount) {\n    if (amount <= 0) throw new IllegalArgumentException(\"amount\");\n    balances.merge(user, amount, Integer::sum);\n  }\n  public void withdraw(String user, int amount) {\n    balances.merge(user, -amount, Integer::sum);\n  }\n}",
    "Ledger.java": "public interface Ledger { void deposit(String user, int amount); }",
  };
  it("counts types, methods, longest method, and finds unvalidated public inputs", () => {
    const f = staticFacts(java, "java", { concurrency: false });
    expect(f.types).toBe(3);
    expect(f.interfaces).toBe(1);
    expect(f.longestMethod?.name).toBe("main");
    expect(f.unvalidatedPublicMethods).toEqual(["Bank.java: withdraw(user, amount)"]);
    expect(f.sharedMutableState).toEqual([]);
  });
  it("flags shared mutable state only for concurrency problems without synchronisation", () => {
    expect(staticFacts(java, "java", { concurrency: true }).sharedMutableState).toEqual(["Bank.java: balances"]);
    const safe = { ...java, "Bank.java": java["Bank.java"].replace("new HashMap<>()", "new java.util.concurrent.ConcurrentHashMap<>()").replace("private Map", "private final Map") };
    expect(staticFacts(safe, "java", { concurrency: true }).usesConcurrencyPrimitives).toBe(true);
  });
  it("finds repeated blocks", () => {
    const block = "int a = 1;\nint b = 2;\nint c = a + b;\nSystem.out.println(c);\nreturn;";
    const f = staticFacts({ "Main.java": `class Main {\nvoid x() {\n${block}\n}\nvoid y() {\n${block}\n}\n}` }, "java", { concurrency: false });
    expect(f.duplicateBlocks).toBeGreaterThan(0);
  });
  it("handles Python", () => {
    const f = staticFacts({ "main.py": "class Shop:\n    def add(self, item, qty):\n        if qty <= 0:\n            raise ValueError('qty')\n        self.items[item] = qty\n    def remove(self, item):\n        del self.items[item]\n" }, "python", { concurrency: false });
    expect(f.types).toBe(1);
    expect(f.methods).toBe(2);
    expect(f.unvalidatedPublicMethods).toEqual(["main.py: remove(item)"]);
  });
});

import { completenessScore, extensibilityScore } from "@/lib/mc/scoring";

describe("machine coding scores (measured in code)", () => {
  it("completeness bands", () => {
    expect(completenessScore(null).score).toBeNull();
    expect(completenessScore({ passed: 6, total: 6 }).score).toBe(4);
    expect(completenessScore({ passed: 5, total: 6 }).score).toBe(3);
    expect(completenessScore({ passed: 3, total: 6 }).score).toBe(2);
    expect(completenessScore({ passed: 1, total: 6 }).score).toBe(1);
  });
  it("extensibility: tests first, then the size of changes to existing code", () => {
    const small = extensionDiff({ "Main.java": "a\nb", "S.java": "x" }, { "Main.java": "a\nb\ncase P", "S.java": "x", "Percent.java": "lots\nof\nnew\ncode" });
    expect(extensibilityScore(null, small).score).toBeNull();
    expect(extensibilityScore({ passed: 0, total: 0 }, small).score).toBeNull();
    expect(extensibilityScore({ passed: 1, total: 3 }, small).score).toBe(1);
    expect(extensibilityScore({ passed: 2, total: 3 }, small).score).toBe(2);
    expect(extensibilityScore({ passed: 3, total: 3 }, small)).toMatchObject({ score: 4 });
    const big = extensionDiff({ "Main.java": Array.from({ length: 200 }, (_, i) => `l${i}`).join("\n") }, { "Main.java": Array.from({ length: 200 }, (_, i) => `m${i}`).join("\n") });
    expect(extensibilityScore({ passed: 3, total: 3 }, big).score).toBe(2);
  });
});
