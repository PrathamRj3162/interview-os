import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, CircleDashed } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { loadInterview } from "@/lib/interview/server";
import { KINDS, PERSONAS } from "@/lib/interview/config";
import type { InterviewReport, DsaReport } from "@/lib/interview/engine";

export const metadata: Metadata = { title: "Interview report" };

function List({ items, icon: Icon, tone }: { items: string[]; icon: typeof CheckCircle2; tone: string }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((x, i) => (
        <li key={i} className="flex gap-2 text-sm"><Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden /><span>{x}</span></li>
      ))}
    </ul>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const iv = await loadInterview(supabase, id);
  if (!iv) notFound();
  if (iv.status !== "completed" || !iv.report) redirect(`/interview/${id}`);
  const r = iv.report as InterviewReport;

  const { data: previous } = await supabase.from("mock_interviews")
    .select("id, overall_score, started_at").eq("kind", iv.kind).eq("status", "completed")
    .lt("started_at", iv.started_at).order("started_at", { ascending: false }).limit(1);
  const prev = previous?.[0];
  const delta = prev?.overall_score != null && r.overall != null ? Math.round(r.overall - Number(prev.overall_score)) : null;

  return (
    <article className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/interview" className="text-sm text-muted hover:text-text">← Interviews</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{KINDS[iv.kind]?.name} — report</h1>
          <p className="text-sm text-muted">
            {PERSONAS[iv.persona]?.name} · {iv.difficulty} · {iv.mode} · {new Date(iv.started_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Link href={`/interview/new?kind=${iv.kind}${iv.resume_id ? `&resume=${iv.resume_id}` : ""}`} className={buttonClasses("primary", "sm")}>Practise this round again</Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted">Overall</p>
          {r.overall == null ? (
            <p className="mt-2 text-sm text-muted">Not enough evidence to score</p>
          ) : (
            <p className="mt-1 text-5xl font-semibold tabular-nums">{r.overall}<span className="text-xl text-muted">/100</span></p>
          )}
          {delta !== null && (
            <p className={`mt-2 text-sm ${delta >= 0 ? "text-success" : "text-danger"}`}>
              {delta >= 0 ? "+" : ""}{delta} vs your <Link className="underline" href={`/interview/${prev!.id}/report`}>previous {KINDS[iv.kind]?.name.toLowerCase()}</Link>
            </p>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-medium">Summary</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6">{r.summary}</p>
        </Card>
      </section>

      {r.dsa && <DsaSection d={r.dsa} />}

      <section aria-labelledby="rubric-h">
        <h2 id="rubric-h" className="mb-3 text-lg font-medium">Rubric</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {r.categories.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{c.name}</h3>
                  <p className="text-xs text-muted">{c.desc}</p>
                </div>
                {c.score == null ? <Badge>No evidence</Badge> : <span className="font-mono text-lg tabular-nums">{c.score}<span className="text-sm text-muted">/5</span></span>}
              </div>
              {c.score != null && (
                <div className="mt-3 flex gap-1" aria-hidden>{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= c.score! ? "bg-accent" : "bg-surface-2"}`} />)}</div>
              )}
              {c.comment && <p className="mt-3 text-sm">{c.comment}</p>}
              {c.evidence.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {c.evidence.map((q, i) => <li key={i} className="border-l-2 border-border pl-3 text-xs italic text-muted">&ldquo;{q}&rdquo;</li>)}
                </ul>
              )}
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{r.methodology}{r.evidence_dropped > 0 ? ` ${r.evidence_dropped} quote(s) the evaluator cited couldn't be found in your transcript and were discarded.` : ""}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card><h2 className="mb-3 font-medium">Strengths</h2><List items={r.strengths} icon={CheckCircle2} tone="text-success" /></Card>
        <Card><h2 className="mb-3 font-medium">Weaknesses</h2><List items={r.weaknesses} icon={AlertTriangle} tone="text-warning" /></Card>
        <Card><h2 className="mb-3 font-medium">Important mistakes</h2>{r.mistakes.length ? <List items={r.mistakes} icon={XCircle} tone="text-danger" /> : <p className="text-sm text-muted">None identified.</p>}</Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">Communication</h2>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div><dt className="text-xs text-muted">Answers</dt><dd className="text-xl font-semibold tabular-nums">{r.communication.answers}</dd></div>
            <div><dt className="text-xs text-muted">Avg words / answer</dt><dd className="text-xl font-semibold tabular-nums">{r.communication.avgWordsPerAnswer}</dd></div>
            <div><dt className="text-xs text-muted">Fillers / 100 words</dt><dd className="text-xl font-semibold tabular-nums">{r.communication.fillerPer100Words}</dd></div>
          </dl>
          {r.communication.fillers.length > 0 && <p className="mt-3 text-xs text-muted">Most frequent: {r.communication.fillers.map((f) => `“${f.word}” ×${f.count}`).join(", ")}</p>}
          {r.communication.comment && <p className="mt-3 text-sm">{r.communication.comment}</p>}
          <p className="mt-3 text-xs text-muted">Counts come directly from your transcript. Accent and voice are never assessed.</p>
        </Card>
        <Card>
          <h2 className="font-medium">Next priorities</h2>
          {r.priorities.length ? (
            <ol className="mt-3 space-y-3 text-sm">
              {r.priorities.map((p, i) => (
                <li key={i}><span className="font-medium">{i + 1}. {p.topic}</span><span className="block text-muted">{p.why}</span><span className="block">→ {p.action}</span></li>
              ))}
            </ol>
          ) : <p className="mt-3 text-sm text-muted">No specific priorities identified.</p>}
          {r.priorities.length > 0 && <p className="mt-3 text-xs text-muted">These were added to your study plan.</p>}
          {r.missed_concepts.length > 0 && (
            <div className="mt-4"><p className="text-xs font-medium text-muted">Missed concepts</p><div className="mt-1.5 flex flex-wrap gap-1.5">{r.missed_concepts.map((c) => <Badge key={c}>{c}</Badge>)}</div></div>
          )}
        </Card>
      </section>

      <section aria-labelledby="qa-h">
        <h2 id="qa-h" className="mb-3 text-lg font-medium">Question-by-question feedback</h2>
        <ol className="space-y-3">
          {r.questions.map((q) => (
            <li key={q.index}>
              <details className="rounded-xl border border-border bg-surface p-4">
                <summary className="cursor-pointer list-none">
                  <span className="text-xs font-medium text-muted">Question {q.index + 1}</span>
                  <span className="mt-1 block text-sm font-medium">{q.question}</span>
                </summary>
                <div className="mt-4 space-y-4 text-sm">
                  <div><p className="text-xs font-medium text-muted">Your answer</p><p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-2 p-3">{q.answer}</p>
                    {q.code && <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs">{q.code}</pre>}</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {q.correct.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-success">Correct</p><List items={q.correct} icon={CheckCircle2} tone="text-success" /></div>}
                    {q.incomplete.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-warning">Incomplete</p><List items={q.incomplete} icon={CircleDashed} tone="text-warning" /></div>}
                    {q.incorrect.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-danger">Technically incorrect</p><List items={q.incorrect} icon={XCircle} tone="text-danger" /></div>}
                    {q.missing.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-muted">Missing</p><List items={q.missing} icon={AlertTriangle} tone="text-muted" /></div>}
                  </div>
                  {q.strong_answer && <div><p className="text-xs font-medium text-muted">What a strong answer covers</p><p className="mt-1 whitespace-pre-line">{q.strong_answer}</p></div>}
                  {q.better_structure && <div><p className="text-xs font-medium text-muted">Better structure</p><p className="mt-1 whitespace-pre-line">{q.better_structure}</p></div>}
                  {q.study.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-medium text-muted">Study:</span>{q.study.map((s) => <Badge key={s} tone="accent">{s}</Badge>)}</div>}
                  {q.follow_ups.length > 0 && <div><p className="text-xs font-medium text-muted">Likely follow-ups</p><ul className="mt-1 list-disc space-y-1 pl-5">{q.follow_ups.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>
      <p className="text-xs text-muted">Evaluated by {r.provider} · {r.model}. AI feedback can be wrong — verify technical points against official documentation.</p>
    </article>
  );
}

const SUB_LABEL: Record<string, string> = { accepted: "Accepted", wrong_answer: "Wrong answer", runtime_error: "Runtime error", compile_error: "Compile error", time_limit: "Time limit", error: "Error" };

/** Objective coding facts: everything here is measured by the platform, not judged by AI. */
function DsaSection({ d }: { d: DsaReport }) {
  const best = d.submissions.reduce<DsaReport["submissions"][number] | null>((b, s) => (!b || s.passed / Math.max(1, s.total) > b.passed / Math.max(1, b.total) ? s : b), null);
  const accepted = d.submissions.some((s) => s.status === "accepted");
  return (
    <section aria-labelledby="coding-h" className="space-y-3">
      <h2 id="coding-h" className="text-lg font-medium">Coding — {d.problem.title} <span className="text-sm font-normal capitalize text-muted">({d.problem.difficulty})</span></h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-xs text-muted">Judge result</p><p className={`mt-1 font-semibold ${accepted ? "text-success" : best ? "text-danger" : "text-muted"}`}>{best ? `${SUB_LABEL[best.status] ?? best.status} · ${best.passed}/${best.total}` : "Not submitted"}</p><p className="mt-1 text-xs text-muted">{d.submissions.length} submission{d.submissions.length === 1 ? "" : "s"}</p></Card>
        <Card><p className="text-xs text-muted">Runs on examples</p><p className="mt-1 font-semibold tabular-nums">{d.browserRuns + d.judgeRuns}</p><p className="mt-1 text-xs text-muted">{d.language}</p></Card>
        <Card><p className="text-xs text-muted">Hints used</p><p className="mt-1 font-semibold tabular-nums">{d.hintsUsed}/3</p></Card>
        <Card><p className="text-xs text-muted">Large pastes</p><p className={`mt-1 font-semibold tabular-nums ${d.pastes.length ? "text-warning" : ""}`}>{d.pastes.length}</p>{d.pastes.length > 0 && <p className="mt-1 text-xs text-muted">{d.pastes.map((p) => `${p.chars} chars`).join(", ")}</p>}</Card>
      </div>
      <Card>
        <p className="text-xs text-muted">Phases reached</p>
        <p className="mt-1 text-sm">{d.phasesReached.join(" → ")}</p>
        <p className="mt-4 text-xs text-muted">Optimal approach (revealed after the interview)</p>
        <p className="mt-1 text-sm">{d.optimal.idea} <span className="font-mono text-xs text-muted">time {d.optimal.time} · space {d.optimal.space}</span></p>
        <p className="mt-1 text-xs text-muted">Brute force: {d.brute.idea} ({d.brute.time})</p>
      </Card>
      {d.finalCode && (
        <details className="rounded-[var(--radius-lg)] border border-border bg-surface">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Your final code ({d.language})</summary>
          <pre className="overflow-x-auto border-t border-border p-5 font-mono text-xs leading-5">{d.finalCode}</pre>
        </details>
      )}
    </section>
  );
}
