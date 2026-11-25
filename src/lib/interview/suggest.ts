/**
 * Suggested difficulty for the next interview of a round, from your recent verdicts in that round:
 * Hire / Strong Hire → one step harder · Lean Hire → stay · Lean No → stay (one step easier after two in a row)
 * · No Hire → one step easier. No history → Medium.
 */
export const DIFF_ORDER = ["beginner", "easy", "medium", "hard", "expert"] as const;
export type Diff = (typeof DIFF_ORDER)[number];
const LABEL: Record<string, string> = { no_hire: "No Hire", lean_no: "Lean No", lean_hire: "Lean Hire", hire: "Hire", strong_hire: "Strong Hire" };

export type PastRound = { kind: string; difficulty: string; verdict: string | null; endedAt: string };

const step = (d: string, by: number): Diff => {
  const i = Math.max(0, DIFF_ORDER.indexOf(d as Diff));
  return DIFF_ORDER[Math.min(DIFF_ORDER.length - 1, Math.max(0, i + by))];
};
export const harder = (d: string) => step(d, 1);

export function suggestDifficulty(history: PastRound[], kind: string): { difficulty: Diff; reason: string } {
  const past = history.filter((h) => h.kind === kind && h.verdict).sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const last = past[0];
  if (!last) return { difficulty: "medium", reason: "No verdicts in this round yet — Medium is the typical SDE-1 bar." };
  const was = `${LABEL[last.verdict!] ?? last.verdict} at ${last.difficulty} last time`;
  switch (last.verdict) {
    case "strong_hire": case "hire":
      return last.difficulty === "expert" ? { difficulty: "expert", reason: `${was} — already the top level.` } : { difficulty: step(last.difficulty, 1), reason: `${was}, so one step harder.` };
    case "no_hire":
      return { difficulty: step(last.difficulty, -1), reason: `${was}, so one step easier to rebuild.` };
    case "lean_no": {
      const prev = past[1];
      const twice = prev && prev.difficulty === last.difficulty && (prev.verdict === "lean_no" || prev.verdict === "no_hire");
      return twice ? { difficulty: step(last.difficulty, -1), reason: `Two Lean No or worse at ${last.difficulty} in a row, so one step easier.` } : { difficulty: step(last.difficulty, 0), reason: `${was} — try the same level again.` };
    }
    default:
      return { difficulty: step(last.difficulty, 0), reason: `${was} — consolidate at this level.` };
  }
}
