import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProgress } from "@/lib/progress/server";
import { dayKey } from "@/lib/progress/xp";
import { KINDS, type KindId } from "@/lib/interview/config";

export type Notice = { id: string; at: string; title: string; body: string; href: string; tone: "info" | "success" | "warning" };

/**
 * In-app notifications, derived from your own data each time (nothing is pushed or emailed):
 * reports ready, a report that needs a retry, tasks due today, a streak at risk, XP decay, new achievements.
 */
export async function buildNotifications(supabase: SupabaseClient, now = new Date()): Promise<Notice[]> {
  const today = dayKey(now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [prog, recent, due] = await Promise.all([
    loadProgress(supabase, now),
    supabase.from("mock_interviews").select("id, kind, status, ended_at, started_at, verdict:report->verdict->>label").gte("started_at", weekAgo).in("status", ["completed", "evaluation_failed"]).order("started_at", { ascending: false }).limit(10),
    supabase.from("study_tasks").select("id", { count: "exact", head: true }).lte("due_date", today).is("done_at", null),
  ]);
  const out: Notice[] = [];
  for (const r of recent.data ?? []) {
    const name = KINDS[r.kind as KindId]?.name ?? r.kind;
    if (r.status === "completed") out.push({ id: `report-${r.id}`, at: r.ended_at ?? r.started_at, title: `${name} report ready`, body: r.verdict ? `Mock verdict: ${r.verdict}.` : "Your evidence-based report is ready.", href: `/interview/${r.id}/report`, tone: "success" });
    else out.push({ id: `failed-${r.id}`, at: r.ended_at ?? r.started_at, title: `${name} report needs a retry`, body: "The AI provider was busy when the report was generated. Your transcript is saved.", href: `/interview/${r.id}`, tone: "warning" });
  }
  const p = prog.progress;
  const startOfDay = `${today}T00:00:00+05:30`;
  if ((due.count ?? 0) > 0) out.push({ id: `tasks-${today}`, at: startOfDay, title: `${due.count} task${due.count === 1 ? "" : "s"} due`, body: "From your interview reports. Each done task is +10 XP (up to 30 a day).", href: "/dashboard", tone: "info" });
  if (p.streak.current > 0 && !p.streak.activeToday) out.push({ id: `streak-${today}`, at: startOfDay, title: `Keep your ${p.streak.current}-day streak`, body: "Finish a task, solve a problem or complete an interview today.", href: "/progress", tone: "warning" });
  if (p.inactiveDays >= 5) out.push({ id: `decay-${today}`, at: startOfDay, title: p.decay > 0 ? `${p.decay} XP has decayed` : "XP decay starts soon", body: `No activity for ${p.inactiveDays} days. XP drops 1% a day after 7 inactive days (never below your tier).`, href: "/progress", tone: "warning" });
  for (const a of prog.achievements) if (a.earnedAt && a.earnedAt >= new Date(now.getTime() - 14 * 86_400_000).toISOString()) out.push({ id: `ach-${a.id}`, at: a.earnedAt, title: `Achievement: ${a.name}`, body: a.desc, href: "/progress", tone: "success" });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}
