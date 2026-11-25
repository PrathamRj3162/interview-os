import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { AIUnavailableError } from "@/lib/ai";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";
import { nextInterviewerTurn, practiceHint, type DsaPrompt } from "@/lib/interview/engine";
import { loadInterview, loadTurns, loadCandidateContext, minutesLeft } from "@/lib/interview/server";
import { PERSONAS } from "@/lib/interview/config";
import { PHASES, PHASE_GOALS, PHASE_LABELS, nextPhase, codeLinesBeyondStarter, lineDiff } from "@/lib/dsa/phases";
import { dsaContextFor, loadEvents, logEvent, saveWorkspace, describeEvents, asPhase, isLang, initialWorkspace, type Workspace } from "@/lib/dsa/server";
import { starterCode } from "@/lib/dsa/harness";
import { LANG_LABELS } from "@/lib/dsa/types";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("answer"),
    content: z.string().trim().min(1).max(6000),
    code: z.string().max(50000).nullish(),
    language: z.enum(["python", "javascript", "cpp", "java"]).nullish(),
  }),
  z.object({ action: z.literal("hint") }),
]);

const TURN_COLS = "id, role, content, code, created_at";

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

  const dsa = dsaContextFor(iv);
  let turns = await loadTurns(supabase, id);
  const say = async (content: string) =>
    supabase.from("interview_turns").insert({ interview_id: id, user_id: user.id, role: "interviewer", content }).select(TURN_COLS).single();

  if (body.action === "start" && turns.length > 0) {
    return NextResponse.json({ turns, phase: iv.phase }); // idempotent: page reload doesn't re-open the interview
  }
  if (body.action === "hint" && iv.mode !== "practice") {
    return NextResponse.json({ error: "Hints are only available in practice mode." }, { status: 403 });
  }

  // DSA opening and hints are deterministic: no AI call, no quota, and the hints are written in advance.
  if (dsa && body.action === "start") {
    const name = (await loadCandidateContext(supabase, user.id, null)).name?.split(" ")[0];
    const opening = `Hi${name ? ` ${name}` : ""}, I'm your ${PERSONAS[iv.persona]?.name ?? "interviewer"} today. We'll work through one problem: "${dsa.problem.title}". It's on your screen now. Take a minute to read it, then tell me in your own words what it's asking, and ask anything you'd like clarified. Please think out loud as you go — you can run your code against the examples whenever you like.`;
    const ins = await say(opening);
    if (ins.error) return NextResponse.json({ error: "Could not start the interview." }, { status: 500 });
    return NextResponse.json({ turns: [ins.data], phase: "intro" });
  }
  if (dsa && body.action === "hint") {
    const used = (await loadEvents(supabase, id)).filter((e) => e.type === "hint").length;
    if (used >= 3) return NextResponse.json({ error: "You've used all 3 hints for this problem. Talk your idea through with the interviewer instead.", turns }, { status: 409 });
    const level = used + 1;
    const ins = await say(`[Hint ${level}/3] ${dsa.solution.hints[used]}`);
    if (ins.error) return NextResponse.json({ error: "Could not save the hint." }, { status: 500 });
    await logEvent(supabase, id, user.id, "hint", { level });
    return NextResponse.json({ turns: [...turns, ins.data], phase: iv.phase, hintsUsed: level });
  }

  // Workspace bookkeeping for the DSA round: remember the code at the previous message to compute a diff.
  let ws: Workspace | null = null;
  let diff = "";
  if (dsa) {
    ws = (iv.workspace as Workspace | null) ?? initialWorkspace(dsa.problem, iv.language);
    if (body.action === "answer" && typeof body.code === "string") {
      const language = isLang(body.language) ? body.language : ws.language;
      diff = lineDiff(ws.codeAtLastTurn ?? starterCode(dsa.problem, language), body.code);
      ws = { ...ws, language, code: body.code, codeAtLastTurn: body.code };
      await saveWorkspace(supabase, id, ws);
    }
  }

  if (body.action === "answer") {
    const last = turns[turns.length - 1];
    // Duplicate-submit guard (double click / retry after network blip)
    if (last?.role === "candidate" && last.content === body.content) {
      // fall through to generate the interviewer reply that was never produced
    } else {
      const ins = await supabase.from("interview_turns")
        .insert({ interview_id: id, user_id: user.id, role: "candidate", content: body.content, code: body.code ?? null })
        .select(TURN_COLS).single();
      if (ins.error) return NextResponse.json({ error: "Could not save your answer." }, { status: 500 });
      turns = [...turns, ins.data];
    }
  }

  try {
    await assertQuota(supabase, user.id);
    let content: string;
    let shouldEnd = false;
    let provider: string, model: string;
    let phase = asPhase(iv.phase);
    const left = minutesLeft(iv.started_at, iv.duration_min);

    if (body.action === "hint") {
      const r = await practiceHint(iv, turns);
      content = `[Hint] ${r.data.hint}`;
      ({ provider, model } = r);
    } else {
      const ctx = await loadCandidateContext(supabase, user.id, iv.resume_id);
      let prompt: DsaPrompt | undefined;
      let events: Awaited<ReturnType<typeof loadEvents>> = [];
      // Deterministic signals (candidate replied, started coding, time) apply before the model speaks,
      // so its message fits the phase the candidate is actually in.
      const signals = async (aiAdvance: boolean) => {
        const all = await loadEvents(supabase, id);
        return {
          all,
          next: nextPhase({
            current: phase, aiAdvance, codeLines: codeLinesBeyondStarter(ws!.code, starterCode(dsa!.problem, ws!.language)),
            runs: all.filter((e) => ["run", "submit"].includes(e.type)).length,
            accepted: all.some((e) => e.type === "submit" && e.payload?.status === "accepted"),
            minutesLeft: left, candidateTurns: turns.filter((x) => x.role === "candidate").length,
          }),
        };
      };
      const movePhase = async (t: { phase: typeof phase; reason: string | null }) => {
        if (t.phase === phase) return;
        await supabase.from("mock_interviews").update({ phase: t.phase }).eq("id", id);
        await logEvent(supabase, id, user.id, "phase", { from: phase, to: t.phase, reason: t.reason });
        phase = t.phase;
      };
      if (dsa && ws) {
        const pre = await signals(false);
        await movePhase(pre.next);
        const lastInterviewer = [...turns].reverse().find((t) => t.role === "interviewer");
        const all = pre.all;
        events = all.filter((e) => !lastInterviewer || e.created_at > lastInterviewer.created_at);
        const sig = `${dsa.problem.fn}(${dsa.problem.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) -> ${dsa.problem.returns}`;
        prompt = {
          title: dsa.problem.title, statement: dsa.problem.statement, constraints: dsa.problem.constraints, signature: sig,
          brute: `${dsa.solution.brute.idea} (${dsa.solution.brute.time})`,
          optimal: `${dsa.solution.optimal.idea} (time ${dsa.solution.optimal.time}, space ${dsa.solution.optimal.space})`,
          phase: `${phase} (${PHASE_LABELS[phase]})`, phaseGoal: PHASE_GOALS[phase],
          phases: PHASES.map((p) => (p === phase ? `[${PHASE_LABELS[p]}]` : PHASE_LABELS[p])).join(" → "),
          language: LANG_LABELS[ws.language], code: ws.code, diff, facts: describeEvents(events),
          hintsUsed: all.filter((e) => e.type === "hint").length,
          elapsedShare: 1 - left / iv.duration_min,
        };
      }
      const r = await nextInterviewerTurn(iv, ctx, turns, left, prompt);
      content = r.data.say;
      shouldEnd = r.data.should_end;
      ({ provider, model } = r);

      if (dsa && ws && r.data.advance_phase) await movePhase((await signals(true)).next);
    }
    await recordUsage(supabase, user.id, body.action === "hint" ? "interview_hint" : "interview_turn", provider, model);
    const ins = await say(content);
    if (ins.error) return NextResponse.json({ error: "Could not save the interviewer's reply." }, { status: 500 });
    return NextResponse.json({ turns: [...turns, ins.data], shouldEnd, phase: dsa ? phase : undefined, minutesLeft: left });
  } catch (e) {
    const msg = e instanceof QuotaExceededError || e instanceof AIUnavailableError
      ? e.message
      : "The interviewer couldn't respond (the AI provider returned an unusable reply). Your answer is saved — press Retry.";
    if (!(e instanceof QuotaExceededError)) console.error("[interview-turn]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: msg, turns, retryable: !(e instanceof QuotaExceededError) }, { status: 503 });
  }
}
