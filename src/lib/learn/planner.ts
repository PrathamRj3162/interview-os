/**
 * Weekly planner: turns measured gaps into dated tasks within your daily time budget. Deterministic for the
 * same inputs, and every task says why it was picked. Nothing here is AI-generated.
 */
export type PlanKind = "dsa" | "lesson" | "quiz" | "system_design" | "project" | "mock" | "revision" | "resume";
export type PlannedTask = { due_date: string; kind: PlanKind; title: string; link: string; reason: string; minutes: number };

export type PlannerInput = {
  start: string;                 // YYYY-MM-DD (today)
  days?: number;                 // default 7
  dailyMinutes: number;
  deadline: string | null;
  /** Lowest-scored rubric areas from recent reports, worst first. */
  weakAreas: { name: string; kind: string; fix: string; reportId: string }[];
  /** Problems attempted but not solved. */
  unsolved: { slug: string; title: string }[];
  /** Patterns with their solve ratio. */
  patterns: { slug: string; title: string; solved: number; total: number }[];
  /** Fundamentals accuracy per topic (null = never attempted). */
  fundamentals: { slug: string; name: string; pct: number | null }[];
  dueCards: number;
  /** Interview kinds practised recently (most recent first). */
  recentKinds: string[];
  /** Titles already planned and open on each date, to avoid duplicates. */
  existing: { due_date: string; title: string }[];
};

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function planWeek(i: PlannerInput): PlannedTask[] {
  const days = i.days ?? 7;
  const budget = Math.max(30, Math.min(480, Math.round(i.dailyMinutes)));
  const lastDay = i.deadline && i.deadline >= i.start ? Math.min(days - 1, Math.round((Date.parse(i.deadline) - Date.parse(i.start)) / 86_400_000)) : days - 1;
  const pool: Omit<PlannedTask, "due_date">[] = [];

  // 1. Revision first: short, daily, compounding.
  // 2. Fix the weakest interview areas with a targeted re-take.
  for (const w of i.weakAreas.slice(0, 2)) pool.push({ kind: "mock", title: `Re-take a ${w.kind} round focusing on ${w.name.toLowerCase()}`, link: `/interview/new?kind=${w.kind}`, reason: `Lowest-scored area in a recent report: ${w.fix}`.slice(0, 500), minutes: 30 });
  // 3. Unfinished problems — finishing beats starting new ones.
  for (const u of i.unsolved.slice(0, 3)) pool.push({ kind: "dsa", title: `Finish "${u.title}"`, link: `/dsa/${u.slug}`, reason: "You attempted this but it hasn't been accepted yet.", minutes: 40 });
  // 4. Weakest patterns (fewest solved relative to size), reading + two problems.
  const weakPatterns = [...i.patterns].filter((p) => p.total > 0).sort((a, b) => a.solved / a.total - b.solved / b.total || a.slug.localeCompare(b.slug)).slice(0, 3);
  for (const p of weakPatterns) pool.push({ kind: "dsa", title: `${p.title}: read the guide, then solve a problem`, link: `/dsa/patterns/${p.slug}`, reason: `You've solved ${p.solved} of ${p.total} problems that use this pattern.`, minutes: 45 });
  // 5. Fundamentals: never attempted or under 70%.
  for (const f of [...i.fundamentals].sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1)).filter((f) => f.pct == null || f.pct < 70).slice(0, 2))
    pool.push({ kind: "quiz", title: `${f.name} quiz`, link: `/fundamentals/${f.slug}/quiz`, reason: f.pct == null ? "Not attempted yet." : `Your accuracy is ${f.pct}%.`, minutes: 15 });
  // 6. A round you haven't done lately.
  const rounds = ["dsa", "behavioral", "hld", "fundamentals", "project", "lld", "resume_screen", "hr"];
  const fresh = rounds.find((k) => !i.recentKinds.slice(0, 5).includes(k));
  if (fresh) pool.push({ kind: "mock", title: `Try a ${fresh.replace("_", " ")} mock interview`, link: `/interview/new?kind=${fresh}`, reason: "You haven't practised this round recently — breadth matters in real loops.", minutes: 30 });

  // A task never needs more than one day's free time: trim it rather than silently dropping it.
  const daily = budget - (i.dueCards > 0 ? 10 : 0);
  for (const t of pool) t.minutes = Math.max(10, Math.min(t.minutes, daily));
  const out: PlannedTask[] = [];
  const taken = new Set(i.existing.map((e) => `${e.due_date}|${e.title}`));
  const used = new Map<string, number>();
  const put = (day: number, t: Omit<PlannedTask, "due_date">) => {
    const date = addDays(i.start, day);
    if (taken.has(`${date}|${t.title}`)) return true; // already planned: counts as placed
    if ((used.get(date) ?? 0) + t.minutes > budget) return false;
    used.set(date, (used.get(date) ?? 0) + t.minutes);
    out.push({ ...t, due_date: date });
    taken.add(`${date}|${t.title}`);
    return true;
  };

  if (i.dueCards > 0) for (let d = 0; d <= lastDay; d++) put(d, { kind: "revision", title: "Review due flashcards", link: "/revision", reason: `${i.dueCards} card${i.dueCards === 1 ? " is" : "s are"} due; short daily reviews stick better than long ones.`, minutes: 10 });
  let day = 0;
  for (const t of pool) {
    for (let tries = 0; tries <= lastDay; tries++) {
      if (put((day + tries) % (lastDay + 1), t)) { day = (day + tries + 1) % (lastDay + 1); break; }
    }
  }
  return out.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.title.localeCompare(b.title));
}
