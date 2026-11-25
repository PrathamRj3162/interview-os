/**
 * Deterministic verdict: the same rubric scores and facts always give the same verdict, and every step is
 * written down so the candidate can see exactly why. The AI only scores categories (with verified quotes);
 * it never picks the verdict.
 *
 * 1. Weighted mean of scored categories (core categories count double), on the 1–4 scale.
 * 2. Base level from the mean: ≥3.5 Strong Hire · ≥3.0 Hire · ≥2.5 Lean Hire · ≥2.0 Lean No · else No Hire.
 * 3. Caps that only ever lower the level:
 *    - a core category at 1 → at most Lean No; any category at 1 → at most Lean Hire;
 *    - Strong Hire needs every scored category at 3 or more, otherwise at most Hire;
 *    - coding rounds: no verified working code → at most Lean No; tests failing or too slow → at most Lean Hire;
 *    - practice hints: 2 → at most Hire, 3 → at most Lean Hire.
 * 4. Not enough evidence (fewer than 3 answers, under half the categories scored, or no core category
 *    scored) → no verdict at all rather than a guess.
 */

export const LEVELS = ["no_hire", "lean_no", "lean_hire", "hire", "strong_hire"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<Level, string> = { no_hire: "No Hire", lean_no: "Lean No", lean_hire: "Lean Hire", hire: "Hire", strong_hire: "Strong Hire" };

export type VerdictCategory = { id: string; name: string; score: number | null; weight: number; core: boolean };
export type CodingFacts = {
  /** Best judge submission. null = never submitted. */
  best: { status: string; passed: number; total: number; regularAllPassed: boolean } | null;
  /** The examples passed on a Run at some point (browser or judge). */
  examplesPassed: boolean;
};
export type VerdictInput = {
  categories: VerdictCategory[];
  answers: number;
  hintsUsed?: number;
  coding?: CodingFacts;
};

export type Verdict =
  | { level: Level; label: string; mean: number; base: Level; overall: number; steps: string[]; caps: string[] }
  | { level: null; label: "Not enough evidence"; mean: number | null; base: null; overall: null; steps: string[]; caps: string[] };

const rank = (l: Level) => LEVELS.indexOf(l);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function baseLevel(mean: number): Level {
  return mean >= 3.5 ? "strong_hire" : mean >= 3.0 ? "hire" : mean >= 2.5 ? "lean_hire" : mean >= 2.0 ? "lean_no" : "no_hire";
}

/** 1–4 mean → 0–100 (1 → 0, 4 → 100). */
export const toPercent = (mean: number) => Math.round(((mean - 1) / 3) * 100);

export function computeVerdict(input: VerdictInput): Verdict {
  const scored = input.categories.filter((c) => c.score != null);
  const steps: string[] = [];
  const insufficient = (why: string): Verdict => ({ level: null, label: "Not enough evidence", mean: null, base: null, overall: null, steps: [why], caps: [] });

  if (input.answers < 3) return insufficient(`Only ${input.answers} answer${input.answers === 1 ? "" : "s"} — at least 3 are needed for a verdict.`);
  if (scored.length * 2 < input.categories.length) return insufficient(`Only ${scored.length} of ${input.categories.length} rubric categories had verifiable evidence — at least half are needed.`);
  if (!scored.some((c) => c.core)) return insufficient("None of the core categories for this round had verifiable evidence.");

  const totalW = scored.reduce((s, c) => s + c.weight, 0);
  const mean = round2(scored.reduce((s, c) => s + c.score! * c.weight, 0) / totalW);
  const base = baseLevel(mean);
  steps.push(`Weighted rubric mean ${mean.toFixed(2)} / 4 (${scored.length} scored categor${scored.length === 1 ? "y" : "ies"}; core categories count double) → ${LEVEL_LABEL[base]}.`);

  let level = base;
  const caps: string[] = [];
  const cap = (max: Level, why: string) => {
    if (rank(level) > rank(max)) { level = max; caps.push(`${why} → capped at ${LEVEL_LABEL[max]}.`); }
  };

  for (const c of scored) if (c.core && c.score === 1) cap("lean_no", `Core category "${c.name}" scored 1`);
  for (const c of scored) if (c.score === 1) cap("lean_hire", `"${c.name}" scored 1`);
  if (scored.some((c) => c.score! < 3)) cap("hire", "Strong Hire needs every scored category at 3 or above");

  if (input.coding) {
    const { best, examplesPassed } = input.coding;
    if (!best || best.passed === 0) {
      if (!examplesPassed) cap("lean_no", best ? "No judge test passed" : "Code was never verified on the judge, and the examples never passed");
      else cap("lean_hire", "Examples passed, but the code was never accepted by the judge");
    } else if (best.status !== "accepted") {
      cap("lean_hire", best.status === "time_limit" && best.regularAllPassed
        ? "Correct, but too slow on the large worst-case input"
        : `Best submission passed ${best.passed}/${best.total} tests`);
    }
  }

  const hints = input.hintsUsed ?? 0;
  if (hints >= 3) cap("lean_hire", "All 3 hints used");
  else if (hints === 2) cap("hire", "2 hints used");

  return { level, label: LEVEL_LABEL[level], mean, base, overall: toPercent(mean), steps: [...steps, ...caps], caps };
}

/** The ONE thing to fix: the lowest-scored category (ties → core first, then rubric order). */
export function pickOneThing<T extends VerdictCategory>(categories: T[]): T | null {
  const scored = categories.map((c, i) => ({ c, i })).filter((x) => x.c.score != null);
  if (!scored.length) return null;
  scored.sort((a, b) => a.c.score! - b.c.score! || b.c.weight - a.c.weight || a.i - b.i);
  return scored[0].c;
}
