"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { gradeDesignDrill, type DrillResult } from "@/app/actions/design-drill";

const LIMIT_S = 15 * 60;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function DesignDrill({ questions }: { questions: { slug: string; q: string }[] }) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const [left, setLeft] = useState(LIMIT_S);
  const [out, setOut] = useState<{ results: DrillResult[]; score: number; total: number; dropped: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submitted = useRef(false);

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    start(async () => {
      const r = await gradeDesignDrill({ items: questions.map((q, i) => ({ slug: q.slug, answer: answers[i] })) });
      if (r.ok && r.results) { setOut({ results: r.results, score: r.score!, total: r.total!, dropped: r.dropped ?? 0 }); setErr(null); }
      else { setErr(r.message ?? "Grading failed."); submitted.current = false; }
    });
  };
  const submitRef = useRef(submit);
  useEffect(() => { submitRef.current = submit; });
  useEffect(() => {
    if (out) return;
    const t = setInterval(() => setLeft((s) => { if (s <= 1) { clearInterval(t); submitRef.current(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [out]);

  if (out) {
    return (
      <div className="space-y-4" data-testid="drill-results">
        <Card className="p-4"><p className="text-lg font-semibold">{out.score}/{out.total} key points covered</p>
          <p className="text-xs text-muted">A point counts only when the evaluator quoted your own words for it; we check every quote.{out.dropped > 0 ? ` ${out.dropped} claim(s) didn't match your answer and were discarded.` : ""} Missed points were added to your revision deck.</p></Card>
        {out.results.map((r, i) => (
          <Card key={r.slug} className="space-y-2 p-4">
            <p className="font-medium">{i + 1}. {r.q}</p>
            <ul className="space-y-1 text-sm">
              {r.covered.map((c) => <li key={c.id} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Covered" /><span>{c.point} <span className="block text-xs italic text-muted">&ldquo;{c.quote}&rdquo;</span></span></li>)}
              {r.missed.map((m) => <li key={m.id} className="flex gap-2"><CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" aria-label="Missed" /><span className="text-muted">{m.point}</span></li>)}
            </ul>
          </Card>
        ))}
        <Button size="sm" onClick={() => location.reload()}>Try another set</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="design-drill">
      <p className={`font-mono text-lg tabular-nums ${left < 120 ? "text-warning" : ""}`} aria-label="Time remaining">{clock(left)}</p>
      {questions.map((q, i) => (
        <Card key={q.slug} className="p-4">
          <label className="block text-sm font-medium" htmlFor={`a${i}`}>{i + 1}. {q.q}</label>
          <Textarea id={`a${i}`} rows={4} value={answers[i]} onChange={(e) => setAnswers((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} className="mt-2" maxLength={3000} />
        </Card>
      ))}
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Button disabled={pending} onClick={submit}>{pending ? "Grading…" : "Submit answers"}</Button>
      <p className="text-xs text-muted">Uses one AI request from your daily limit. Answers auto-submit when time runs out.</p>
    </div>
  );
}
