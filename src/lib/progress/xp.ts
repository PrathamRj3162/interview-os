/**
 * XP, levels and tiers — computed from what you actually did (completed interviews, accepted judge
 * submissions, finished tasks), never stored as a number you could edit. Same input, same result.
 *
 * Interview  = overall score (0–100) × difficulty multiplier; needs at least 3 answers.
 * Problem    = Easy 20 / Medium 40 / Hard 80, first accepted solve per problem only;
 *              ×0.5 if 2+ hints were used; +10 if the very first submission was accepted.
 * Daily task = +10 each, at most 30 XP per day.
 * Streak     = +5 × min(streak, 10) on every active day (a day with any XP-earning activity).
 * Level k    = reached at 150 · k^1.6 total XP.
 * Decay      = after 7 inactive days, −1% per extra inactive day, never below your tier's floor.
 */

export const DIFF_MULT: Record<string, number> = { beginner: 0.6, easy: 0.8, medium: 1.0, hard: 1.3, expert: 1.6 };
export const PROBLEM_XP: Record<string, number> = { easy: 20, medium: 40, hard: 80 };
export const TASK_XP = 10;
export const TASK_DAILY_CAP = 30;
export const FIRST_TRY_BONUS = 10;
export const STREAK_STEP = 5;
export const STREAK_CAP = 10;
export const DECAY_GRACE_DAYS = 7;
export const DECAY_RATE = 0.01;

export const TIERS = [
  { id: "intern", name: "Intern", tagline: "Main character arc loading", pro: "Getting started" },
  { id: "junior", name: "Junior", tagline: "Shipping, no cap", pro: "Building the basics" },
  { id: "sde1", name: "SDE-1", tagline: "Certified problem solver", pro: "Interview-ready fundamentals" },
  { id: "sde2", name: "SDE-2", tagline: "Lowkey carrying the team", pro: "Consistent, strong performance" },
  { id: "senior", name: "Senior", tagline: "Code reviews hit different", pro: "Depth across round types" },
  { id: "staff", name: "Staff", tagline: "Architect energy", pro: "Exceptional, sustained practice" },
  { id: "principal", name: "Principal", tagline: "Final boss of the loop", pro: "Top of the ladder" },
] as const;
export const DIVISIONS = ["III", "II", "I"] as const;
/** Levels per division: 7 tiers × 3 divisions × 3 levels → Principal I from level 60. */
export const LEVELS_PER_DIVISION = 3;
export const RANK_COUNT = TIERS.length * DIVISIONS.length;

export const xpForLevel = (k: number) => (k <= 0 ? 0 : Math.round(150 * Math.pow(k, 1.6)));

export function levelFromXp(xp: number): number {
  let k = 0;
  while (xpForLevel(k + 1) <= xp) k++;
  return k;
}

export type Rank = { index: number; tier: (typeof TIERS)[number]; division: (typeof DIVISIONS)[number]; label: string };

export function rankForLevel(level: number): Rank {
  const index = Math.min(RANK_COUNT - 1, Math.floor(level / LEVELS_PER_DIVISION));
  const tier = TIERS[Math.floor(index / DIVISIONS.length)];
  const division = DIVISIONS[index % DIVISIONS.length];
  return { index, tier, division, label: `${tier.name} ${division}` };
}

/** XP at which the tier containing `level` begins (decay never drops you below it). */
export function tierFloorXp(level: number): number {
  const tierIdx = Math.floor(rankForLevel(level).index / DIVISIONS.length);
  return xpForLevel(tierIdx * DIVISIONS.length * LEVELS_PER_DIVISION);
}

// ───────────── Inputs ─────────────

export type InterviewIn = { id: string; kind: string; difficulty: string; overall: number | null; answers: number; endedAt: string; verdict?: string | null };
export type SubmissionIn = { slug: string; difficulty: string | null; status: string; hintsUsed: number; createdAt: string; language: string; solveSeconds?: number | null };
export type TaskIn = { doneAt: string };
export type ProgressInput = { interviews: InterviewIn[]; submissions: SubmissionIn[]; tasks: TaskIn[]; now: Date; timeZone?: string };

export type LedgerEntry = { date: string; at: string; source: "interview" | "problem" | "task" | "streak"; label: string; xp: number; ref?: string };

export type Progress = {
  rawXp: number;
  decay: number;
  xp: number;
  level: number;
  levelStart: number;
  nextLevelAt: number;
  rank: Rank;
  nextRank: Rank | null;
  xpToNextRank: number | null;
  streak: { current: number; longest: number; activeToday: boolean; lastActive: string | null };
  inactiveDays: number;
  ledger: LedgerEntry[];
  bySource: Record<LedgerEntry["source"], number>;
  activeDays: string[];
};

/** Calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function dayKey(d: Date | string, timeZone = "Asia/Kolkata"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
const dayNum = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / 86_400_000);

export function computeProgress(input: ProgressInput): Progress {
  const tz = input.timeZone ?? "Asia/Kolkata";
  const ledger: LedgerEntry[] = [];

  for (const iv of input.interviews) {
    if (iv.overall == null || iv.answers < 3) continue;
    const xp = Math.round(iv.overall * (DIFF_MULT[iv.difficulty] ?? 1));
    if (xp > 0) ledger.push({ date: dayKey(iv.endedAt, tz), at: iv.endedAt, source: "interview", label: `${iv.kind} interview (${iv.overall}/100 × ${DIFF_MULT[iv.difficulty] ?? 1})`, xp, ref: iv.id });
  }

  const subs = [...input.submissions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const seen = new Map<string, number>(); // slug → submissions before the first accepted
  const solved = new Set<string>();
  for (const s of subs) {
    if (solved.has(s.slug)) continue;
    const before = seen.get(s.slug) ?? 0;
    seen.set(s.slug, before + 1);
    if (s.status !== "accepted" || !s.difficulty) continue;
    solved.add(s.slug);
    let xp = PROBLEM_XP[s.difficulty] ?? 0;
    const notes: string[] = [s.difficulty];
    if (s.hintsUsed >= 2) { xp = Math.round(xp * 0.5); notes.push(`${s.hintsUsed} hints ×0.5`); }
    if (before === 0) { xp += FIRST_TRY_BONUS; notes.push("first try +10"); }
    ledger.push({ date: dayKey(s.createdAt, tz), at: s.createdAt, source: "problem", label: `Solved ${s.slug} (${notes.join(", ")})`, xp, ref: s.slug });
  }

  const tasksByDay = new Map<string, TaskIn[]>();
  for (const t of input.tasks) {
    const k = dayKey(t.doneAt, tz);
    tasksByDay.set(k, [...(tasksByDay.get(k) ?? []), t]);
  }
  for (const [date, ts] of tasksByDay) {
    const xp = Math.min(TASK_DAILY_CAP, ts.length * TASK_XP);
    const last = ts.map((t) => t.doneAt).sort().at(-1)!;
    ledger.push({ date, at: last, source: "task", label: `${ts.length} task${ts.length === 1 ? "" : "s"} done${ts.length * TASK_XP > TASK_DAILY_CAP ? " (daily cap 30)" : ""}`, xp });
  }

  // Streaks over active days.
  const activeDays = [...new Set(ledger.map((e) => e.date))].sort();
  let run = 0, longest = 0, prev = -Infinity;
  for (const d of activeDays) {
    const n = dayNum(d);
    run = n === prev + 1 ? run + 1 : 1;
    prev = n;
    longest = Math.max(longest, run);
    ledger.push({ date: d, at: `${d}T23:59:59Z`, source: "streak", label: `Day ${run} streak`, xp: STREAK_STEP * Math.min(run, STREAK_CAP) });
  }
  ledger.sort((a, b) => a.at.localeCompare(b.at));

  const today = dayKey(input.now, tz);
  const lastActive = activeDays.at(-1) ?? null;
  const gap = lastActive ? dayNum(today) - dayNum(lastActive) : 0;
  const current = lastActive && gap <= 1 ? run : 0; // a streak survives until the end of the next day

  const rawXp = ledger.reduce((s, e) => s + e.xp, 0);
  const rawLevel = levelFromXp(rawXp);
  let xp = rawXp;
  if (lastActive && gap > DECAY_GRACE_DAYS) {
    xp = Math.max(tierFloorXp(rawLevel), Math.round(rawXp * Math.pow(1 - DECAY_RATE, gap - DECAY_GRACE_DAYS)));
    xp = Math.min(xp, rawXp);
  }
  const level = levelFromXp(xp);
  const rank = rankForLevel(level);
  const nextRank = rank.index < RANK_COUNT - 1 ? rankForLevel((rank.index + 1) * LEVELS_PER_DIVISION) : null;

  const bySource = { interview: 0, problem: 0, task: 0, streak: 0 };
  for (const e of ledger) bySource[e.source] += e.xp;

  return {
    rawXp, decay: rawXp - xp, xp, level,
    levelStart: xpForLevel(level), nextLevelAt: xpForLevel(level + 1),
    rank, nextRank, xpToNextRank: nextRank ? xpForLevel((rank.index + 1) * LEVELS_PER_DIVISION) - xp : null,
    streak: { current, longest, activeToday: lastActive === today, lastActive },
    inactiveDays: lastActive ? gap : 0,
    ledger, bySource, activeDays,
  };
}
