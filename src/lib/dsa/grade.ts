import { outputsMatch, show } from "./compare";
import { parseOutput } from "./harness";
import type { ExecResult, Problem, RunOutcome, TestResult } from "./types";

type Case = { input: unknown[]; expected: unknown; hidden: boolean };

/**
 * Compare one execution's output with the expected results.
 * Hidden tests reveal only pass/fail, except the FIRST failing hidden test, whose input/expected/actual are
 * shown (inputs truncated) — enough to debug without dumping the whole test set.
 */
export function grade(problem: Problem, cases: Case[], exec: ExecResult, nonce: string, runner: RunOutcome["runner"]): RunOutcome {
  const base = { total: cases.length, runner, timeMs: exec.timeMs };
  if (exec.status === "compile_error") {
    return { ...base, status: "compile_error", passed: 0, tests: cases.map((c, i) => ({ index: i, verdict: "not_run", hidden: c.hidden })), stdout: "", compileOutput: (exec.stderr || exec.message || "").slice(0, 4000) };
  }
  if (exec.status === "unavailable") {
    return { ...base, status: "error", passed: 0, tests: [], stdout: "", message: exec.message ?? "The code runner is unavailable." };
  }

  const { results, userOutput } = parseOutput(exec.stdout, cases.length, nonce);
  let revealedHidden = false;
  const tests: TestResult[] = cases.map((c, i) => {
    const r = results[i];
    const reveal = !c.hidden || !revealedHidden;
    const detail = (extra: Partial<TestResult>): TestResult => {
      if (c.hidden) revealedHidden = true;
      return { index: i, hidden: c.hidden, input: problem.params.map((p, k) => `${p.name} = ${show(c.input[k], 200)}`).join("\n"), expected: show(c.expected), ...extra } as TestResult;
    };
    if (r.kind === "missing") return { index: i, verdict: "not_run", hidden: c.hidden };
    if (r.kind === "error") return reveal ? detail({ verdict: "error", error: r.message }) : { index: i, verdict: "error", hidden: true };
    const ok = outputsMatch(problem.compare, c.expected, r.value, { slug: problem.slug, input: c.input });
    if (ok) return c.hidden ? { index: i, verdict: "pass", hidden: true } : { ...detail({ verdict: "pass", actual: show(r.value) }) };
    return reveal ? detail({ verdict: "fail", actual: show(r.value) }) : { index: i, verdict: "fail", hidden: true };
  });

  const passed = tests.filter((t) => t.verdict === "pass").length;
  const anyNotRun = tests.some((t) => t.verdict === "not_run");
  const anyError = tests.some((t) => t.verdict === "error");
  const status: RunOutcome["status"] =
    passed === cases.length ? "accepted"
      : exec.status === "timeout" ? "time_limit"
        : exec.status === "runtime_error" || anyError || anyNotRun ? "runtime_error"
          : "wrong_answer";
  const stderr = exec.stderr?.trim() ? `\n${exec.stderr.trim().slice(0, 2000)}` : "";
  return {
    ...base, status, passed, tests,
    stdout: (userOutput + stderr).trim(),
    message: exec.status === "timeout" ? "Time limit exceeded — the tests that didn't finish are marked as not run." : exec.message,
  };
}
