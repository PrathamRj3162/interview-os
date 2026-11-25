import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterviewRow, CandidateContext } from "./engine";
import type { Turn } from "./analysis";

export async function loadInterview(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("mock_interviews")
    .select("id, user_id, kind, difficulty, persona, mode, input_mode, company, language, duration_min, resume_id, status, started_at, ended_at, overall_score, report, problem_slug, phase, workspace")
    .eq("id", id)
    .maybeSingle();
  return data as (InterviewRow & { user_id: string; resume_id: string | null; status: string; input_mode: string; ended_at: string | null; overall_score: number | null; report: unknown; problem_slug: string | null; phase: string | null; workspace: unknown }) | null;
}

export async function loadTurns(supabase: SupabaseClient, id: string): Promise<(Turn & { id: number; created_at: string })[]> {
  const { data } = await supabase.from("interview_turns").select("id, role, content, code, created_at").eq("interview_id", id).order("id");
  return (data ?? []) as (Turn & { id: number; created_at: string })[];
}

/** Shared candidate context: profile + resume claims + projects (the cross-module link). */
export async function loadCandidateContext(supabase: SupabaseClient, userId: string, resumeId: string | null): Promise<CandidateContext> {
  const [{ data: profile }, claimsRes, { data: projects }, analysisRes] = await Promise.all([
    supabase.from("profiles").select("full_name, target_role, experience_level").eq("id", userId).maybeSingle(),
    resumeId ? supabase.from("resume_claims").select("claim, risk, questions").eq("resume_id", resumeId) : Promise.resolve({ data: [] as { claim: string; risk: string | null; questions: { concern?: string } }[] }),
    supabase.from("projects").select("title, description, technologies").eq("user_id", userId).limit(8),
    resumeId ? supabase.from("resume_analyses").select("rule_scores").eq("resume_id", resumeId).order("created_at", { ascending: false }).limit(1) : Promise.resolve({ data: [] as { rule_scores: { stats?: { skillsFound?: string[] } } }[] }),
  ]);
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const claims = ((claimsRes.data ?? []) as { claim: string; risk: string | null; questions: { concern?: string } }[])
    .sort((a, b) => (order[a.risk ?? "low"] ?? 3) - (order[b.risk ?? "low"] ?? 3))
    .map((c) => ({ claim: c.claim, risk: c.risk, concern: c.questions?.concern }));
  const skills = ((analysisRes.data?.[0] as { rule_scores?: { stats?: { skillsFound?: string[] } } } | undefined)?.rule_scores?.stats?.skillsFound) ?? [];
  return {
    name: profile?.full_name ?? null,
    role: profile?.target_role ?? null,
    experience: profile?.experience_level ?? null,
    claims,
    projects: (projects ?? []) as CandidateContext["projects"],
    skills,
  };
}

export function minutesLeft(startedAt: string, durationMin: number, now = Date.now()) {
  return durationMin - (now - new Date(startedAt).getTime()) / 60000;
}
