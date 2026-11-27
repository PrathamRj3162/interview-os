import { CASE_BY_SLUG } from "@/lib/learn/design";
import { dayKey } from "@/lib/progress/xp";
import { DESIGN_PHASE_LABELS, type DesignPhase } from "@/lib/interview/design-phases";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import { AIUnavailableError } from "@/lib/ai";
import { recordUsage } from "@/lib/ai/quota";
import { evaluateInterview } from "@/lib/interview/engine";
import { loadInterview, loadTurns } from "@/lib/interview/server";
import { pairTurns } from "@/lib/interview/analysis";
import type { DsaReport, EvaluationContext } from "@/lib/interview/engine";
import { computeMetrics } from "@/lib/interview/metrics";
import { dsaContextFor, loadEvents, type Workspace } from "@/lib/dsa/server";
import { PHASE_LABELS, type Phase } from "@/lib/dsa/phases";
import { STRESS } from "@/lib/dsa/stress";
import { PROBLEMS } from "@/lib/dsa/bank";
import type { Problem } from "@/lib/dsa/types";

const DIFF_RANK = { easy: 0, medium: 1, hard: 2 } as const;

/** Two problems to practise next: shared topics, one step harder when possible, not already solved. */
function nextProblems(p: Problem, solved: Set<string>) {
  const target = Math.min(2, DIFF_RANK[p.difficulty] + 1);
  return PROBLEMS
    .filter((q) => q.slug !== p.slug && !solved.has(q.slug))
    .map((q) => ({ q, overlap: q.topics.filter((t) => p.topics.includes(t)).length }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => Math.abs(DIFF_RANK[a.q.difficulty] - target) - Math.abs(DIFF_RANK[b.q.difficulty] - target) || b.overlap - a.overlap || a.q.slug.localeCompare(b.q.slug))
    .slice(0, 2)
    .map(({ q }) => ({ slug: q.slug, title: q.title, difficulty: q.difficulty }));
}

export const maxDuration = 120;


/**
 * Ends the interview and generates the report exactly once.
 * A conditional status update acts as a lock, so double clicks / two tabs can't create two reports.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const wantsStream = (req.headers.get("accept") ?? "").includes("text/event-stream");
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const iv = await loadInterview(supabase, id);
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (iv.status === "completed") return NextResponse.json({ status: "completed" });
  if (iv.status === "evaluating") return NextResponse.json({ status: "evaluating" }, { status: 202 });
  if (iv.status === "abandoned") return NextResponse.json({ status: "abandoned" });

  // Status, report and score are server-only columns (migration 0005): written with the service role,
  // always scoped to this user's own interview (ownership was just checked through RLS above).
  const admin = createAdminClient();
  const own = () => admin.from("mock_interviews");
  const turns = await loadTurns(supabase, id);
  if (pairTurns(turns).length === 0) {
    await own().update({ status: "abandoned", ended_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id).in("status", ["in_progress", "evaluation_failed"]);
    return NextResponse.json({ status: "abandoned", message: "No answers were given, so there's nothing to evaluate." });
  }

  const endedAt = iv.ended_at ?? new Date().toISOString();
  const lock = await own()
    .update({ status: "evaluating", ended_at: endedAt })
    .eq("id", id).eq("user_id", user.id).in("status", ["in_progress", "evaluation_failed"])
    .select("id");
  if (!lock.data?.length) return NextResponse.json({ status: "evaluating" }, { status: 202 });

  // The report is built here; with `Accept: text/event-stream` the room sees real progress stages.
  const build = async (stage: (s: string) => void): Promise<{ code: number; body: Record<string, unknown> }> => {
  try {
    stage("Measuring timings and collecting the facts");
    // The report is not blocked by the daily quota: the candidate already invested the time.
    // DSA round: gather objective facts (judge results, hints, pastes) to ground the evaluation.
    let dsaReport: DsaReport | undefined;
    let facts: string | undefined;
    const pairs = pairTurns(turns);
    const ctx: EvaluationContext = {
      metrics: computeMetrics({ startedAt: iv.started_at, endedAt, turns }),
      hintsUsed: turns.filter((t) => t.role === "interviewer" && t.content.startsWith("[Hint")).length,
    };
    const lastCode = [...pairs].reverse().find((p) => p.code?.trim())?.code;
    if (lastCode) ctx.code = { language: iv.language ?? "code", source: lastCode };
    const dsa = dsaContextFor(iv);
    if (dsa) {
      const [events, subs, solved] = await Promise.all([
        loadEvents(supabase, id),
        supabase.from("submissions").select("status, passed, total, language, created_at").eq("interview_id", id).order("created_at"),
        supabase.from("submissions").select("problem_slug").eq("status", "accepted").limit(1000),
      ]);
      const ws = iv.workspace as Workspace | null;
      const phases = ["intro", ...events.filter((e) => e.type === "phase").map((e) => String(e.payload.to))];
      dsaReport = {
        problem: { slug: dsa.problem.slug, title: dsa.problem.title, difficulty: dsa.problem.difficulty },
        language: ws?.language ?? iv.language ?? "python", finalCode: (ws?.code ?? "").slice(0, 20000),
        submissions: (subs.data ?? []).map((s) => ({ status: s.status, passed: s.passed, total: s.total, language: s.language, at: s.created_at })),
        browserRuns: events.filter((e) => e.type === "run" && e.payload.runner === "browser").length,
        judgeRuns: events.filter((e) => e.type === "run" && e.payload.runner === "judge0").length,
        hintsUsed: events.filter((e) => e.type === "hint").length,
        pastes: events.filter((e) => e.type === "paste" && e.payload.where !== "answer").map((e) => ({ chars: Number(e.payload.chars) || 0 })),
        idleMinutes: Math.round(events.filter((e) => e.type === "idle").reduce((a, e) => a + (Number(e.payload.seconds) || 0), 0) / 60),
        phasesReached: [...new Set(phases)].map((p) => PHASE_LABELS[p as Phase] ?? p),
        optimal: dsa.solution.optimal, brute: dsa.solution.brute,
        next: nextProblems(dsa.problem, new Set((solved.data ?? []).map((s) => s.problem_slug as string))),
      };
      const stressCount = STRESS[dsa.problem.slug] ? 1 : 0;
      const ranked = dsaReport.submissions.map((s) => ({ ...s, ratio: s.passed / Math.max(1, s.total) }));
      const top = ranked.find((s) => s.status === "accepted") ?? ranked.sort((a, b) => b.ratio - a.ratio)[0];
      ctx.coding = {
        best: top ? { status: top.status, passed: top.passed, total: top.total, regularAllPassed: top.passed >= top.total - stressCount } : null,
        examplesPassed: events.some((e) => e.type === "run" && e.payload.status === "accepted"),
      };
      ctx.hintsUsed = dsaReport.hintsUsed;
      ctx.metrics = computeMetrics({ startedAt: iv.started_at, endedAt, turns, events, submissions: subs.data ?? [] });
      if (dsaReport.finalCode.trim()) ctx.code = { language: dsaReport.language, source: dsaReport.finalCode };
      const best = dsaReport.submissions.reduce<DsaReport["submissions"][number] | null>((b, s) => (!b || s.passed / Math.max(1, s.total) > b.passed / Math.max(1, b.total) ? s : b), null);
      facts = [
        `Problem: ${dsa.problem.title} (${dsa.problem.difficulty}). Optimal: ${dsa.solution.optimal.idea} — time ${dsa.solution.optimal.time}, space ${dsa.solution.optimal.space}.`,
        `Submissions to the judge: ${dsaReport.submissions.length}${best ? `; best: ${best.status}, ${best.passed}/${best.total} tests` : " (never submitted)"}.`,
        `Sample runs: ${dsaReport.browserRuns + dsaReport.judgeRuns}. Hints used: ${dsaReport.hintsUsed}/3. Large pastes into the editor: ${dsaReport.pastes.length}.`,
        `Phases reached: ${dsaReport.phasesReached.join(" → ")}.`,
        ctx.metrics.coding ? `Timeline: first run at ${ctx.metrics.coding.firstRunMin ?? "—"} min, first submit at ${ctx.metrics.coding.firstSubmitMin ?? "—"} min, accepted at ${ctx.metrics.coding.acceptedMin ?? "never"} min.` : "",
      ].filter(Boolean).join("\n");
    }
    if (iv.kind === "hld") {
      const phaseEvents = (await loadEvents(supabase, id)).filter((e) => e.type === "phase");
      const c = iv.design_case ? CASE_BY_SLUG[iv.design_case] : undefined;
      const curveball = phaseEvents.map((e) => e.payload.curveball).find((x): x is string => typeof x === "string");
      const reached = [...new Set(["requirements", ...phaseEvents.map((e) => String(e.payload.to))])];
      ctx.design = {
        ...(c ? { case: { slug: c.slug, title: c.title } } : {}),
        checklist: c?.checklist ?? [], ...(curveball ? { curveball } : {}),
        phasesReached: reached.map((p) => DESIGN_PHASE_LABELS[p as DesignPhase] ?? p),
      };
      facts = [
        c ? `Design case: ${c.title} — ${c.prompt}` : "",
        `Phases reached (moved on by the server's timer or by the interviewer): ${ctx.design.phasesReached.join(" → ")}.`,
        curveball ? `Curveball given in the curveball phase: ${curveball}` : "The curveball phase was not reached.",
      ].filter(Boolean).join("\n");
    }
    // Finishing a round on a lab case counts as attempting it (unlocks the case's reference answer).
    if (iv.design_case && (iv.kind === "hld" || iv.kind === "lld")) {
      await supabase.from("user_progress").upsert({ user_id: user.id, item_type: iv.kind, item_slug: iv.design_case, status: "started", updated_at: new Date().toISOString() }, { onConflict: "user_id,item_type,item_slug", ignoreDuplicates: true });
    }
    ctx.facts = facts;
    ctx.onStage = stage;
    stage("Scoring each rubric category against your transcript");
    const report = await evaluateInterview(iv, turns, ctx);
    stage("Checking quotes and computing the verdict");
    // Paste detection in typed answers (any round): flagged for the candidate, never scored.
    const answerPastes = (await loadEvents(supabase, id)).filter((e) => e.type === "paste" && e.payload.where === "answer");
    if (answerPastes.length) report.integrity = { pastedAnswers: answerPastes.length, pastedChars: answerPastes.reduce((s, e) => s + (Number(e.payload.chars) || 0), 0) };
    if (dsaReport) report.dsa = dsaReport;
    await recordUsage(supabase, user.id, "interview_report", report.provider, report.model);
    const done = await own()
      .update({ status: "completed", report, overall_score: report.overall })
      .eq("id", id).eq("user_id", user.id).eq("status", "evaluating");
    if (done.error) throw new Error("save failed");
    stage("Adding your drills to the study plan");

    // Feed the study plan: each priority becomes a dated task with the reason attached.
    if (report.priorities.length) {
      let { data: plan } = await supabase.from("study_plans").select("id").eq("is_active", true).limit(1).maybeSingle();
      if (!plan) {
        plan = (await supabase.from("study_plans").insert({ user_id: user.id, inputs: { source: "interview", interview_id: id } }).select("id").single()).data;
      }
      if (plan) {
        // Due dates are IST calendar days (the server runs in UTC).
        await admin.from("study_tasks").insert(report.priorities.map((p, i) => ({
          source: "report",
          plan_id: plan!.id, user_id: user.id, kind: p.kind,
          due_date: dayKey(new Date(Date.now() + i * 86_400_000)),
          title: `${p.topic}: ${p.action}`.slice(0, 300),
          reason: `From your ${new Date(iv.started_at).toLocaleDateString("en-IN")} mock interview — ${p.why}`.slice(0, 500),
          link: `/interview/${id}/report`, minutes: 30,
        })));
      }
    }
    return { code: 200, body: { status: "completed" } };
  } catch (e) {
    console.error("[interview-complete]", e instanceof Error ? e.message : e);
    await own().update({ status: "evaluation_failed" }).eq("id", id).eq("user_id", user.id).eq("status", "evaluating");
    const message = e instanceof AIUnavailableError ? e.message : "Report generation failed. Your transcript is saved — you can retry.";
    return { code: 503, body: { status: "evaluation_failed", error: message } };
  }
  };

  if (!wantsStream) {
    const r = await build(() => {});
    return NextResponse.json(r.body, { status: r.code });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const r = await build((s) => send("stage", { stage: s }));
      send("done", r.body);
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
