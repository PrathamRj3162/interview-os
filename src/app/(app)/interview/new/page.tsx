import type { Metadata } from "next";
import Link from "next/link";
import { SetupForm } from "@/components/interview/setup-form";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";
import { KINDS, type KindId } from "@/lib/interview/config";
import { aiStatus } from "@/lib/ai";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "New interview" };

export default async function NewInterviewPage({ searchParams }: { searchParams: Promise<{ kind?: string; resume?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [profile, { data: resumes }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from("resumes").select("id, file_name, is_active, resume_analyses(ai_findings)").order("created_at", { ascending: false }).limit(10),
  ]);
  const list = (resumes ?? []).map((r) => ({ id: r.id, file_name: r.file_name, analysed: (r.resume_analyses ?? []).some((a) => a.ai_findings), active: r.is_active }));
  const kind = (sp.kind && sp.kind in KINDS ? sp.kind : "resume_screen") as KindId;
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
        <SetupForm defaults={{ kind, language: profile?.preferred_language ?? null, company: profile?.target_companies?.[0] ?? null, resumeId }} resumes={list} />
      )}
    </div>
  );
}
