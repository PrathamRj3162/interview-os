import { describe, expect, it } from "vitest";
import { grade } from "@/lib/dsa/grade";
import { parseOutput } from "@/lib/dsa/harness";
import { PROBLEM_BY_SLUG } from "@/lib/dsa/bank";
import { STRESS, STRESS_BUDGET_MS } from "@/lib/dsa/stress";
import { SOLUTIONS } from "@/lib/dsa/solutions";
import type { ExecResult } from "@/lib/dsa/types";

const p = PROBLEM_BY_SLUG["best-time-stock"];
const N = "abc123";
const cases = [
  { input: [[7, 1, 5]], expected: 4, hidden: false },
  { input: [[1, 2]], expected: 1, hidden: true },
  { input: [Array(1000).fill(1)], expected: 0, hidden: true, stress: true },
];
const out = (lines: string[]) => lines.map((l) => `\n@@${l}`).join("");
const exec = (stdout: string, status: ExecResult["status"] = "ok"): ExecResult => ({ status, stdout, stderr: "", timeMs: 100 });

describe("timing markers", () => {
  it("parses per-test times; last marker wins; junk is ignored", () => {
    const r = parseOutput(out([`T:${N}@@0 1.5`, `R:${N}@@0 4`, `T:${N}@@1 nope`, `T:${N}@@1 9`, `R:${N}@@1 1`]), 2, N);
    expect(r.times).toEqual([1.5, 9]);
    expect(r.results.map((x) => x.kind)).toEqual(["ok", "ok"]);
  });
});

describe("stress grading", () => {
  it("accepts a fast correct stress test", () => {
    const o = grade(p, cases, exec(out([`T:${N}@@0 1`, `R:${N}@@0 4`, `T:${N}@@1 1`, `R:${N}@@1 1`, `T:${N}@@2 20`, `R:${N}@@2 0`])), N, "judge0", { stressBudgetMs: 1000 });
    expect(o.status).toBe("accepted");
    expect(o.tests[2]).toMatchObject({ verdict: "pass", stress: true, timeMs: 20 });
  });
  it("marks a correct but slow stress test as too slow", () => {
    const o = grade(p, cases, exec(out([`R:${N}@@0 4`, `R:${N}@@1 1`, `T:${N}@@2 2500`, `R:${N}@@2 0`])), N, "judge0", { stressBudgetMs: 1000 });
    expect(o.status).toBe("time_limit");
    expect(o.tests[2].verdict).toBe("too_slow");
    expect(o.tests[2].input).toMatch(/Large input/);
    expect(o.message).toMatch(/too slow on the large worst-case input/);
  });
  it("explains a judge timeout that only the stress test missed", () => {
    const o = grade(p, cases, exec(out([`R:${N}@@0 4`, `R:${N}@@1 1`]), "timeout"), N, "judge0", { stressBudgetMs: 1000 });
    expect(o.status).toBe("time_limit");
    expect(o.passed).toBe(2);
    expect(o.message).toMatch(/Correct on every regular test/);
    expect(o.tests[2].error).toMatch(/time limit/);
  });
  it("a wrong answer outranks a timeout", () => {
    const o = grade(p, cases, exec(out([`R:${N}@@0 3`]), "timeout"), N, "judge0", { stressBudgetMs: 1000 });
    expect(o.status).toBe("wrong_answer");
  });
  it("without a budget (browser Run) timing never fails a test", () => {
    const o = grade(p, cases, exec(out([`R:${N}@@0 4`, `R:${N}@@1 1`, `T:${N}@@2 99999`, `R:${N}@@2 0`])), N, "browser");
    expect(o.status).toBe("accepted");
  });
});

describe("stress inputs", () => {
  it("exist only for real problems, are deterministic, and budgets cover every language", () => {
    for (const slug of Object.keys(STRESS)) {
      expect(PROBLEM_BY_SLUG[slug], slug).toBeDefined();
      expect(SOLUTIONS[slug], slug).toBeDefined();
    }
    expect(Object.keys(STRESS_BUDGET_MS).sort()).toEqual(["cpp", "java", "javascript", "python"]);
  });
});
