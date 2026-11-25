import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { AIUnavailableError } from "@/lib/ai";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";
import { nextInterviewerTurn, practiceHint } from "@/lib/interview/engine";
import { loadInterview, loadTurns, loadCandidateContext, minutesLeft } from "@/lib/interview/server";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("answer"), content: z.string().trim().min(1).max(6000), code: z.string().max(20000).nullish() }),
  z.object({ action: z.literal("hint") }),
]);

/** One interviewer turn. Candidate input is persisted before the AI call, so nothing is lost on provider failure. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;

  const iv = await loadInterview(supabase, id); // RLS: other users' interviews are invisible
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (iv.status !== "in_progress") return NextResponse.json({ error: "This interview has ended." }, { status: 409 });

  let turns = await loadTurns(supabase, id);

  if (body.action === "start" && turns.length > 0) {
    return NextResponse.json({ turns }); // idempotent: page reload doesn't re-open the interview
  }
  if (body.action === "hint" && iv.mode !== "practice") {
    return NextResponse.json({ error: "Hints are only available in practice mode." }, { status: 403 });
  }

  if (body.action === "answer") {
    const last = turns[turns.length - 1];
    // Duplicate-submit guard (double click / retry after network blip)
    if (last?.role === "candidate" && last.content === body.content) {
      // fall through to generate the interviewer reply that was never produced
    } else {
      const ins = await supabase.from("interview_turns")
        .insert({ interview_id: id, user_id: user.id, role: "candidate", content: body.content, code: body.code ?? null })
        .select("id, role, content, code, created_at").single();
      if (ins.error) return NextResponse.json({ error: "Could not save your answer." }, { status: 500 });
      turns = [...turns, ins.data];
    }
  }

  try {
    await assertQuota(supabase, user.id);
    let content: string;
    let shouldEnd = false;
    let provider: string, model: string;
    if (body.action === "hint") {
      const r = await practiceHint(iv, turns);
      content = `[Hint] ${r.data.hint}`;
      ({ provider, model } = r);
    } else {
      const ctx = await loadCandidateContext(supabase, user.id, iv.resume_id);
      const r = await nextInterviewerTurn(iv, ctx, turns, minutesLeft(iv.started_at, iv.duration_min));
      content = r.data.say;
      shouldEnd = r.data.should_end;
      ({ provider, model } = r);
    }
    await recordUsage(supabase, user.id, body.action === "hint" ? "interview_hint" : "interview_turn", provider, model);
    const ins = await supabase.from("interview_turns")
      .insert({ interview_id: id, user_id: user.id, role: "interviewer", content })
      .select("id, role, content, code, created_at").single();
    if (ins.error) return NextResponse.json({ error: "Could not save the interviewer's reply." }, { status: 500 });
    return NextResponse.json({ turns: [...turns, ins.data], shouldEnd, minutesLeft: minutesLeft(iv.started_at, iv.duration_min) });
  } catch (e) {
    const msg = e instanceof QuotaExceededError || e instanceof AIUnavailableError
      ? e.message
      : "The interviewer couldn't respond (the AI provider returned an unusable reply). Your answer is saved — press Retry.";
    if (!(e instanceof QuotaExceededError)) console.error("[interview-turn]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: msg, turns, retryable: !(e instanceof QuotaExceededError) }, { status: 503 });
  }
}
