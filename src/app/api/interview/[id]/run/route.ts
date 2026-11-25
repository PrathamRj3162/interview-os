import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { judge0Execute } from "@/lib/dsa/judge0";
import { testsFor } from "@/lib/dsa/tests";
import { buildProgram, encodeStdin, makeNonce } from "@/lib/dsa/harness";
import { grade } from "@/lib/dsa/grade";
import { STRESS_BUDGET_MS } from "@/lib/dsa/stress";
import { assertJudgeQuota, JudgeQuotaError, logEvent, saveWorkspace, summariseOutcome, type Workspace } from "@/lib/dsa/server";
import { codeBody, loadDsaRoute } from "@/lib/dsa/route-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const bodySchema = codeBody.extend({ mode: z.enum(["run", "submit"]) });

/**
 * Run = the statement's sample tests; Submit = samples + hidden tests + timed stress tests (recorded as a submission).
 * Both execute on Judge0 server-side. Python/JavaScript "Run" normally happens in the browser instead.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadDsaRoute(id);
  if ("error" in ctx) return ctx.error;
  const { supabase, user, iv, dsa } = ctx;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { language, code, mode } = parsed.data;

  try {
    await assertJudgeQuota(supabase, user.id);
  } catch (e) {
    if (e instanceof JudgeQuotaError) return NextResponse.json({ error: e.message }, { status: 429 });
    throw e;
  }

  const { problem, tests } = testsFor(dsa.problem.slug)!;
  const cases = mode === "run" ? tests.filter((t) => !t.hidden) : tests;
  const nonce = makeNonce();
  // Log first, so the cooldown also covers concurrent requests from a second tab.
  if (mode === "run") await logEvent(supabase, id, user.id, "remote_run", { language, pending: true });

  const exec = await judge0Execute(language, buildProgram(language, problem, code, nonce), encodeStdin(language, problem, cases.map((c) => c.input)));
  const outcome = grade(problem, cases, exec, nonce, "judge0", { stressBudgetMs: STRESS_BUDGET_MS[language] });
  if (exec.status === "unavailable") return NextResponse.json({ error: outcome.message, outcome }, { status: 503 });

  const summary = summariseOutcome(outcome, mode, language);
  const prev = (iv.workspace as Workspace | null) ?? null;
  await saveWorkspace(supabase, id, { ...(prev ?? {}), language, code } as Workspace);

  if (mode === "submit") {
    const events = await supabase.from("interview_events").select("type").eq("interview_id", id).eq("type", "hint");
    // Submissions feed XP and public stats, so only the server may insert them (migration 0005).
    const ins = await createAdminClient().from("submissions").insert({
      user_id: user.id, interview_id: id, problem_slug: problem.slug, language, code,
      status: outcome.status, passed: outcome.passed, total: outcome.total, runtime_ms: outcome.timeMs,
      hints_used: Math.min(3, events.data?.length ?? 0),
      solve_seconds: Math.round((Date.now() - new Date(iv.started_at).getTime()) / 1000),
      results: summary,
    });
    if (ins.error) console.error("[dsa-submit] save failed", ins.error.code);
    await logEvent(supabase, id, user.id, "submit", summary);
  } else {
    await logEvent(supabase, id, user.id, "run", { ...summary, runner: "judge0" });
  }
  return NextResponse.json({ outcome });
}
