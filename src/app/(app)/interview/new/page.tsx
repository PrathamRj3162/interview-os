import type { Metadata } from "next";
import { CASE_BY_SLUG } from "@/lib/learn/design";
import Link from "next/link";
import { SetupForm } from "@/components/interview/setup-form";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";
import { KINDS, type KindId } from "@/lib/interview/config";
import { aiStatus } from "@/lib/ai";
import { Card } from "@/components/ui/card";
import { getProblem } from "@/lib/dsa/bank";
import { KINDS as ALL_KINDS, DIFFICULTIES, PERSONAS, type Difficulty, type PersonaId } from "@/lib/interview/config";
import { suggestDifficulty, type PastRound } from "@/lib/interview/suggest";
import { COMPANY_BY_NAME } from "@/lib/interview/companies";

export const metadata: Metadata = { title: "New interview" };

export default async function NewInterviewPage({ searchParams }: { searchParams: Promise<{ kind?: string; resume?: string; problem?: string; difficulty?: string; persona?: string; company?: string; mode?: string; topic?: string; project?: string; case?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [profile, { data: resumes }, { data: past }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from("resumes").select("id, file_name, is_active, resume_analyses(ai_findings)").order("created_at", { ascending: false }).limit(10),
    supabase.from("mock_interviews").select("kind, difficulty, ended_at, started_at, verdict:report->verdict->>level").eq("status", "completed").order("started_at", { ascending: false }).limit(200),
  ]);
  const history: PastRound[] = (past ?? []).map((r) => ({ kind: r.kind, difficulty: r.difficulty, verdict: (r.verdict as string | null) ?? null, endedAt: r.ended_at ?? r.started_at }));
  const suggestions = Object.fromEntries(Object.keys(ALL_KINDS).map((k) => [k, suggestDifficulty(history, k)]));
  const askedDifficulty = sp.difficulty && sp.difficulty in DIFFICULTIES ? (sp.difficulty as Difficulty) : null;
  const askedPersona = sp.persona && sp.persona in PERSONAS ? (sp.persona as PersonaId) : null;
  const list = (resumes ?? []).map((r) => ({ id: r.id, file_name: r.file_name, analysed: (r.resume_analyses ?? []).some((a) => a.ai_findings), active: r.is_active }));
  const kind = (sp.kind && sp.kind in KINDS ? sp.kind : "resume_screen") as KindId;
  // "Practise next" links from a report pre-select the problem and a matching difficulty.
  const problem = kind === "dsa" ? getProblem(sp.problem) : null;
  const resumeId = list.find((r) => r.id === sp.resume)?.id ?? list.find((r) => r.active)?.id ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/interview" className="text-sm text-muted hover:text-text">← Interviews</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Set up a mock interview</h1>
      </div>
      {aiStatus().length === 0 ? (
        <Card className="text-sm text-muted">Mock interviews need an AI provider, and none is configured on this server right now.</Card>
      ) : (
        <SetupForm suggestions={suggestions} defaults={{ kind, mode: sp.mode === "practice" ? "practice" : "mock", topic: sp.topic?.slice(0, 200) ?? null, designCase: sp.case && CASE_BY_SLUG[sp.case] ? sp.case : null, projectId: sp.project && /^[0-9a-f-]{36}$/.test(sp.project) ? sp.project : null, problem: problem?.slug ?? null, persona: askedPersona, ...(askedDifficulty ? { difficulty: askedDifficulty } : problem ? { difficulty: problem.difficulty } : {}), language: profile?.preferred_language ?? null, company: (sp.company && COMPANY_BY_NAME[sp.company] ? sp.company : null) ?? profile?.target_companies?.[0] ?? null, resumeId }} resumes={list} />
      )}
    </div>
  );
}
