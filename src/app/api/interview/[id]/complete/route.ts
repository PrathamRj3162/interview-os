import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { AIUnavailableError } from "@/lib/ai";
import { recordUsage } from "@/lib/ai/quota";
import { evaluateInterview } from "@/lib/interview/engine";
import { loadInterview, loadTurns } from "@/lib/interview/server";
import { pairTurns } from "@/lib/interview/analysis";

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
    const report = await evaluateInterview(iv, turns);
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
