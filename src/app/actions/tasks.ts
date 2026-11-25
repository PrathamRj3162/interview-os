"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { planWeek } from "@/lib/learn/planner";
import { PATTERNS } from "@/lib/dsa/patterns";
import { PROBLEMS, PROBLEM_BY_SLUG } from "@/lib/dsa/bank";
import { FUNDAMENTALS } from "@/lib/learn/fundamentals";
import { dayKey } from "@/lib/progress/xp";

export async function toggleTask(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("task_id") ?? "");
  const done = fd.get("done") === "1";
  await supabase.from("study_tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/dashboard");
  revalidatePath("/planner");
}


async function activePlanId(supabase: Awaited<ReturnType<typeof getCurrentUser>>["supabase"], userId: string, inputs: object) {
  const { data: plan } = await supabase.from("study_plans").select("id").eq("is_active", true).limit(1).maybeSingle();
  if (plan) return plan.id as string;
  const { data } = await supabase.from("study_plans").insert({ user_id: userId, inputs }).select("id").single();
  return data?.id as string | undefined;
}

/** Plan the next 7 days from measured gaps (see lib/learn/planner.ts). Skips tasks already planned. */
export async function generateWeek(): Promise<{ ok: boolean; added: number; message: string }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, added: 0, message: "Not signed in." };
  const start = dayKey(new Date());
  const end = new Date(Date.parse(`${start}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [prof, reports, subs, quizzes, due, recent, existing] = await Promise.all([
    supabase.from("profiles").select("daily_hours, deadline").eq("id", user.id).maybeSingle(),
    supabase.from("mock_interviews").select("id, kind, one:report->oneThing").eq("status", "completed").order("started_at", { ascending: false }).limit(5),
    supabase.from("submissions").select("problem_slug, status").limit(5000),
    supabase.from("quiz_attempts").select("topic, score, total").limit(1000),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).lte("due_at", `${end}T00:00:00Z`),
    supabase.from("mock_interviews").select("kind").order("started_at", { ascending: false }).limit(10),
    supabase.from("study_tasks").select("title, due_date").gte("due_date", start).lt("due_date", end).is("done_at", null),
  ]);
  const solved = new Set((subs.data ?? []).filter((s) => s.status === "accepted").map((s) => s.problem_slug));
  const unsolved = [...new Set((subs.data ?? []).map((s) => s.problem_slug))].filter((s) => !solved.has(s) && PROBLEM_BY_SLUG[s]).map((s) => ({ slug: s, title: PROBLEM_BY_SLUG[s].title }));
  const tasks = planWeek({
    start, dailyMinutes: Number(prof.data?.daily_hours ?? 1) * 60, deadline: prof.data?.deadline ?? null,
    weakAreas: (reports.data ?? []).flatMap((r) => { const o = r.one as { name?: string; fix?: string } | null; return o?.name ? [{ name: o.name, fix: o.fix ?? "", kind: r.kind, reportId: r.id }] : []; }),
    unsolved,
    patterns: PATTERNS.map((p) => { const ps = PROBLEMS.filter((x) => x.topics.some((t) => p.topics.includes(t))); return { slug: p.slug, title: p.title, total: ps.length, solved: ps.filter((x) => solved.has(x.slug)).length }; }),
    fundamentals: FUNDAMENTALS.map((f) => { const a = (quizzes.data ?? []).filter((q) => q.topic === f.slug); const t = a.reduce((s, q) => s + q.total, 0); return { slug: f.slug, name: f.name, pct: t ? Math.round((a.reduce((s, q) => s + q.score, 0) / t) * 100) : null }; }),
    dueCards: due.count ?? 0,
    recentKinds: (recent.data ?? []).map((r) => r.kind),
    existing: existing.data ?? [],
  });
  if (!tasks.length) return { ok: true, added: 0, message: "Your week is already planned — nothing new to add." };
  const planId = await activePlanId(supabase, user.id, { source: "planner", start });
  if (!planId) return { ok: false, added: 0, message: "Couldn't create a plan." };
  const { error } = await supabase.from("study_tasks").insert(tasks.map((t) => ({ ...t, plan_id: planId, user_id: user.id })));
  revalidatePath("/planner"); revalidatePath("/dashboard");
  return error ? { ok: false, added: 0, message: "Couldn't save the plan." } : { ok: true, added: tasks.length, message: `Planned ${tasks.length} task${tasks.length === 1 ? "" : "s"} for the next 7 days.` };
}

const taskSchema = z.object({
  title: z.string().trim().min(2).max(300),
  kind: z.enum(["dsa", "lesson", "quiz", "system_design", "project", "mock", "revision", "resume"]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutes: z.coerce.number().int().min(5).max(480),
});

export async function addTask(_: unknown, fd: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = taskSchema.safeParse({ title: fd.get("title"), kind: fd.get("kind"), due_date: fd.get("due_date"), minutes: fd.get("minutes") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the task." };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const planId = await activePlanId(supabase, user.id, { source: "manual" });
  if (!planId) return { ok: false, message: "Couldn't create a plan." };
  const { error } = await supabase.from("study_tasks").insert({ ...parsed.data, plan_id: planId, user_id: user.id, reason: "Added by you." });
  revalidatePath("/planner"); revalidatePath("/dashboard");
  return error ? { ok: false, message: "Couldn't add the task." } : { ok: true, message: "Task added." };
}

export async function deleteTask(fd: FormData) {
  const { supabase } = await requireUser();
  const id = String(fd.get("task_id") ?? "");
  if (/^[0-9a-f-]{36}$/.test(id)) await supabase.from("study_tasks").delete().eq("id", id);
  revalidatePath("/planner"); revalidatePath("/dashboard");
}
