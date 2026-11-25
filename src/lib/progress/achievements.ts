/**
 * Achievements, personal bests and the weekly recap — all derived from recorded activity.
 * Each achievement records WHEN it was earned (the moment the condition first became true).
 */
import type { InterviewIn, Progress, SubmissionIn, TaskIn } from "./xp";
import { dayKey } from "./xp";
import { PROBLEM_BY_SLUG } from "@/lib/dsa/bank";

export type AchievementDef = { id: string; name: string; desc: string; icon: string };
export type Achievement = AchievementDef & { earnedAt: string | null; progress?: { have: number; need: number } };

const hasTopic = (slug: string, topic: string) => PROBLEM_BY_SLUG[slug]?.topics.includes(topic) ?? false;

type Ctx = { interviews: InterviewIn[]; submissions: SubmissionIn[]; tasks: TaskIn[]; progress: Progress };

/** Returns the moment the n-th item (sorted by time) happened, or null. */
const nth = (times: string[], n: number) => { const s = [...times].sort(); return s.length >= n ? s[n - 1] : null; };

function firstSolves(subs: SubmissionIn[]) {
  const out = new Map<string, SubmissionIn & { tries: number }>();
  const tries = new Map<string, number>();
  for (const s of [...subs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (out.has(s.slug)) continue;
    tries.set(s.slug, (tries.get(s.slug) ?? 0) + 1);
    if (s.status === "accepted") out.set(s.slug, { ...s, tries: tries.get(s.slug)! });
  }
  return [...out.values()];
}

const DEFS: (AchievementDef & { check: (c: Ctx) => { at: string | null; have?: number; need?: number } })[] = [
  { id: "first-interview", name: "First Contact", desc: "Complete your first mock interview.", icon: "mic",
    check: (c) => ({ at: nth(c.interviews.map((i) => i.endedAt), 1), have: c.interviews.length, need: 1 }) },
  { id: "interviews-10", name: "Regular", desc: "Complete 10 mock interviews.", icon: "repeat",
    check: (c) => ({ at: nth(c.interviews.map((i) => i.endedAt), 10), have: c.interviews.length, need: 10 }) },
  { id: "well-rounded", name: "Well-Rounded", desc: "Complete 5 different kinds of round.", icon: "shapes",
    check: (c) => {
      const firsts = new Map<string, string>();
      for (const i of [...c.interviews].sort((a, b) => a.endedAt.localeCompare(b.endedAt))) if (!firsts.has(i.kind)) firsts.set(i.kind, i.endedAt);
      return { at: nth([...firsts.values()], 5), have: firsts.size, need: 5 };
    } },
  { id: "hireable", name: "Hireable", desc: "Get a Hire (or better) verdict.", icon: "badge-check",
    check: (c) => ({ at: nth(c.interviews.filter((i) => i.verdict === "hire" || i.verdict === "strong_hire").map((i) => i.endedAt), 1) }) },
  { id: "bar-raised", name: "Bar Raised", desc: "Get a Strong Hire verdict.", icon: "crown",
    check: (c) => ({ at: nth(c.interviews.filter((i) => i.verdict === "strong_hire").map((i) => i.endedAt), 1) }) },
  { id: "comeback", name: "Comeback", desc: "Beat your previous score in the same round by 15+ points.", icon: "trending-up",
    check: (c) => {
      const last = new Map<string, number>();
      for (const i of [...c.interviews].sort((a, b) => a.endedAt.localeCompare(b.endedAt))) {
        if (i.overall == null) continue;
        const p = last.get(i.kind);
        if (p != null && i.overall - p >= 15) return { at: i.endedAt };
        last.set(i.kind, i.overall);
      }
      return { at: null };
    } },
  { id: "hello-judge", name: "Hello, Judge", desc: "Get your first accepted submission.", icon: "check",
    check: (c) => { const f = firstSolves(c.submissions); return { at: nth(f.map((s) => s.createdAt), 1), have: f.length, need: 1 }; } },
  { id: "solver-10", name: "Problem Solver", desc: "Solve 10 different problems.", icon: "code",
    check: (c) => { const f = firstSolves(c.submissions); return { at: nth(f.map((s) => s.createdAt), 10), have: f.length, need: 10 }; } },
  { id: "solver-25", name: "Grinder", desc: "Solve 25 different problems.", icon: "flame",
    check: (c) => { const f = firstSolves(c.submissions); return { at: nth(f.map((s) => s.createdAt), 25), have: f.length, need: 25 }; } },
  { id: "solver-50", name: "Problem Hoarder", desc: "Solve 50 different problems.", icon: "library",
    check: (c) => { const f = firstSolves(c.submissions); return { at: nth(f.map((s) => s.createdAt), 50), have: f.length, need: 50 }; } },
  { id: "hard-mode", name: "Hard Mode", desc: "Solve a Hard problem.", icon: "mountain",
    check: (c) => ({ at: nth(firstSolves(c.submissions).filter((s) => s.difficulty === "hard").map((s) => s.createdAt), 1) }) },
  { id: "one-shot", name: "One Shot", desc: "Get a problem accepted on your very first submission.", icon: "target",
    check: (c) => ({ at: nth(firstSolves(c.submissions).filter((s) => s.tries === 1).map((s) => s.createdAt), 1) }) },
  { id: "no-training-wheels", name: "No Training Wheels", desc: "Solve a Medium or Hard problem with no hints.", icon: "bike",
    check: (c) => ({ at: nth(firstSolves(c.submissions).filter((s) => s.difficulty !== "easy" && s.hintsUsed === 0).map((s) => s.createdAt), 1) }) },
  { id: "polyglot", name: "Polyglot", desc: "Get accepted in 3 different languages.", icon: "languages",
    check: (c) => {
      const firsts = new Map<string, string>();
      for (const s of [...c.submissions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) if (s.status === "accepted" && !firsts.has(s.language)) firsts.set(s.language, s.createdAt);
      return { at: nth([...firsts.values()], 3), have: firsts.size, need: 3 };
    } },
  { id: "node-whisperer", name: "Node Whisperer", desc: "Solve a linked-list problem and a tree problem.", icon: "git-branch",
    check: (c) => {
      const f = firstSolves(c.submissions);
      const l = nth(f.filter((s) => hasTopic(s.slug, "Linked list")).map((s) => s.createdAt), 1);
      const t = nth(f.filter((s) => hasTopic(s.slug, "Tree")).map((s) => s.createdAt), 1);
      return { at: l && t ? (l > t ? l : t) : null };
    } },
  { id: "streak-7", name: "On a Roll", desc: "Practise 7 days in a row.", icon: "calendar",
    check: (c) => ({ at: streakReachedAt(c.progress.activeDays, 7), have: c.progress.streak.longest, need: 7 }) },
  { id: "streak-30", name: "Unstoppable", desc: "Practise 30 days in a row.", icon: "zap",
    check: (c) => ({ at: streakReachedAt(c.progress.activeDays, 30), have: c.progress.streak.longest, need: 30 }) },
  { id: "closer", name: "Closer", desc: "Finish 25 study tasks.", icon: "list-checks",
    check: (c) => ({ at: nth(c.tasks.map((t) => t.doneAt), 25), have: c.tasks.length, need: 25 }) },
];

function streakReachedAt(days: string[], n: number): string | null {
  let run = 0, prev = -Infinity;
  for (const d of days) {
    const k = Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
    run = k === prev + 1 ? run + 1 : 1;
    prev = k;
    if (run >= n) return `${d}T23:59:59Z`;
  }
  return null;
}

export function computeAchievements(c: Ctx): Achievement[] {
  return DEFS.map(({ check, ...def }) => {
    const r = check(c);
    return { ...def, earnedAt: r.at, ...(r.need ? { progress: { have: Math.min(r.have ?? 0, r.need), need: r.need } } : {}) };
  });
}

export const ACHIEVEMENT_COUNT = DEFS.length;

// ───────────── Personal bests ─────────────

export type Bests = {
  bestScoreByKind: { kind: string; overall: number; id: string }[];
  fastestSolve: { difficulty: string; seconds: number; slug: string }[];
  longestStreak: number;
  bestDayXp: { date: string; xp: number } | null;
  solved: number;
};

export function computeBests(c: Ctx): Bests {
  const byKind = new Map<string, { kind: string; overall: number; id: string }>();
  for (const i of c.interviews) if (i.overall != null && (byKind.get(i.kind)?.overall ?? -1) < i.overall) byKind.set(i.kind, { kind: i.kind, overall: i.overall, id: i.id });
  const fastest = new Map<string, { difficulty: string; seconds: number; slug: string }>();
  for (const s of c.submissions) {
    if (s.status !== "accepted" || !s.difficulty || !s.solveSeconds || s.solveSeconds <= 0) continue;
    const cur = fastest.get(s.difficulty);
    if (!cur || s.solveSeconds < cur.seconds) fastest.set(s.difficulty, { difficulty: s.difficulty, seconds: s.solveSeconds, slug: s.slug });
  }
  const perDay = new Map<string, number>();
  for (const e of c.progress.ledger) perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.xp);
  const bestDay = [...perDay.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return {
    bestScoreByKind: [...byKind.values()].sort((a, b) => b.overall - a.overall),
    fastestSolve: ["easy", "medium", "hard"].map((d) => fastest.get(d)).filter((x): x is NonNullable<typeof x> => Boolean(x)),
    longestStreak: c.progress.streak.longest,
    bestDayXp: bestDay ? { date: bestDay[0], xp: bestDay[1] } : null,
    solved: firstSolves(c.submissions).length,
  };
}

// ───────────── Weekly recap & chart series ─────────────

export type WeekStats = { xp: number; interviews: number; solved: number; tasks: number; activeDays: number };

export function weeklyRecap(c: Ctx, now: Date, timeZone = "Asia/Kolkata"): { thisWeek: WeekStats; lastWeek: WeekStats } {
  const today = Math.round(Date.parse(`${dayKey(now, timeZone)}T00:00:00Z`) / 86_400_000);
  const bucket = (date: string) => { const d = today - Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000); return d < 7 ? 0 : d < 14 ? 1 : -1; };
  const empty = (): WeekStats => ({ xp: 0, interviews: 0, solved: 0, tasks: 0, activeDays: 0 });
  const w = [empty(), empty()];
  for (const e of c.progress.ledger) {
    const b = bucket(e.date); if (b < 0) continue;
    w[b].xp += e.xp;
    if (e.source === "interview") w[b].interviews++;
    if (e.source === "problem") w[b].solved++;
  }
  for (const t of c.tasks) { const b = bucket(dayKey(t.doneAt, timeZone)); if (b >= 0) w[b].tasks++; }
  for (const d of c.progress.activeDays) { const b = bucket(d); if (b >= 0) w[b].activeDays++; }
  return { thisWeek: w[0], lastWeek: w[1] };
}

/** XP earned per day for the last `days` days (oldest first), including empty days. */
export function dailyXp(progress: Progress, now: Date, days = 30, timeZone = "Asia/Kolkata"): { date: string; xp: number }[] {
  const per = new Map<string, number>();
  for (const e of progress.ledger) per.set(e.date, (per.get(e.date) ?? 0) + e.xp);
  const end = Date.parse(`${dayKey(now, timeZone)}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { date, xp: per.get(date) ?? 0 };
  });
}
