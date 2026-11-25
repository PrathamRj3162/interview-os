import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import { AIUnavailableError } from "@/lib/ai";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";
import { streamInterviewerTurn, practiceHint, type DsaPrompt } from "@/lib/interview/engine";
import { loadInterview, loadTurns, loadCandidateContext, minutesLeft } from "@/lib/interview/server";
import { PERSONAS, CHARACTERS, type PersonaId } from "@/lib/interview/config";
import { PHASES, PHASE_GOALS, PHASE_LABELS, nextPhase, codeLinesBeyondStarter, lineDiff, type Phase } from "@/lib/dsa/phases";
import { dsaContextFor, loadEvents, logEvent, saveWorkspace, describeEvents, asPhase, isLang, initialWorkspace, type Workspace } from "@/lib/dsa/server";
import { starterCode } from "@/lib/dsa/harness";
import { LANG_LABELS, type Lang } from "@/lib/dsa/types";

export const maxDuration = 60;

const lang = z.enum(["python", "javascript", "cpp", "java"]).nullish();
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("answer"),
    content: z.string().trim().min(1).max(6000),
    code: z.string().max(50000).nullish(),
    language: lang,
    /** Whiteboard as compact text (system design rounds), see lib/interview/board.ts. */
    board: z.string().max(9000).nullish(),
    /** Characters pasted into the answer box for this answer (paste detection, flagged in the report). */
    pasted: z.number().int().min(0).max(100000).optional(),
  }),
  z.object({ action: z.literal("hint") }),
  /** The room noticed something (DSA round): long silence while coding, a failed run/submit, or a large paste. */
  z.object({
    action: z.literal("nudge"),
    reason: z.enum(["idle", "failed_run", "paste"]),
    detail: z.string().trim().max(300).optional(),
    code: z.string().max(50000).nullish(),
    language: lang,
  }),
]);

const TURN_COLS = "id, role, content, code, board, created_at";
const NUDGE_GAP_MS = 2 * 60_000;
/** Rounds with a whiteboard. */
const BOARD_KINDS = new Set(["hld", "lld"]);

const NUDGE_TEXT = {
  idle: (d?: string) => `The candidate has been silent for a while${d ? ` (${d})` : ""} while coding.`,
  failed_run: (d?: string) => `The candidate's last run or submission failed${d ? `: ${d}` : ""}.`,
  paste: (d?: string) => `The candidate just pasted a large block into the editor${d ? ` (${d})` : ""}.`,
};

/**
 * One interviewer turn, streamed as server-sent events:
 *   event: delta  {text}  — spoken text as it's generated (the room speaks from the first sentence)
 *   event: done   {turns, shouldEnd, phase, minutesLeft, timing}
 *   event: error  {error, retryable, turns}
 * Deterministic replies (DSA opening, pre-written hints, idempotent start) and early errors return JSON.
 * Turns are written only by the server (admin client) after the RLS ownership check, so transcripts can't
 * be edited through the Data API (migration 0009). Independent reads and writes are batched.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t0 = Date.now();
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;

  // Batch 1: the interview (RLS = ownership check), its transcript and its room events.
  const [iv, turnsLoaded, events] = await Promise.all([loadInterview(supabase, id), loadTurns(supabase, id), loadEvents(supabase, id)]);
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (iv.status !== "in_progress") return NextResponse.json({ error: "This interview has ended." }, { status: 409 });
  let turns = turnsLoaded;

  const admin = createAdminClient();
  const writeTurn = (role: "interviewer" | "candidate", content: string, code: string | null = null, board: string | null = null) =>
    admin.from("interview_turns").insert({ interview_id: id, user_id: user.id, role, content, code, board }).select(TURN_COLS).single();
  const dsa = dsaContextFor(iv);

  if (body.action === "start" && turns.length > 0) return NextResponse.json({ turns, phase: iv.phase }); // idempotent on reload
  if (body.action === "hint" && iv.mode !== "practice") return NextResponse.json({ error: "Hints are only available in practice mode." }, { status: 403 });
  if (body.action === "nudge") {
    if (!dsa) return NextResponse.json({ error: "Nudges are only for the coding round." }, { status: 400 });
    if (turns.length === 0) return NextResponse.json({ skipped: true });
    const last = events.filter((e) => e.type === "nudge").at(-1);
    if (last && Date.now() - Date.parse(last.created_at) < NUDGE_GAP_MS) return NextResponse.json({ skipped: true, reason: "One nudge every 2 minutes." }, { status: 429 });
  }

  // DSA opening and hints are deterministic: no AI call, no quota, written in advance.
  if (dsa && body.action === "start") {
    const name = (await loadCandidateContext(supabase, user.id, null)).name?.split(" ")[0];
    const opening = `Hi${name ? ` ${name}` : ""}, I'm ${CHARACTERS[iv.persona as PersonaId]?.first ?? "your interviewer"}${PERSONAS[iv.persona] ? `, your ${PERSONAS[iv.persona].name}` : ""} today. We'll work through one problem: "${dsa.problem.title}". It's on your screen now. Take a minute to read it, then tell me in your own words what it's asking, and ask anything you'd like clarified. Please think out loud as you go — you can run your code against the examples whenever you like.`;
    const ins = await writeTurn("interviewer", opening);
    if (ins.error) return NextResponse.json({ error: "Could not start the interview." }, { status: 500 });
    return NextResponse.json({ turns: [ins.data], phase: "intro" });
  }
  if (dsa && body.action === "hint") {
    const used = events.filter((e) => e.type === "hint").length;
    if (used >= 3) return NextResponse.json({ error: "You've used all 3 hints for this problem. Talk your idea through with the interviewer instead.", turns }, { status: 409 });
    const level = used + 1;
    const [ins] = await Promise.all([writeTurn("interviewer", `[Hint ${level}/3] ${dsa.solution.hints[used]}`), logEvent(supabase, id, user.id, "hint", { level })]);
    if (ins.error) return NextResponse.json({ error: "Could not save the hint." }, { status: 500 });
    return NextResponse.json({ turns: [...turns, ins.data], phase: iv.phase, hintsUsed: level });
  }

  // DSA workspace: remember the code at the previous message to compute what changed.
  let ws: Workspace | null = null;
  let diff = "";
  const code = body.action === "answer" || body.action === "nudge" ? body.code ?? null : null;
  const codeLang = body.action === "answer" || body.action === "nudge" ? body.language : null;
  if (dsa) {
    ws = (iv.workspace as Workspace | null) ?? initialWorkspace(dsa.problem, iv.language);
    if (typeof code === "string") {
      const language: Lang = isLang(codeLang) ? codeLang : ws.language;
      diff = lineDiff(ws.codeAtLastTurn ?? starterCode(dsa.problem, language), code);
      ws = { ...ws, language, code, codeAtLastTurn: code };
    }
  }

  // Batch 2: quota, candidate context and every write the answer needs, in parallel.
  const isDuplicate = body.action === "answer" && turns.at(-1)?.role === "candidate" && turns.at(-1)?.content === body.content;
  const [quotaError, ctx, candIns] = await Promise.all([
    assertQuota(supabase, user.id).then(() => null, (e: unknown) => e as Error),
    body.action === "hint" ? Promise.resolve(null) : loadCandidateContext(supabase, user.id, iv.resume_id, iv.project_id ?? null),
    body.action === "answer" && !isDuplicate ? writeTurn("candidate", body.content, body.code ?? null, BOARD_KINDS.has(iv.kind) ? body.board?.trim() || null : null) : Promise.resolve(null),
    dsa && ws && typeof code === "string" ? saveWorkspace(supabase, id, ws) : Promise.resolve(),
    body.action === "answer" && body.pasted && body.pasted >= 80 ? logEvent(supabase, id, user.id, "paste", { chars: body.pasted, where: "answer", answerChars: body.content.length }) : Promise.resolve(),
    body.action === "nudge" ? logEvent(supabase, id, user.id, "nudge", { reason: body.reason }) : Promise.resolve(),
  ]);
  if (candIns?.error) return NextResponse.json({ error: "Could not save your answer." }, { status: 500 });
  if (candIns?.data) turns = [...turns, candIns.data];
  if (quotaError) {
    const quota = quotaError instanceof QuotaExceededError;
    return NextResponse.json({ error: quota ? quotaError.message : "Could not verify your AI quota.", turns, retryable: !quota }, { status: quota ? 429 : 503 });
  }
  const left = minutesLeft(iv.started_at, iv.duration_min);
  const prepMs = Date.now() - t0;

  // Non-DSA practice hint: a short JSON reply on the live budget.
  if (body.action === "hint") {
    try {
      const r = await practiceHint(iv, turns);
      const [ins] = await Promise.all([writeTurn("interviewer", `[Hint] ${r.data.hint}`), recordUsage(supabase, user.id, "interview_hint", r.provider, r.model)]);
      if (ins.error) return NextResponse.json({ error: "Could not save the hint." }, { status: 500 });
      return NextResponse.json({ turns: [...turns, ins.data] });
    } catch (e) {
      return NextResponse.json({ error: e instanceof AIUnavailableError ? e.message : "The hint couldn't be generated. Try again.", turns, retryable: true }, { status: 503 });
    }
  }

  // DSA phase machine: deterministic signals apply before the model speaks; AI-requested moves after.
  let phase: Phase = asPhase(iv.phase);
  const phaseWrites: PromiseLike<unknown>[] = [];
  const movePhase = (to: Phase, reason: string | null) => {
    if (to === phase) return;
    phaseWrites.push(supabase.from("mock_interviews").update({ phase: to }).eq("id", id), logEvent(supabase, id, user.id, "phase", { from: phase, to, reason }));
    phase = to;
  };
  const signals = (aiAdvance: boolean) => nextPhase({
    current: phase, aiAdvance, codeLines: codeLinesBeyondStarter(ws!.code, starterCode(dsa!.problem, ws!.language)),
    runs: events.filter((e) => ["run", "submit"].includes(e.type)).length,
    accepted: events.some((e) => e.type === "submit" && e.payload?.status === "accepted"),
    minutesLeft: left, candidateTurns: turns.filter((x) => x.role === "candidate").length,
  });
  let prompt: DsaPrompt | undefined;
  if (dsa && ws) {
    const pre = signals(false);
    movePhase(pre.phase, pre.reason);
    const lastInterviewer = [...turns].reverse().find((t) => t.role === "interviewer");
    const recent = events.filter((e) => !lastInterviewer || e.created_at > lastInterviewer.created_at);
    prompt = {
      title: dsa.problem.title, statement: dsa.problem.statement, constraints: dsa.problem.constraints,
      signature: `${dsa.problem.fn}(${dsa.problem.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) -> ${dsa.problem.returns}`,
      brute: `${dsa.solution.brute.idea} (${dsa.solution.brute.time})`,
      optimal: `${dsa.solution.optimal.idea} (time ${dsa.solution.optimal.time}, space ${dsa.solution.optimal.space})`,
      phase: `${phase} (${PHASE_LABELS[phase]})`, phaseGoal: PHASE_GOALS[phase],
      phases: PHASES.map((p) => (p === phase ? `[${PHASE_LABELS[p]}]` : PHASE_LABELS[p])).join(" → "),
      language: LANG_LABELS[ws.language], code: ws.code, diff, facts: describeEvents(recent),
      hintsUsed: events.filter((e) => e.type === "hint").length,
      elapsedShare: 1 - left / iv.duration_min,
    };
  }
  const nudge = body.action === "nudge" ? NUDGE_TEXT[body.reason](body.detail) : undefined;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      let firstAt = 0;
      try {
        const r = await streamInterviewerTurn(iv, ctx!, turns, left, prompt, (text) => { if (!firstAt) firstAt = Date.now(); send("delta", { text }); }, nudge);
        if (dsa && ws && r.data.advance_phase) { const post = signals(true); movePhase(post.phase, post.reason); }
        const [ins] = await Promise.all([
          writeTurn("interviewer", r.data.say),
          recordUsage(supabase, user.id, body.action === "nudge" ? "interview_nudge" : "interview_turn", r.provider, r.model),
          ...phaseWrites,
        ]);
        if (ins.error) { send("error", { error: "Could not save the interviewer's reply.", turns, retryable: true }); return; }
        const timing = { prepMs, firstTokenMs: firstAt ? firstAt - t0 : null, totalMs: Date.now() - t0 };
        console.info(`[turn] ${JSON.stringify(timing)}`);
        send("done", { turns: [...turns, ins.data], shouldEnd: r.data.should_end, phase: dsa ? phase : undefined, minutesLeft: left, timing });
      } catch (e) {
        const msg = e instanceof QuotaExceededError || e instanceof AIUnavailableError
          ? e.message
          : "The interviewer couldn't respond (the AI provider returned an unusable reply). Your answer is saved — press Retry.";
        if (!(e instanceof QuotaExceededError)) console.error("[interview-turn]", e instanceof Error ? e.message : e);
        await Promise.all(phaseWrites).catch(() => {});
        send("error", { error: msg, turns, retryable: !(e instanceof QuotaExceededError) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "Server-Timing": `prep;dur=${prepMs}` } });
}
