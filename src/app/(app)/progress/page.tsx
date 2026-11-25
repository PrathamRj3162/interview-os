import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Trophy, Lock, TrendingUp, TrendingDown, Minus, Timer, NotebookPen, Info, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { getPrefs } from "@/lib/prefs";
import { loadProgress } from "@/lib/progress/server";
import { weeklyRecap, dailyXp, ACHIEVEMENT_COUNT, type WeekStats } from "@/lib/progress/achievements";
import { TIERS, DIVISIONS, LEVELS_PER_DIVISION, rankForLevel, xpForLevel, DECAY_GRACE_DAYS } from "@/lib/progress/xp";
import { KINDS, type KindId } from "@/lib/interview/config";
import { PROBLEM_BY_SLUG } from "@/lib/dsa/bank";
import { Emblem, TIER_COLOR } from "@/components/progress/emblem";
import { XpChart } from "@/components/progress/xp-chart";
import { Celebrate } from "@/components/progress/celebrate";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m ${s % 60}s`);

function Delta({ now, before }: { now: number; before: number }) {
  const d = now - before;
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  return <span className={cn("inline-flex items-center gap-0.5 text-xs", d > 0 ? "text-success" : d < 0 ? "text-danger" : "text-muted")}><Icon className="size-3" aria-hidden />{d > 0 ? "+" : ""}{d}</span>;
}

export default async function ProgressPage() {
  const { supabase } = await requireUser();
  const [{ progress: p, achievements, bests, interviews, submissions, tasks }, { vibe }] = await Promise.all([loadProgress(supabase), getPrefs()]);
  const genz = vibe === "genz";
  const now = new Date();
  const recap = weeklyRecap({ interviews, submissions, tasks, progress: p }, now);
  const chart = dailyXp(p, now, 30);
  const earned = achievements.filter((a) => a.earnedAt).sort((a, b) => b.earnedAt!.localeCompare(a.earnedAt!));
  const locked = achievements.filter((a) => !a.earnedAt);
  const levelPct = Math.round(((p.xp - p.levelStart) / Math.max(1, p.nextLevelAt - p.levelStart)) * 100);
  const empty = p.ledger.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
          <p className="text-sm text-muted">XP, rank, streaks and achievements — all computed from what you actually did.</p>
        </div>
        <Link href="/progress/notebook" className={buttonClasses("secondary", "sm")}><NotebookPen className="size-4" aria-hidden />Mistake notebook</Link>
      </div>

      <Celebrate level={p.level} rankIndex={p.rank.index} rankLabel={p.rank.label} earned={earned.map((a) => a.name)} genz={genz} />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5 lg:col-span-2" data-testid="rank-card">
          <Emblem rank={p.rank} size={96} />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted">Rank</p>
            <p className="text-2xl font-semibold" style={{ color: TIER_COLOR[p.rank.tier.id] }}>{p.rank.label}</p>
            <p className="text-sm text-muted">{genz ? p.rank.tier.tagline : p.rank.tier.pro}</p>
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span>Level <span className="font-mono font-semibold tabular-nums">{p.level}</span></span>
              <span className="font-mono tabular-nums text-muted">{p.xp.toLocaleString("en-IN")} / {p.nextLevelAt.toLocaleString("en-IN")} XP</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-surface-2" role="progressbar" aria-label="Progress to next level" aria-valuenow={levelPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 rounded-full bg-accent" style={{ width: `${levelPct}%` }} />
            </div>
            {p.nextRank && <p className="mt-2 text-xs text-muted">{p.xpToNextRank?.toLocaleString("en-IN")} XP to {p.nextRank.label}</p>}
          </div>
        </Card>
        <Card className="flex flex-col justify-center">
          <p className="flex items-center gap-2 text-sm text-muted"><Flame className={cn("size-4", p.streak.current ? "text-warning" : "text-muted")} aria-hidden />Streak</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{p.streak.current} <span className="text-base font-normal text-muted">day{p.streak.current === 1 ? "" : "s"}</span></p>
          <p className="mt-1 text-xs text-muted">Longest: {p.streak.longest} · {p.streak.activeToday ? "today counted ✓" : p.streak.current ? "practise today to keep it" : "any interview, solve or task starts one"}</p>
        </Card>
      </section>

      {(p.decay > 0 || (p.inactiveDays >= 5 && !empty)) && (
        <Card className="flex gap-3 border-warning/40 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p>{p.decay > 0
            ? `You've been away ${p.inactiveDays} days, so ${p.decay.toLocaleString("en-IN")} XP has decayed (1% a day after ${DECAY_GRACE_DAYS} days). You can't drop below your tier's floor, and any activity stops it.`
            : `No activity for ${p.inactiveDays} days. XP starts decaying by 1% a day after ${DECAY_GRACE_DAYS} inactive days.`}</p>
        </Card>
      )}

      {empty ? (
        <Card className="text-sm text-muted">
          {genz ? "No XP yet. Finish a mock interview, solve a problem or tick off a task and the numbers start moving." : "No XP yet. Completing an interview, solving a problem or finishing a task earns XP."}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/interview/new" className={buttonClasses("primary", "sm")}>Start an interview</Link>
            <Link href="/interview/new?kind=dsa" className={buttonClasses("secondary", "sm")}>Solve a problem</Link>
          </div>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="font-medium">XP per day</h2>
            <div className="mt-3"><XpChart data={chart} /></div>
          </Card>
          <Card>
            <h2 className="font-medium">This week</h2>
            <WeekTable a={recap.thisWeek} b={recap.lastWeek} />
            <h3 className="mt-4 text-xs font-medium text-muted">All-time XP by source</h3>
            <dl className="mt-1 grid grid-cols-2 gap-1 text-sm">
              {(["interview", "problem", "task", "streak"] as const).map((k) => (
                <div key={k} className="flex justify-between gap-2"><dt className="capitalize text-muted">{k === "problem" ? "Problems" : k === "task" ? "Tasks" : k === "streak" ? "Streaks" : "Interviews"}</dt><dd className="font-mono tabular-nums">{p.bySource[k]}</dd></div>
              ))}
            </dl>
          </Card>
        </section>
      )}

      <section aria-labelledby="ach-h">
        <h2 id="ach-h" className="mb-3 flex items-center gap-2 text-lg font-medium"><Trophy className="size-4 text-primary" aria-hidden />Achievements <span className="text-sm font-normal text-muted">{earned.length}/{ACHIEVEMENT_COUNT}</span></h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...earned, ...locked].map((a) => (
            <li key={a.id}>
              <Card className={cn("h-full p-4", !a.earnedAt && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", a.earnedAt ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted")}>
                    {a.earnedAt ? <Trophy className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted">{a.desc}</p>
                    {a.earnedAt ? <p className="mt-1 text-xs text-success">Earned {fmtDate(a.earnedAt)}</p>
                      : a.progress && a.progress.need > 1 ? (
                        <div className="mt-2">
                          <div className="h-1 rounded-full bg-surface-2"><div className="h-1 rounded-full bg-accent" style={{ width: `${(a.progress.have / a.progress.need) * 100}%` }} /></div>
                          <p className="mt-1 text-xs tabular-nums text-muted">{a.progress.have}/{a.progress.need}</p>
                        </div>
                      ) : null}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-medium"><Timer className="size-4 text-muted" aria-hidden />Personal bests</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Problems solved</dt><dd className="font-mono tabular-nums">{bests.solved}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Longest streak</dt><dd className="font-mono tabular-nums">{bests.longestStreak} days</dd></div>
            {bests.bestDayXp && <div className="flex justify-between gap-3"><dt className="text-muted">Best day</dt><dd className="font-mono tabular-nums">{bests.bestDayXp.xp} XP · {bests.bestDayXp.date}</dd></div>}
            {bests.fastestSolve.map((f) => (
              <div key={f.difficulty} className="flex justify-between gap-3"><dt className="text-muted">Fastest {f.difficulty} solve</dt><dd className="text-right"><span className="font-mono tabular-nums">{fmtDur(f.seconds)}</span> <span className="text-xs text-muted">{PROBLEM_BY_SLUG[f.slug]?.title ?? f.slug}</span></dd></div>
            ))}
            {bests.bestScoreByKind.map((b) => (
              <div key={b.kind} className="flex justify-between gap-3"><dt className="text-muted">Best {KINDS[b.kind as KindId]?.name ?? b.kind}</dt><dd><Link href={`/interview/${b.id}/report`} className="font-mono tabular-nums underline-offset-2 hover:underline">{b.overall}/100</Link></dd></div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">Solve time is measured from the start of the interview to the accepted submission.</p>
        </Card>
        <Card>
          <h2 className="font-medium">Recent XP</h2>
          {p.ledger.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {[...p.ledger].reverse().slice(0, 12).map((e, i) => (
                <li key={i} className="flex justify-between gap-3"><span className="min-w-0 truncate text-muted" title={e.label}><span className="text-text">{e.date}</span> · {e.label}</span><span className="shrink-0 font-mono tabular-nums text-success">+{e.xp}</span></li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted">Nothing yet.</p>}
        </Card>
      </section>

      <section aria-labelledby="ladder-h">
        <h2 id="ladder-h" className="mb-3 text-lg font-medium">The ladder</h2>
        <div className="overflow-x-auto">
          <ol className="flex min-w-max gap-2 pb-2">
            {TIERS.map((t, ti) => (
              <li key={t.id} className={cn("w-40 rounded-[var(--radius-lg)] border p-3", p.rank.tier.id === t.id ? "border-accent bg-accent-soft" : "border-border bg-surface")}>
                <Emblem rank={rankForLevel(ti * DIVISIONS.length * LEVELS_PER_DIVISION)} size={40} />
                <p className="mt-2 font-medium" style={{ color: TIER_COLOR[t.id] }}>{t.name}</p>
                <p className="text-xs text-muted">{genz ? t.tagline : t.pro}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">from {xpForLevel(ti * DIVISIONS.length * LEVELS_PER_DIVISION).toLocaleString("en-IN")} XP</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <details className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium"><Info className="size-4 text-muted" aria-hidden />How XP works</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
          <li><b className="text-text">Interview:</b> overall score (0–100) × difficulty (Beginner 0.6 · Easy 0.8 · Medium 1.0 · Hard 1.3 · Expert 1.6). Needs at least 3 answers.</li>
          <li><b className="text-text">Problem:</b> Easy 20 · Medium 40 · Hard 80, the first time you get it accepted. Half if you used 2+ hints; +10 if your very first submission was accepted.</li>
          <li><b className="text-text">Task:</b> +10 each, up to 30 a day.</li>
          <li><b className="text-text">Streak:</b> +5 × your streak length (up to 10) on every active day.</li>
          <li><b className="text-text">Levels:</b> level k needs 150 × k<sup>1.6</sup> XP. Every 3 levels is a new division (III → II → I); every 3 divisions a new tier.</li>
          <li><b className="text-text">Decay:</b> after {DECAY_GRACE_DAYS} days without activity, −1% a day, never below the start of your tier.</li>
        </ul>
        <p className="mt-2 text-xs text-muted">Everything is recomputed from your interviews, submissions and tasks each time — there&apos;s no XP number stored that could drift.</p>
      </details>
    </div>
  );
}

function WeekTable({ a, b }: { a: WeekStats; b: WeekStats }) {
  const rows: [string, keyof WeekStats][] = [["XP", "xp"], ["Active days", "activeDays"], ["Interviews", "interviews"], ["Problems solved", "solved"], ["Tasks done", "tasks"]];
  return (
    <table className="mt-2 w-full text-sm">
      <thead><tr className="text-xs text-muted"><th className="text-left font-normal" /><th className="text-right font-normal">Last 7 days</th><th className="text-right font-normal">vs previous</th></tr></thead>
      <tbody>
        {rows.map(([label, k]) => (
          <tr key={k}><td className="py-0.5 text-muted">{label}</td><td className="text-right font-mono tabular-nums">{a[k]}</td><td className="text-right"><Delta now={a[k]} before={b[k]} /></td></tr>
        ))}
      </tbody>
    </table>
  );
}

