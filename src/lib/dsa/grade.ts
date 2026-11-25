import { outputsMatch, show } from "./compare";
import { parseOutput } from "./harness";
import type { ExecResult, Problem, RunOutcome, TestResult } from "./types";

type Case = { input: unknown[]; expected: unknown; hidden: boolean; stress?: boolean };
export type GradeOptions = { stressBudgetMs?: number };

const sizeOf = (input: unknown[]) => Math.max(0, ...input.map((v) => (Array.isArray(v) ? v.length : typeof v === "string" ? v.length : 0)));
const fmtN = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/**
 * Compare one execution's output with the expected results.
 * Hidden tests reveal only pass/fail, except the FIRST failing hidden test, whose input/expected/actual are
 * shown (inputs truncated) — enough to debug without dumping the whole test set.
 * Stress tests (large worst-case inputs) must also finish within `stressBudgetMs`; a correct but slow
 * answer is `too_slow`, and the round's status becomes `time_limit`.
 */
export function grade(problem: Problem, cases: Case[], exec: ExecResult, nonce: string, runner: RunOutcome["runner"], opts: GradeOptions = {}): RunOutcome {
  const base = { total: cases.length, runner, timeMs: exec.timeMs };
  if (exec.status === "compile_error") {
    return { ...base, status: "compile_error", passed: 0, tests: cases.map((c, i) => ({ index: i, verdict: "not_run", hidden: c.hidden, ...(c.stress ? { stress: true } : {}) })), stdout: "", compileOutput: (exec.stderr || exec.message || "").slice(0, 4000) };
  }
  if (exec.status === "unavailable") {
    return { ...base, status: "error", passed: 0, tests: [], stdout: "", message: exec.message ?? "The code runner is unavailable." };
  }

  const { results, times, userOutput } = parseOutput(exec.stdout, cases.length, nonce);
  let revealedHidden = false;
  const tests: TestResult[] = cases.map((c, i) => {
    const r = results[i];
    const t = times[i];
    const meta = { index: i, hidden: c.hidden, ...(c.stress ? { stress: true } : {}), ...(t != null ? { timeMs: t } : {}) };
    const reveal = !c.hidden || !revealedHidden;
    const detail = (extra: Partial<TestResult>): TestResult => {
      if (c.hidden) revealedHidden = true;
      const input = c.stress
        ? `Large input (n ≈ ${fmtN(sizeOf(c.input))}) — too big to show`
        : problem.params.map((p, k) => `${p.name} = ${show(c.input[k], 200)}`).join("\n");
      return { ...meta, input, expected: show(c.expected, c.stress ? 120 : 300), ...extra } as TestResult;
    };
    if (r.kind === "missing") return { ...meta, verdict: "not_run" };
    if (r.kind === "error") return reveal ? detail({ verdict: "error", error: r.message }) : { ...meta, verdict: "error" };
    const ok = outputsMatch(problem.compare, c.expected, r.value, { slug: problem.slug, input: c.input });
    if (ok && c.stress && opts.stressBudgetMs != null && t != null && t > opts.stressBudgetMs) {
      return detail({ verdict: "too_slow", actual: "correct answer", error: `Took ${Math.round(t)} ms; the limit for this input is ${opts.stressBudgetMs} ms.` });
    }
    if (ok) return c.hidden ? { ...meta, verdict: "pass" } : { ...detail({ verdict: "pass", actual: show(r.value) }) };
    return reveal ? detail({ verdict: "fail", actual: show(r.value, c.stress ? 120 : 300) }) : { ...meta, verdict: "fail" };
  });

  const passed = tests.filter((t) => t.verdict === "pass").length;
  const anyNotRun = tests.some((t) => t.verdict === "not_run");
  const anyError = tests.some((t) => t.verdict === "error");
  const anyFail = tests.some((t) => t.verdict === "fail");
  const slow = tests.some((t) => t.verdict === "too_slow");
  const timedOut = exec.status === "timeout";
  const status: RunOutcome["status"] =
    passed === cases.length ? "accepted"
      : anyFail ? "wrong_answer"
        : anyError || (exec.status === "runtime_error" && !timedOut) ? "runtime_error"
          : timedOut || slow ? "time_limit"
            : anyNotRun ? "runtime_error"
              : "wrong_answer";

  // Explain a time limit: if everything that finished was correct, the problem is speed, not logic.
  const finishedOk = tests.every((t) => t.verdict === "pass" || t.verdict === "not_run" || t.verdict === "too_slow");
  const onlyStressLeft = tests.every((t) => t.verdict === "pass" || t.stress);
  const message = status !== "time_limit" ? exec.message
    : onlyStressLeft ? "Correct on every regular test, but too slow on the large worst-case input. Your approach needs a better time complexity."
      : finishedOk ? "Every test that finished was correct, but the run hit the time limit before the rest finished. Your approach needs a better time complexity."
        : "Time limit exceeded — the tests that didn't finish are marked as not run.";
  if (timedOut) for (const t of tests) if (t.verdict === "not_run" && t.stress && !revealedHidden) {
    const c = cases[t.index];
    Object.assign(t, { input: `Large input (n ≈ ${fmtN(sizeOf(c.input))}) — too big to show`, error: "Didn't finish within the judge's time limit." });
    revealedHidden = true;
  }

  const stderr = exec.stderr?.trim() ? `\n${exec.stderr.trim().slice(0, 2000)}` : "";
  return { ...base, status, passed, tests, stdout: (userOutput + stderr).trim(), message };
}
