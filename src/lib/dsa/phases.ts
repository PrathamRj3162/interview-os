/**
 * The DSA round's phase machine. Phases only move forward; the server decides transitions from what
 * actually happened (code written, runs, submissions, time) plus the interviewer model's suggestion.
 */
export const PHASES = ["intro", "clarify", "brute", "optimise", "code", "test", "complexity", "wrap"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<Phase, string> = {
  intro: "Intro", clarify: "Clarify", brute: "Brute force", optimise: "Optimise",
  code: "Code", test: "Test & dry run", complexity: "Complexity", wrap: "Wrap-up",
};

/** What the interviewer should be doing in each phase (goes into the system prompt). */
export const PHASE_GOALS: Record<Phase, string> = {
  intro: "The problem is on the candidate's screen. Invite them to read it and restate it in their own words.",
  clarify: "Let the candidate ask clarifying questions (input sizes, duplicates, negatives, empty input, output format). Answer briefly and factually from the statement and constraints. If they haven't asked about edge cases, ask which ones they'd consider. Move on once the problem is understood.",
  brute: "Ask for a straightforward, correct approach first and its time/space complexity. Don't let them code yet unless they insist.",
  optimise: "Push for a better complexity: ask what the bottleneck is and what information could be reused. Do NOT name the technique or data structure — let them find it. Once they have a plan that meets the target complexity, tell them to go ahead and code it.",
  code: "The candidate is coding. Stay mostly quiet: respond briefly to questions, and comment on run results only if asked or if they are stuck. Never write or dictate code.",
  test: "Ask them to dry-run their code on an example out loud and to name edge cases. Refer to failing test results if there are any, but don't reveal the fix.",
  complexity: "Ask for the final time and space complexity of THEIR code, with justification. Probe one follow-up (e.g. a variant, a larger input, or a memory constraint).",
  wrap: "Close the interview: briefly ask if they have any questions, then end politely. Set should_end=true.",
};

export type PhaseSignals = {
  current: Phase;
  aiAdvance: boolean;
  /** Lines of code written beyond the starter template. */
  codeLines: number;
  runs: number;
  accepted: boolean;
  minutesLeft: number;
  candidateTurns: number;
};

/** Deterministic transition: at most one step, except jumping to `code` when the candidate starts coding. */
export function nextPhase(s: PhaseSignals): { phase: Phase; reason: string | null } {
  const i = PHASES.indexOf(s.current);
  if (s.current === "wrap") return { phase: "wrap", reason: null };
  if (s.minutesLeft <= 2) return { phase: "wrap", reason: "time" };
  if (s.current === "intro" && s.candidateTurns > 0) return { phase: "clarify", reason: "candidate responded" };
  if (i < PHASES.indexOf("code") && s.codeLines >= 3) return { phase: "code", reason: "candidate started coding" };
  if (s.current === "code" && s.accepted) return { phase: "test", reason: "all tests passed" };
  if (!s.aiAdvance) return { phase: s.current, reason: null };
  const next = PHASES[i + 1];
  // Guards: you can't leave coding without code, or testing without having run anything.
  if (s.current === "code" && (s.codeLines < 3 || s.runs === 0)) return { phase: s.current, reason: null };
  if (s.current === "test" && s.runs === 0) return { phase: s.current, reason: null };
  return { phase: next, reason: "interviewer moved on" };
}

/** Count lines that differ from the starter template (a cheap "has the candidate written code" signal). */
export function codeLinesBeyondStarter(code: string, starter: string): number {
  const base = new Set(starter.split("\n").map((l) => l.trim()).filter(Boolean));
  return code.split("\n").map((l) => l.trim()).filter((l) => l && !base.has(l) && !/^(\/\/|#|\*|\/\*)/.test(l)).length;
}

/** Minimal line diff (LCS) for "what changed since your last message" — capped so prompts stay small. */
export function lineDiff(before: string, after: string, maxLines = 60): string {
  const a = before.split("\n"), b = after.split("\n");
  if (a.length * b.length > 250_000) return after.split("\n").slice(0, maxLines).map((l) => `+ ${l}`).join("\n");
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: string[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; }
    else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) out.push(`+ ${b[j++]}`);
    else out.push(`- ${a[i++]}`);
  }
  return out.length > maxLines ? [...out.slice(0, maxLines), `… ${out.length - maxLines} more changed lines`].join("\n") : out.join("\n");
}
