import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InterviewRoom } from "@/components/interview/room";
import { requireUser } from "@/lib/supabase/server";
import { loadInterview, loadTurns } from "@/lib/interview/server";
import { KINDS, PERSONAS } from "@/lib/interview/config";

export const metadata: Metadata = { title: "Interview" };

export default async function InterviewRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const iv = await loadInterview(supabase, id);
  if (!iv) notFound();
  if (iv.status === "completed") redirect(`/interview/${id}/report`);
  const turns = await loadTurns(supabase, id);
  return (
    <InterviewRoom
      id={id}
      title={KINDS[iv.kind]?.name ?? "Interview"}
      personaName={PERSONAS[iv.persona]?.name ?? "Interviewer"}
      mode={iv.mode}
      inputMode={iv.input_mode === "voice" ? "voice" : "text"}
      coding={KINDS[iv.kind]?.coding ?? false}
      durationMin={iv.duration_min}
      startedAt={iv.started_at}
      initialTurns={turns.map((t) => ({ id: t.id, role: t.role, content: t.content, code: t.code }))}
    />
  );
}
