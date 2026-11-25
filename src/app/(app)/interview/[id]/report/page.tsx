import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, CircleDashed, Target, Dumbbell, Gavel, Timer, Bug, Sparkles, Gauge, Paintbrush, ShieldAlert } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { loadInterview } from "@/lib/interview/server";
import { KINDS, PERSONAS } from "@/lib/interview/config";
import type { DsaReport } from "@/lib/interview/engine";
import { toView, type ViewReport, type ViewCategory } from "@/lib/interview/report-view";
import { fmtClock, type CodeNote, type NoteKind } from "@/lib/interview/metrics";
import type { Level } from "@/lib/interview/verdict";
import { cn } from "@/lib/utils";
import { DIFF_MULT } from "@/lib/progress/xp";

export const metadata: Metadata = { title: "Interview report" };

const LEVEL_TONE: Record<Level, { text: string; ring: string; badge: "danger" | "warning" | "info" | "success" }> = {
  no_hire: { text: "text-danger", ring: "border-danger/40", badge: "danger" },
  lean_no: { text: "text-warning", ring: "border-warning/40", badge: "warning" },
  lean_hire: { text: "text-info", ring: "border-info/40", badge: "info" },
  hire: { text: "text-success", ring: "border-success/40", badge: "success" },
  strong_hire: { text: "text-success", ring: "border-success/60", badge: "success" },
};

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
  const r = toView(iv.report);

  // Compare only with a previous report on the same scale (v1 used 1–5, v2 uses 1–4).
  const { data: previous } = await supabase.from("mock_interviews")
    .select("id, overall_score, started_at, version:report->>version").eq("kind", iv.kind).eq("status", "completed")
    .lt("started_at", iv.started_at).order("started_at", { ascending: false }).limit(1);
  const prev = previous?.[0] as { id: string; overall_score: number | null; version: string | null } | undefined;
  const sameScale = prev && String(prev.version ?? "1") === String(r.version);
  const delta = sameScale && prev?.overall_score != null && r.overall != null ? Math.round(r.overall - Number(prev.overall_score)) : null;
  const xpEarned = r.overall != null && r.communication.answers >= 3 ? Math.round(r.overall * (DIFF_MULT[iv.difficulty] ?? 1)) : 0;
  const again = `/interview/new?kind=${iv.kind}${iv.resume_id ? `&resume=${iv.resume_id}` : ""}${r.dsa ? `&problem=${r.dsa.problem.slug}` : ""}`;

  return (
    <article className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/interview" className="text-sm text-muted hover:text-text">← Interviews</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{KINDS[iv.kind]?.name}{r.dsa ? ` · ${r.dsa.problem.title}` : ""} — report</h1>
          <p className="text-sm text-muted">
            {PERSONAS[iv.persona]?.name} · {iv.difficulty} · {iv.mode} · {new Date(iv.started_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            {xpEarned > 0 && <> · <Link href="/progress" className="text-success underline-offset-2 hover:underline">+{xpEarned} XP</Link></>}
          </p>
        </div>
        <Link href={again} className={buttonClasses("primary", "sm")}>{r.dsa ? "Retry this problem" : "Practise this round again"}</Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <VerdictCard r={r} delta={delta} prevId={prev?.id} kindName={KINDS[iv.kind]?.name ?? ""} />
        <Card className="lg:col-span-2">
          <h2 className="font-medium">Summary</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6">{r.summary}</p>
          {r.verdict && (
            <details className="mt-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium"><Gavel className="mr-1.5 inline size-4 text-muted" aria-hidden />How the verdict was decided</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">{r.verdict.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <p className="mt-2 text-xs text-muted">Fixed rules, the same for everyone: weighted mean of the rubric (core categories count double) → ≥3.5 Strong Hire · ≥3.0 Hire · ≥2.5 Lean Hire · ≥2.0 Lean No · below that No Hire; caps can only lower it.</p>
            </details>
          )}
        </Card>
      </section>

      {(r.oneThing || r.drills.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {r.oneThing && (
            <Card className="border-primary/40">
              <h2 className="flex items-center gap-2 font-medium"><Target className="size-4 text-primary" aria-hidden />The one thing to fix</h2>
              <p className="mt-1 text-xs text-muted">Your lowest-scored area: {r.oneThing.name} ({r.oneThing.score}/4)</p>
              <p className="mt-3 text-sm leading-6">{r.oneThing.fix}</p>
            </Card>
          )}
          {r.drills.length > 0 && (
            <Card>
              <h2 className="flex items-center gap-2 font-medium"><Dumbbell className="size-4 text-accent" aria-hidden />Drills</h2>
              <ol className="mt-3 space-y-3 text-sm">
                {r.drills.map((d, i) => (
                  <li key={i}>
                    <span className="font-medium">{i + 1}. {d.title}</span> <span className="text-xs text-muted">· {d.minutes} min</span>
                    <span className="block text-muted">{d.how}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted">Added to your study plan as dated tasks.</p>
            </Card>
          )}
        </section>
      )}

      {r.metrics && <MetricsStrip r={r} />}

      {r.dsa && <DsaSection d={r.dsa} code={r.code} />}
      {!r.dsa && r.code && (
        <section aria-labelledby="code-h" className="space-y-3">
          <h2 id="code-h" className="text-lg font-medium">Your final code</h2>
          <AnnotatedCode code={r.code} />
        </section>
      )}

      <section aria-labelledby="rubric-h">
        <h2 id="rubric-h" className="mb-3 text-lg font-medium">Rubric</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {r.categories.map((c) => <RubricCard key={c.id} c={c} scale={r.scale} />)}
        </div>
        <p className="mt-3 text-xs text-muted">{r.methodology}{r.evidence_dropped > 0 ? ` ${r.evidence_dropped} quote(s) the evaluator cited couldn't be found in your transcript and were discarded.` : ""}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card><h2 className="mb-3 font-medium">Strengths</h2><List items={r.strengths} icon={CheckCircle2} tone="text-success" /></Card>
        <Card><h2 className="mb-3 font-medium">Weaknesses</h2><List items={r.weaknesses} icon={AlertTriangle} tone="text-warning" /></Card>
        <Card><h2 className="mb-3 font-medium">Important mistakes</h2>{r.mistakes.length ? <List items={r.mistakes} icon={XCircle} tone="text-danger" /> : <p className="text-sm text-muted">None identified.</p>}</Card>
      </section>

      <section className={cn("grid gap-4", r.version === 1 && "lg:grid-cols-2")}>
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
          {r.missed_concepts.length > 0 && (
            <div className="mt-4"><p className="text-xs font-medium text-muted">Missed concepts</p><div className="mt-1.5 flex flex-wrap gap-1.5">{r.missed_concepts.map((c) => <Badge key={c}>{c}</Badge>)}</div></div>
          )}
        </Card>
        {r.version === 1 && (
          <Card>
            <h2 className="font-medium">Next priorities</h2>
            {r.priorities.length ? (
              <ol className="mt-3 space-y-3 text-sm">
                {r.priorities.map((p, i) => (
                  <li key={i}><span className="font-medium">{i + 1}. {p.topic}</span><span className="block text-muted">{p.why}</span><span className="block">→ {p.action}</span></li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm text-muted">No specific priorities identified.</p>}
          </Card>
        )}
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
                    {q.code && !r.dsa && <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs">{q.code}</pre>}</div>
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

function VerdictCard({ r, delta, prevId, kindName }: { r: ViewReport; delta: number | null; prevId?: string; kindName: string }) {
  const v = r.verdict;
  const tone = v?.level ? LEVEL_TONE[v.level] : null;
  return (
    <Card className={cn("flex flex-col items-center justify-center text-center", tone?.ring)} data-testid="verdict">
      {v ? (
        <>
          <p className="text-xs uppercase tracking-wider text-muted">Mock verdict</p>
          <p className={cn("mt-1 text-3xl font-semibold", tone?.text ?? "text-muted")}>{v.label}</p>
          {v.level && <p className="mt-1 text-sm text-muted"><span className="font-mono text-lg tabular-nums text-text">{r.overall}</span>/100 · rubric {v.mean?.toFixed(2)}/4</p>}
          {!v.level && <p className="mt-2 text-xs text-muted">{v.steps[0]}</p>}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Overall</p>
          {r.overall == null ? <p className="mt-2 text-sm text-muted">Not enough evidence to score</p>
            : <p className="mt-1 text-5xl font-semibold tabular-nums">{r.overall}<span className="text-xl text-muted">/100</span></p>}
        </>
      )}
      {delta !== null && (
        <p className={`mt-2 text-sm ${delta >= 0 ? "text-success" : "text-danger"}`}>
          {delta >= 0 ? "+" : ""}{delta} vs your <Link className="underline" href={`/interview/${prevId}/report`}>previous {kindName.toLowerCase()}</Link>
        </p>
      )}
      {v && <p className="mt-3 text-[11px] leading-4 text-muted">A practice signal from fixed rules — not a hiring decision.</p>}
    </Card>
  );
}

function MetricsStrip({ r }: { r: ViewReport }) {
  const m = r.metrics!;
  const items: [string, string, string?][] = [
    ["Duration", `${m.durationMin} min`],
    ["Your share of the talk", `${m.talkShare}%`, "Your words as a share of all words in the interview."],
    ["Median time to reply", m.medianReplySec == null ? "—" : `${m.medianReplySec} s`, "From the interviewer's message to your reply, including typing or speaking time."],
    ["Questions you asked", String(m.questionsAsked)],
  ];
  if (m.coding) {
    items.push(
      ["First run", m.coding.firstRunMin == null ? "never" : `${m.coding.firstRunMin} min`],
      ["Accepted at", m.coding.acceptedMin == null ? "not accepted" : `${m.coding.acceptedMin} min`],
      ["Runs · submits", `${m.coding.runs} · ${m.coding.submissions}`],
    );
    if (m.coding.runsBeforeAccepted != null) items.push(["Runs before accepted", String(m.coding.runsBeforeAccepted)]);
  }
  return (
    <section aria-labelledby="metrics-h">
      <h2 id="metrics-h" className="mb-3 flex items-center gap-2 text-lg font-medium"><Timer className="size-4 text-muted" aria-hidden />Measured, not judged</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([label, value, hint]) => (
          <Card key={label} className="p-4" title={hint}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>
    </section>
  );
}

function RubricCard({ c, scale }: { c: ViewCategory; scale: 4 | 5 }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex flex-wrap items-center gap-1.5 font-medium">
            {c.name}
            {c.core && <Badge tone="accent">core</Badge>}
            {c.source === "judge" && <Badge tone="info">from the judge</Badge>}
          </h3>
          <p className="text-xs text-muted">{c.desc}</p>
        </div>
        {c.score == null ? <Badge>No evidence</Badge> : <span className="font-mono text-lg tabular-nums">{c.score}<span className="text-sm text-muted">/{scale}</span></span>}
      </div>
      {c.score != null && (
        <div className="mt-3 flex gap-1" aria-hidden>{Array.from({ length: scale }, (_, i) => i + 1).map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= c.score! ? "bg-accent" : "bg-surface-2"}`} />)}</div>
      )}
      {c.anchor && <p className="mt-3 text-sm"><span className="font-medium">{c.score} means:</span> {c.anchor}</p>}
      {c.comment && <p className="mt-2 text-sm text-muted">{c.comment}</p>}
      {c.evidence.length > 0 && (
        <ul className="mt-3 space-y-1">
          {c.evidence.map((q, i) => (
            <li key={i} className="flex gap-2 border-l-2 border-border pl-3 text-xs text-muted">
              {q.at != null && <span className="shrink-0 font-mono not-italic text-accent" title="When you said it">{fmtClock(q.at)}</span>}
              <span className={c.source === "judge" ? "" : "italic"}>{c.source === "judge" ? q.text : <>&ldquo;{q.text}&rdquo;</>}</span>
            </li>
          ))}
        </ul>
      )}
      {c.fix && <p className="mt-3 text-sm"><span className="font-medium text-primary">Next time:</span> {c.fix}</p>}
      {c.anchors && (
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer">What each score means</summary>
          <ol className="mt-1 space-y-0.5">{c.anchors.map((a, i) => <li key={i} className={cn(c.score === i + 1 && "text-text")}><span className="font-mono">{i + 1}</span> — {a}</li>)}</ol>
        </details>
      )}
    </Card>
  );
}

const NOTE_META: Record<NoteKind, { label: string; Icon: typeof Bug; cls: string }> = {
  bug: { label: "Bug", Icon: Bug, cls: "text-danger border-danger/50" },
  edge_case: { label: "Edge case", Icon: ShieldAlert, cls: "text-warning border-warning/50" },
  complexity: { label: "Complexity", Icon: Gauge, cls: "text-info border-info/50" },
  style: { label: "Style", Icon: Paintbrush, cls: "text-muted border-border" },
  good: { label: "Good", Icon: Sparkles, cls: "text-success border-success/50" },
};

/** The candidate's final code with the evaluator's notes under the lines they refer to (each note verified to quote that line). */
function AnnotatedCode({ code }: { code: NonNullable<ViewReport["code"]> }) {
  const byLine = new Map<number, CodeNote>(code.notes.map((n) => [n.line, n]));
  const lines = code.source.replace(/\n+$/, "").split("\n");
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted">
        <span className="font-medium text-text">{code.language}</span>
        {code.notes.length > 0 ? <span>{code.notes.length} note{code.notes.length === 1 ? "" : "s"}</span> : <span>No line notes</span>}
        {code.dropped > 0 && <span>· {code.dropped} note(s) didn&apos;t match your code and were discarded</span>}
      </div>
      <div className="overflow-x-auto">
        <pre className="min-w-max py-3 font-mono text-xs leading-5" data-testid="annotated-code">
          {lines.map((l, i) => {
            const note = byLine.get(i + 1);
            const meta = note ? NOTE_META[note.kind] : null;
            return (
              <div key={i}>
                <div className={cn("flex", note && "bg-surface-2")}>
                  <span className="w-10 shrink-0 select-none pr-3 text-right text-muted">{i + 1}</span>
                  <span className="pr-4">{l || " "}</span>
                </div>
                {note && meta && (
                  <div className={cn("my-1 ml-10 mr-4 flex max-w-[70ch] gap-1.5 whitespace-normal border-l-2 py-0.5 pl-3 font-sans", meta.cls)}>
                    <meta.Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span><span className="font-medium">{meta.label}:</span> <span className="text-text">{note.note}</span></span>
                  </div>
                )}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

const SUB_LABEL: Record<string, string> = { accepted: "Accepted", wrong_answer: "Wrong answer", runtime_error: "Runtime error", compile_error: "Compile error", time_limit: "Too slow / time limit", error: "Error" };

/** Objective coding facts: everything here is measured by the platform, not judged by AI. */
function DsaSection({ d, code }: { d: DsaReport; code?: ViewReport["code"] }) {
  const best = d.submissions.find((s) => s.status === "accepted") ?? d.submissions.reduce<DsaReport["submissions"][number] | null>((b, s) => (!b || s.passed / Math.max(1, s.total) > b.passed / Math.max(1, b.total) ? s : b), null);
  const accepted = best?.status === "accepted";
  return (
    <section aria-labelledby="coding-h" className="space-y-3">
      <h2 id="coding-h" className="text-lg font-medium">Coding — {d.problem.title} <span className="text-sm font-normal capitalize text-muted">({d.problem.difficulty})</span></h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-xs text-muted">Judge result</p><p className={`mt-1 font-semibold ${accepted ? "text-success" : best ? "text-danger" : "text-muted"}`}>{best ? `${SUB_LABEL[best.status] ?? best.status} · ${best.passed}/${best.total}` : "Not submitted"}</p><p className="mt-1 text-xs text-muted">{d.submissions.length} submission{d.submissions.length === 1 ? "" : "s"}</p></Card>
        <Card><p className="text-xs text-muted">Runs on examples</p><p className="mt-1 font-semibold tabular-nums">{d.browserRuns + d.judgeRuns}</p><p className="mt-1 text-xs text-muted">{d.language}</p></Card>
        <Card><p className="text-xs text-muted">Hints used</p><p className="mt-1 font-semibold tabular-nums">{d.hintsUsed}/3</p></Card>
        <Card><p className="text-xs text-muted">Large pastes</p><p className={`mt-1 font-semibold tabular-nums ${d.pastes.length ? "text-warning" : ""}`}>{d.pastes.length}</p>{d.pastes.length > 0 && <p className="mt-1 text-xs text-muted">{d.pastes.map((p) => `${p.chars} chars`).join(", ")} — flagged for honesty; pasting your own code is fine</p>}</Card>
      </div>
      <Card>
        <p className="text-xs text-muted">Phases reached</p>
        <p className="mt-1 text-sm">{d.phasesReached.join(" → ")}</p>
        <p className="mt-4 text-xs text-muted">Optimal approach (revealed after the interview)</p>
        <p className="mt-1 text-sm">{d.optimal.idea} <span className="font-mono text-xs text-muted">time {d.optimal.time} · space {d.optimal.space}</span></p>
        <p className="mt-1 text-xs text-muted">Brute force: {d.brute.idea} ({d.brute.time})</p>
      </Card>
      {code ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Your final code, annotated</h3>
          <AnnotatedCode code={code} />
        </div>
      ) : d.finalCode ? (
        <details className="rounded-[var(--radius-lg)] border border-border bg-surface">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Your final code ({d.language})</summary>
          <pre className="overflow-x-auto border-t border-border p-5 font-mono text-xs leading-5">{d.finalCode}</pre>
        </details>
      ) : null}
      {d.next && d.next.length > 0 && (
        <Card>
          <p className="text-xs text-muted">Practise next (same topics{d.problem.difficulty !== "hard" ? ", a step harder where possible" : ""})</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {d.next.map((n) => (
              <li key={n.slug}><Link href={`/interview/new?kind=dsa&problem=${n.slug}`} className={buttonClasses("secondary", "sm")}>{n.title} <span className="ml-1 text-xs capitalize text-muted">{n.difficulty}</span></Link></li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
