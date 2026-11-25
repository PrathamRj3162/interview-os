import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { AIUnavailableError } from "@/lib/ai";
import { recordUsage } from "@/lib/ai/quota";
import { evaluateInterview } from "@/lib/interview/engine";
import { loadInterview, loadTurns } from "@/lib/interview/server";
import { pairTurns } from "@/lib/interview/analysis";
import type { DsaReport } from "@/lib/interview/engine";
import { dsaContextFor, loadEvents, type Workspace } from "@/lib/dsa/server";
import { PHASE_LABELS, type Phase } from "@/lib/dsa/phases";

export const maxDuration = 120;

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Ends the interview and generates the report exactly once.
 * A conditional status update acts as a lock, so double clicks / two tabs can't create two reports.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const iv = await loadInterview(supabase, id);
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (iv.status === "completed") return NextResponse.json({ status: "completed" });
  if (iv.status === "evaluating") return NextResponse.json({ status: "evaluating" }, { status: 202 });
  if (iv.status === "abandoned") return NextResponse.json({ status: "abandoned" });

  const turns = await loadTurns(supabase, id);
  if (pairTurns(turns).length === 0) {
    await supabase.from("mock_interviews").update({ status: "abandoned", ended_at: new Date().toISOString() })
      .eq("id", id).in("status", ["in_progress", "evaluation_failed"]);
    return NextResponse.json({ status: "abandoned", message: "No answers were given, so there's nothing to evaluate." });
  }

  const lock = await supabase.from("mock_interviews")
    .update({ status: "evaluating", ended_at: iv.ended_at ?? new Date().toISOString() })
    .eq("id", id).in("status", ["in_progress", "evaluation_failed"])
    .select("id");
  if (!lock.data?.length) return NextResponse.json({ status: "evaluating" }, { status: 202 });

  try {
    // The report is not blocked by the daily quota: the candidate already invested the time.
    // DSA round: gather objective facts (judge results, hints, pastes) to ground the evaluation.
    let dsaReport: DsaReport | undefined;
    let facts: string | undefined;
    const dsa = dsaContextFor(iv);
    if (dsa) {
      const [events, subs] = await Promise.all([
        loadEvents(supabase, id),
        supabase.from("submissions").select("status, passed, total, language, created_at").eq("interview_id", id).order("created_at"),
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
        pastes: events.filter((e) => e.type === "paste").map((e) => ({ chars: Number(e.payload.chars) || 0 })),
        idleMinutes: Math.round(events.filter((e) => e.type === "idle").reduce((a, e) => a + (Number(e.payload.seconds) || 0), 0) / 60),
        phasesReached: [...new Set(phases)].map((p) => PHASE_LABELS[p as Phase] ?? p),
        optimal: dsa.solution.optimal, brute: dsa.solution.brute,
      };
      const best = dsaReport.submissions.reduce<DsaReport["submissions"][number] | null>((b, s) => (!b || s.passed / Math.max(1, s.total) > b.passed / Math.max(1, b.total) ? s : b), null);
      facts = [
        `Problem: ${dsa.problem.title} (${dsa.problem.difficulty}). Optimal: ${dsa.solution.optimal.idea} — time ${dsa.solution.optimal.time}, space ${dsa.solution.optimal.space}.`,
        `Submissions to the judge: ${dsaReport.submissions.length}${best ? `; best: ${best.status}, ${best.passed}/${best.total} tests` : " (never submitted)"}.`,
        `Sample runs: ${dsaReport.browserRuns + dsaReport.judgeRuns}. Hints used: ${dsaReport.hintsUsed}/3. Large pastes into the editor: ${dsaReport.pastes.length}.`,
        `Phases reached: ${dsaReport.phasesReached.join(" → ")}.`,
        `Final code (${dsaReport.language}):\n${dsaReport.finalCode.slice(0, 6000)}`,
      ].join("\n");
    }
    const report = await evaluateInterview(iv, turns, facts);
    if (dsaReport) report.dsa = dsaReport;
    await recordUsage(supabase, user.id, "interview_report", report.provider, report.model);
    const done = await supabase.from("mock_interviews")
      .update({ status: "completed", report, overall_score: report.overall })
      .eq("id", id).eq("status", "evaluating");
    if (done.error) throw new Error("save failed");

    // Feed the study plan: each priority becomes a dated task with the reason attached.
    if (report.priorities.length) {
      let { data: plan } = await supabase.from("study_plans").select("id").eq("is_active", true).limit(1).maybeSingle();
      if (!plan) {
        plan = (await supabase.from("study_plans").insert({ user_id: user.id, inputs: { source: "interview", interview_id: id } }).select("id").single()).data;
      }
      if (plan) {
        const today = new Date();
        await supabase.from("study_tasks").insert(report.priorities.map((p, i) => ({
          plan_id: plan!.id, user_id: user.id, kind: p.kind,
          due_date: localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)),
          title: `${p.topic}: ${p.action}`.slice(0, 300),
          reason: `From your ${new Date(iv.started_at).toLocaleDateString("en-IN")} mock interview — ${p.why}`.slice(0, 500),
          link: `/interview/${id}/report`, minutes: 30,
        })));
      }
    }
    return NextResponse.json({ status: "completed" });
  } catch (e) {
    console.error("[interview-complete]", e instanceof Error ? e.message : e);
    await supabase.from("mock_interviews").update({ status: "evaluation_failed" }).eq("id", id).eq("status", "evaluating");
    const message = e instanceof AIUnavailableError ? e.message : "Report generation failed. Your transcript is saved — you can retry.";
    return NextResponse.json({ status: "evaluation_failed", error: message }, { status: 503 });
  }
}
