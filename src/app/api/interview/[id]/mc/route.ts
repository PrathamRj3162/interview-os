import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient, getCurrentUser } from "@/lib/supabase/server";
import { loadInterview } from "@/lib/interview/server";
import { assertJudgeQuota, JudgeQuotaError, logEvent } from "@/lib/dsa/server";
import { advanceMc, mcContextFor, mcTests, type McWorkspace } from "@/lib/mc/server";
import { runProject, normOut } from "@/lib/mc/runner";
import { validateFiles } from "@/lib/mc/types";

export const maxDuration = 60;

const files = z.record(z.string(), z.string());
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("state") }),
  z.object({ action: z.literal("save"), files }),
  z.object({ action: z.literal("run"), files, stdin: z.string().max(20_000) }),
  z.object({ action: z.literal("submit"), files }),
  z.object({ action: z.literal("review") }),
]);

/**
 * Machine coding round: autosave, custom runs, hidden-test submits and moving to the review. The server owns the clock:
 * every call first applies the reveal (snapshot + extension) and the switch to review when they're due.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const iv = await loadInterview(supabase, id);
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  const mc = mcContextFor(iv);
  if (!mc) return NextResponse.json({ error: "This interview has no machine coding problem." }, { status: 400 });
  if (iv.status !== "in_progress") return NextResponse.json({ error: "This interview has ended." }, { status: 409 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;
  const ws = (iv.workspace as McWorkspace | null) ?? null;
  if (!ws) return NextResponse.json({ error: "Workspace missing." }, { status: 500 });

  // The clock step runs BEFORE this request's save, so a due reveal snapshots the files saved before it.
  const progress = await advanceMc(supabase, iv);
  const state = () => ({
    phase: progress.phase, revealed: progress.revealed, plan: progress.plan, elapsedMin: progress.elapsedMin,
    extension: progress.revealed ? mc.problem.extension : null,
  });

  if (body.action === "state") return NextResponse.json(state());

  if (body.action === "review") {
    if (progress.phase === "build") await supabase.from("mock_interviews").update({ phase: "review" }).eq("id", id);
    return NextResponse.json({ ...state(), phase: progress.phase === "build" ? "review" : progress.phase });
  }

  const err = validateFiles(body.files, ws.language);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  // During the review the code is frozen: what the interviewer reviews is what was built.
  if (progress.phase !== "build") return NextResponse.json({ ...state(), error: "The build time is over — the code is frozen for the review." }, { status: 409 });
  await supabase.from("mock_interviews").update({ workspace: { ...ws, files: body.files, savedAt: new Date().toISOString() } }).eq("id", id);
  if (body.action === "save") return NextResponse.json({ ...state(), saved: true });

  try { await assertJudgeQuota(supabase, user.id); }
  catch (e) { if (e instanceof JudgeQuotaError) return NextResponse.json({ ...state(), error: e.message }, { status: 429 }); throw e; }
  await logEvent(supabase, id, user.id, "remote_run", { language: ws.language, kind: body.action });

  if (body.action === "run") {
    const r = await runProject(ws.language, body.files, [body.stdin]);
    if (r.status === "unavailable") return NextResponse.json({ ...state(), error: r.message }, { status: 503 });
    if (r.status === "compile_error") return NextResponse.json({ ...state(), run: { status: "compile_error", output: r.message } });
    const o = r.outputs[0];
    return NextResponse.json({ ...state(), run: { status: o.timedOut ? "timeout" : o.exitCode === 0 ? "ok" : "runtime_error", output: o.stdout.slice(0, 8000), stderr: o.stderr.slice(0, 2000) } });
  }

  // Submit: the statement's sample plus every hidden core test, and the extension tests once they're revealed.
  const tests = mcTests(mc.problem.slug).filter((t) => !t.ext || progress.revealed);
  const cases = [{ name: "sample", input: mc.problem.sample.input, expected: normOut(mc.problem.sample.output), ext: false }, ...tests];
  const r = await runProject(ws.language, body.files, cases.map((c) => c.input));
  if (r.status === "unavailable") return NextResponse.json({ ...state(), error: r.message }, { status: 503 });
  const results = r.status === "compile_error"
    ? cases.map((c) => ({ name: c.name, ext: c.ext, pass: false }))
    : cases.map((c, i) => ({ name: c.name, ext: c.ext, pass: !r.outputs[i].timedOut && normOut(r.outputs[i].stdout) === c.expected }));
  const core = results.filter((x) => !x.ext), ext = results.filter((x) => x.ext);
  const firstFail = results.find((x) => !x.pass);
  const status = r.status === "compile_error" ? "compile_error" : results.every((x) => x.pass) ? "accepted" : "wrong_answer";
  const summary = {
    kind: "machine_coding", status, revealed: progress.revealed,
    core: { passed: core.filter((x) => x.pass).length, total: core.length },
    ext: { passed: ext.filter((x) => x.pass).length, total: ext.length },
    // Hidden tests stay hidden: only the first failing test's name is shown (the sample is shown in full).
    firstFailure: firstFail ? { name: firstFail.name, ...(firstFail.name === "sample" && r.status === "ok" ? { got: r.outputs[0].stdout.slice(0, 1500), expected: cases[0].expected } : {}) } : null,
    compile: r.status === "compile_error" ? r.message.slice(0, 3000) : undefined,
  };
  // Submissions are server-only writes (migration 0005); problem_slug "mc:<slug>" keeps them out of DSA stats and XP.
  await createAdminClient().from("submissions").insert({
    user_id: user.id, interview_id: id, problem_slug: `mc:${mc.problem.slug}`, language: ws.language,
    code: Object.entries(body.files).map(([n, s]) => `// ===== ${n} =====\n${s}`).join("\n").slice(0, 100_000),
    status, passed: results.filter((x) => x.pass).length, total: results.length, runtime_ms: r.status === "ok" ? r.timeMs : null,
    solve_seconds: Math.round(progress.elapsedMin * 60), results: summary,
  });
  return NextResponse.json({ ...state(), submit: summary });
}
