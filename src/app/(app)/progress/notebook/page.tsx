import type { Metadata } from "next";
import Link from "next/link";
import { XCircle, Repeat2, BookX } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { KINDS, type KindId } from "@/lib/interview/config";
import { PROBLEM_BY_SLUG } from "@/lib/dsa/bank";

export const metadata: Metadata = { title: "Mistake notebook" };

type Row = { id: string; kind: string; ended_at: string | null; started_at: string; mistakes: unknown; missed: unknown };
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const STATUS: Record<string, string> = { wrong_answer: "Wrong answer", runtime_error: "Runtime error", compile_error: "Compile error", time_limit: "Too slow / time limit", error: "Error" };

/**
 * Everything your reports flagged, in one place: concepts you missed (counted across interviews),
 * every important mistake with a link to its report, and problems you attempted but haven't solved yet.
 */
export default async function NotebookPage() {
  const { supabase } = await requireUser();
  const [ivs, subs] = await Promise.all([
    supabase.from("mock_interviews")
      .select("id, kind, ended_at, started_at, mistakes:report->mistakes, missed:report->missed_concepts")
      .eq("status", "completed").order("started_at", { ascending: false }).limit(200),
    supabase.from("submissions").select("problem_slug, status, passed, total, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  const rows = (ivs.data ?? []) as Row[];

  const concepts = new Map<string, { label: string; count: number; last: string; id: string }>();
  for (const r of rows) for (const c of strs(r.missed)) {
    const key = c.trim().toLowerCase();
    const cur = concepts.get(key);
    if (cur) cur.count++; else concepts.set(key, { label: c.trim(), count: 1, last: r.ended_at ?? r.started_at, id: r.id });
  }
  const topConcepts = [...concepts.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, 24);
  const mistakes = rows.flatMap((r) => strs(r.mistakes).map((m) => ({ m, r }))).slice(0, 60);

  const accepted = new Set((subs.data ?? []).filter((s) => s.status === "accepted").map((s) => s.problem_slug));
  const unsolved = new Map<string, { slug: string; status: string; passed: number; total: number; at: string; tries: number }>();
  for (const s of subs.data ?? []) {
    if (accepted.has(s.problem_slug)) continue;
    const cur = unsolved.get(s.problem_slug);
    if (cur) cur.tries++; else unsolved.set(s.problem_slug, { slug: s.problem_slug, status: s.status, passed: s.passed, total: s.total, at: s.created_at, tries: 1 });
  }

  const nothing = !topConcepts.length && !mistakes.length && !unsolved.size;
  return (
    <div className="space-y-8">
      <div>
        <Link href="/progress" className="text-sm text-muted hover:text-text">← Progress</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Mistake notebook</h1>
        <p className="text-sm text-muted">What your reports and the judge flagged, collected so you can revise it in one place.</p>
      </div>

      {nothing && <Card className="text-sm text-muted">Nothing here yet. Mistakes from your interview reports and unsolved problems will collect here.</Card>}

      {unsolved.size > 0 && (
        <section aria-labelledby="unsolved-h">
          <h2 id="unsolved-h" className="mb-3 flex items-center gap-2 text-lg font-medium"><Repeat2 className="size-4 text-warning" aria-hidden />Attempted, not solved yet</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[...unsolved.values()].map((u) => (
              <li key={u.slug}>
                <Card className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{PROBLEM_BY_SLUG[u.slug]?.title ?? u.slug}</p>
                    <p className="text-xs text-muted">Last: {STATUS[u.status] ?? u.status} · {u.passed}/{u.total} tests · {u.tries} submission{u.tries === 1 ? "" : "s"}</p>
                  </div>
                  <Link href={`/interview/new?kind=dsa&problem=${u.slug}`} className={buttonClasses("secondary", "sm")}>Retry</Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {topConcepts.length > 0 && (
        <section aria-labelledby="concepts-h">
          <h2 id="concepts-h" className="mb-3 flex items-center gap-2 text-lg font-medium"><BookX className="size-4 text-accent" aria-hidden />Concepts you missed</h2>
          <Card>
            <ul className="flex flex-wrap gap-2">
              {topConcepts.map((c) => (
                <li key={c.label}><Link href={`/interview/${c.id}/report`} className="inline-flex"><Badge tone={c.count > 1 ? "warning" : "neutral"}>{c.label}{c.count > 1 ? ` ×${c.count}` : ""}</Badge></Link></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Counted across all your reports; ×n means it came up in n interviews.</p>
          </Card>
        </section>
      )}

      {mistakes.length > 0 && (
        <section aria-labelledby="mistakes-h">
          <h2 id="mistakes-h" className="mb-3 flex items-center gap-2 text-lg font-medium"><XCircle className="size-4 text-danger" aria-hidden />Important mistakes</h2>
          <ol className="space-y-2">
            {mistakes.map(({ m, r }, i) => (
              <li key={i}>
                <Card className="p-4 text-sm">
                  <p>{m}</p>
                  <p className="mt-1 text-xs text-muted">
                    <Link href={`/interview/${r.id}/report`} className="underline-offset-2 hover:underline">{KINDS[r.kind as KindId]?.name ?? r.kind} · {new Date(r.ended_at ?? r.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Link>
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
