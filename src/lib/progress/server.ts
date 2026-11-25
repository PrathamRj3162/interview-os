import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROBLEM_BY_SLUG } from "@/lib/dsa/bank";
import { computeProgress, type InterviewIn, type SubmissionIn, type TaskIn } from "./xp";
import { computeAchievements, computeBests } from "./achievements";

/** Everything the progress engine needs, read with the user's own session (RLS applies). */
export async function loadActivity(supabase: SupabaseClient) {
  const [ivs, subs, tasks] = await Promise.all([
    supabase.from("mock_interviews")
      .select("id, kind, difficulty, overall_score, ended_at, started_at, answers:report->communication->>answers, verdict:report->verdict->>level")
      .eq("status", "completed").order("ended_at").limit(2000),
    supabase.from("submissions").select("problem_slug, status, hints_used, created_at, language, solve_seconds").order("created_at").limit(5000),
    supabase.from("study_tasks").select("done_at").not("done_at", "is", null).limit(5000),
  ]);
  const interviews: InterviewIn[] = (ivs.data ?? []).map((r) => ({
    id: r.id, kind: r.kind, difficulty: r.difficulty,
    overall: r.overall_score == null ? null : Math.round(Number(r.overall_score)),
    answers: Number(r.answers ?? 0) || 0,
    endedAt: r.ended_at ?? r.started_at,
    verdict: (r.verdict as string | null) ?? null,
  }));
  const submissions: SubmissionIn[] = (subs.data ?? []).map((s) => ({
    slug: s.problem_slug, difficulty: PROBLEM_BY_SLUG[s.problem_slug]?.difficulty ?? null,
    status: s.status, hintsUsed: s.hints_used ?? 0, createdAt: s.created_at, language: s.language, solveSeconds: s.solve_seconds,
  }));
  const done: TaskIn[] = (tasks.data ?? []).map((t) => ({ doneAt: t.done_at as string }));
  return { interviews, submissions, tasks: done };
}

export async function loadProgress(supabase: SupabaseClient, now = new Date()) {
  const activity = await loadActivity(supabase);
  const progress = computeProgress({ ...activity, now });
  const ctx = { ...activity, progress };
  return { ...activity, progress, achievements: computeAchievements(ctx), bests: computeBests(ctx) };
}
