"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradePrimer } from "@/app/actions/learn";

type Q = { q: string; options: string[]; order: number[] };

/** Check questions for a primer. Options are shown in a random order but submit their canonical index. */
export function PrimerCheck({ slug, questions }: { slug: string; questions: Q[] }) {
  const [picked, setPicked] = useState<number[]>(() => questions.map(() => -1));
  const [results, setResults] = useState<{ correct: boolean; answer: string; why: string }[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4" data-testid="primer-check">
      {questions.map((q, i) => (
        <fieldset key={i} className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">{i + 1}. {q.q}</legend>
          <div className="mt-2 grid gap-1.5">
            {q.order.map((k) => (
              <label key={k} className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 text-sm has-[:checked]:bg-accent-soft">
                <input type="radio" name={`q${i}`} checked={picked[i] === k} onChange={() => setPicked((xs) => xs.map((x, j) => (j === i ? k : x)))} className="mt-0.5 accent-[var(--accent)]" />
                {q.options[k]}
              </label>
            ))}
          </div>
          {results?.[i] && (
            <p className={`mt-2 flex items-start gap-1.5 text-sm ${results[i].correct ? "text-success" : "text-danger"}`}>
              {results[i].correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
              <span>{results[i].correct ? "Correct." : `Answer: ${results[i].answer}.`} <span className="text-muted">{results[i].why}</span></span>
            </p>
          )}
        </fieldset>
      ))}
      <Button size="sm" disabled={pending || picked.includes(-1)} onClick={() => start(async () => { const r = await gradePrimer({ slug, answers: picked }); if (r.ok) setResults(r.results); })}>Check answers</Button>
      {results && <p role="status" className="text-sm">{results.filter((r) => r.correct).length}/{results.length} correct{results.every((r) => r.correct) ? " — marked as studied." : "."}</p>}
    </div>
  );
}
