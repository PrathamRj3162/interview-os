import type { Metadata } from "next";
import Link from "next/link";
import { Mic, Plus } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { KINDS, PERSONAS, type KindId, type PersonaId } from "@/lib/interview/config";
import { getPrefs } from "@/lib/prefs";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: "Mock interviews" };

const statusLabel: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" }> = {
  in_progress: { label: "In progress", tone: "accent" },
  evaluating: { label: "Evaluating", tone: "accent" },
  completed: { label: "Completed", tone: "success" },
  abandoned: { label: "No answers", tone: "neutral" },
  evaluation_failed: { label: "Report failed", tone: "warning" },
};

export default async function InterviewsPage() {
  const { supabase } = await requireUser();
  const { vibe } = await getPrefs();
  const { data: rows } = await supabase
    .from("mock_interviews")
    .select("id, kind, persona, difficulty, mode, status, overall_score, started_at")
    .order("started_at", { ascending: false })
    .limit(50);
  const scored = (rows ?? []).filter((r) => r.status === "completed" && r.overall_score != null).slice(0, 10).reverse();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mock interviews</h1>
          <p className="mt-1 text-muted">Voice or text interviews that adapt to your answers, followed by an evidence-based report.</p>
        </div>
        <Link href="/interview/new" className={buttonClasses("primary")}><Plus className="size-4" aria-hidden /> New interview</Link>
      </div>

      {scored.length >= 2 && (
        <Card>
          <h2 className="font-medium">Score trend</h2>
          <p className="mt-1 text-xs text-muted">Last {scored.length} completed interviews (different rounds use different rubrics).</p>
          <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label={`Scores: ${scored.map((s) => s.overall_score).join(", ")}`}>
            {scored.map((s) => (
              <Link key={s.id} href={`/interview/${s.id}/report`} className="group flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs tabular-nums text-muted group-hover:text-text">{Math.round(Number(s.overall_score))}</span>
                <span className="w-full max-w-10 rounded-t bg-accent/80 group-hover:bg-accent" style={{ height: `${Math.max(4, Number(s.overall_score))}%` }} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {!rows?.length ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Mic className="size-6 text-accent" aria-hidden />
          <p className="font-medium">{copy(vibe, "noInterviews")}</p>
          <p className="max-w-md text-sm text-muted">Start with a resume-based interview — the interviewer will cross-question the claims on your resume.</p>
          <Link href="/interview/new" className={buttonClasses("primary", "sm")}>{copy(vibe, "interviewEmptyCta")}</Link>
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {rows.map((r) => {
            const s = statusLabel[r.status] ?? { label: r.status, tone: "neutral" as const };
            const href = r.status === "completed" ? `/interview/${r.id}/report` : `/interview/${r.id}`;
            return (
              <li key={r.id}>
                <Link href={href} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{KINDS[r.kind as KindId]?.name ?? r.kind}</p>
                    <p className="text-xs text-muted">
                      {PERSONAS[r.persona as PersonaId]?.name ?? r.persona} · {r.difficulty} · {r.mode} ·{" "}
                      {new Date(r.started_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                  {r.overall_score != null && <span className="w-14 text-right font-mono text-sm tabular-nums">{Math.round(Number(r.overall_score))}/100</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
