import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Flame, Code2, Mic } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { PROBLEM_BY_SLUG } from "@/lib/dsa/bank";
import { computeProgress, type InterviewIn, type SubmissionIn } from "@/lib/progress/xp";
import { computeAchievements, computeBests } from "@/lib/progress/achievements";
import { KINDS, type KindId } from "@/lib/interview/config";
import { ROLES } from "@/lib/validation/profile";
import { Emblem, TIER_COLOR } from "@/components/progress/emblem";

type Raw = {
  handle: string; name: string; role: string | null; since: string; showScores: boolean;
  interviews: { kind: string; difficulty: string; overall: number | null; answers: number | null; endedAt: string; verdict: string | null }[];
  submissions: { slug: string; status: string; hintsUsed: number; createdAt: string; language: string; solveSeconds: number | null }[];
  tasks: { doneAt: string }[];
};

const VERDICT: Record<string, string> = { no_hire: "No Hire", lean_no: "Lean No", lean_hire: "Lean Hire", hire: "Hire", strong_hire: "Strong Hire" };

async function load(handle: string): Promise<Raw | null> {
  if (!/^[a-z0-9_]{3,24}$/i.test(handle)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_profile", { handle: handle.toLowerCase() });
  if (error) { console.error("[public-profile]", error.code); return null; }
  return (data as Raw | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const p = await load(handle);
  // Opt-in pages are shareable by link but not indexed by search engines.
  return { title: p ? `${p.name} (@${p.handle})` : "Profile not found", robots: { index: false, follow: false } };
}

/** Opt-in public profile. Everything here is computed from server-verified practice activity. */
export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const raw = await load(handle);
  if (!raw) notFound();

  const interviews: InterviewIn[] = raw.interviews.map((i, k) => ({ id: String(k), kind: i.kind, difficulty: i.difficulty, overall: i.overall == null ? null : Math.round(Number(i.overall)), answers: Number(i.answers ?? 0), endedAt: i.endedAt, verdict: i.verdict }));
  const submissions: SubmissionIn[] = raw.submissions.map((s) => ({ ...s, difficulty: PROBLEM_BY_SLUG[s.slug]?.difficulty ?? null }));
  const progress = computeProgress({ interviews, submissions, tasks: raw.tasks, now: new Date() });
  const ctx = { interviews, submissions, tasks: raw.tasks, progress };
  const achievements = computeAchievements(ctx).filter((a) => a.earnedAt).sort((a, b) => b.earnedAt!.localeCompare(a.earnedAt!));
  const bests = computeBests(ctx);
  const solvedByDiff = ["easy", "medium", "hard"].map((d) => ({ d, n: new Set(submissions.filter((s) => s.status === "accepted" && s.difficulty === d).map((s) => s.slug)).size }));
  const byKind = Object.entries(interviews.reduce<Record<string, number>>((m, i) => ({ ...m, [i.kind]: (m[i.kind] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const bestVerdict = ["strong_hire", "hire", "lean_hire", "lean_no", "no_hire"].find((v) => interviews.some((i) => i.verdict === v));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between"><Logo href="/" /><Link href="/signup" className={buttonClasses("secondary", "sm")}>Practise free</Link></header>

      <Card className="flex flex-wrap items-center gap-5" data-testid="public-rank">
        <Emblem rank={progress.rank} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{raw.name} <span className="text-base font-normal text-muted">@{raw.handle}</span></h1>
          <p className="text-sm text-muted">{raw.role ? `Preparing for ${ROLES[raw.role as keyof typeof ROLES] ?? raw.role}` : "Preparing for SDE interviews"} · practising since {new Date(raw.since).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
          <p className="mt-2 text-lg font-semibold" style={{ color: TIER_COLOR[progress.rank.tier.id] }}>{progress.rank.label}</p>
          <p className="text-sm text-muted">Level {progress.level} · {progress.xp.toLocaleString("en-IN")} XP · <Flame className="inline size-3.5 text-warning" aria-hidden /> {progress.streak.current}-day streak (best {progress.streak.longest})</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="flex items-center gap-1.5 text-xs text-muted"><Code2 className="size-3.5" aria-hidden />Problems solved</p><p className="mt-1 text-2xl font-semibold tabular-nums">{bests.solved}</p><p className="text-xs text-muted">{solvedByDiff.map((x) => `${x.n} ${x.d}`).join(" · ")}</p></Card>
        <Card><p className="flex items-center gap-1.5 text-xs text-muted"><Mic className="size-3.5" aria-hidden />Mock interviews</p><p className="mt-1 text-2xl font-semibold tabular-nums">{interviews.length}</p><p className="truncate text-xs text-muted">{byKind.slice(0, 3).map(([k, n]) => `${n} ${KINDS[k as KindId]?.name.toLowerCase() ?? k}`).join(" · ") || "—"}</p></Card>
        <Card><p className="flex items-center gap-1.5 text-xs text-muted"><Trophy className="size-3.5" aria-hidden />Achievements</p><p className="mt-1 text-2xl font-semibold tabular-nums">{achievements.length}</p>{raw.showScores && bestVerdict && <p className="text-xs text-muted">Best mock verdict: {VERDICT[bestVerdict]}</p>}</Card>
      </div>

      {achievements.length > 0 && (
        <Card>
          <h2 className="font-medium">Achievements</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{achievements.map((a) => <li key={a.id}><Badge tone="primary" title={a.desc}>{a.name}</Badge></li>)}</ul>
        </Card>
      )}

      {raw.showScores && bests.bestScoreByKind.length > 0 && (
        <Card>
          <h2 className="font-medium">Best scores by round</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {bests.bestScoreByKind.map((b) => <div key={b.kind} className="flex justify-between gap-3 text-sm"><dt className="text-muted">{KINDS[b.kind as KindId]?.name ?? b.kind}</dt><dd className="font-mono tabular-nums">{b.overall}/100</dd></div>)}
          </dl>
        </Card>
      )}

      <p className="text-xs text-muted">Stats are computed by Interview OS from practice activity recorded on the platform (judge results and AI-evaluated mock interviews). Mock verdicts are practice signals, not hiring decisions. This page is public because its owner turned it on; it isn&apos;t listed in search engines.</p>
    </div>
  );
}
