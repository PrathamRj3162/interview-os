/** Shared (client + server) types for the DSA live-coding round. */

export const LANGS = ["python", "javascript", "cpp", "java"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_LABELS: Record<Lang, string> = { python: "Python 3", javascript: "JavaScript", cpp: "C++17", java: "Java 17" };

/** Value types a problem signature may use. Kept small so every language harness can support all of them. */
export type ValueType = "int" | "double" | "bool" | "string" | "int[]" | "string[]" | "int[][]" | "string[][]";

/**
 * How an output is compared with the expected one.
 * - exact: deep equality
 * - unordered: top-level array order doesn't matter
 * - unordered-deep: neither outer nor inner array order matters (e.g. lists of groups)
 * - float: numeric, 1e-5 relative tolerance
 * - checker: several answers are valid; a per-problem validator decides
 */
export type CompareMode = "exact" | "unordered" | "unordered-deep" | "float" | "checker";

export type ProblemDifficulty = "easy" | "medium" | "hard";

export type Example = { input: unknown[]; output: unknown; explanation?: string };

/** Client-safe problem description. Hints, the optimal approach and hidden tests live server-side only. */
export type Problem = {
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  topics: string[];
  statement: string;
  constraints: string[];
  fn: string;
  params: { name: string; type: ValueType }[];
  returns: ValueType;
  compare: CompareMode;
  examples: Example[];
};

export type ExecStatus = "ok" | "compile_error" | "runtime_error" | "timeout" | "unavailable";

/** Raw result of executing one program (all tests in one process). */
export type ExecResult = {
  status: ExecStatus;
  stdout: string;
  stderr: string;
  timeMs: number | null;
  memoryKb?: number | null;
  message?: string;
};

export type TestVerdict = "pass" | "fail" | "error" | "not_run";

export type TestResult = {
  index: number;
  verdict: TestVerdict;
  hidden: boolean;
  /** Present for sample tests and for the first failing hidden test only. */
  input?: string;
  expected?: string;
  actual?: string;
  error?: string;
};

export type RunOutcome = {
  status: "accepted" | "wrong_answer" | "runtime_error" | "compile_error" | "time_limit" | "error";
  passed: number;
  total: number;
  tests: TestResult[];
  stdout: string;
  compileOutput?: string;
  timeMs: number | null;
  runner: "browser" | "judge0";
  message?: string;
};
