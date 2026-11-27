"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, XCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { makeDrill, parseEstimate, gradeEstimate, fmtNum, type DrillAnswerKey, type Grade } from "@/lib/learn/estimation";

const ICON: Record<Grade, typeof CheckCircle2> = { good: CheckCircle2, close: CircleDashed, off: XCircle };
const TONE: Record<Grade, string> = { good: "text-success", close: "text-warning", off: "text-danger" };
const WORD: Record<Grade, string> = { good: "Within 25%", close: "Right order of magnitude", off: "Off by more than 3×" };

/** One generated drill at a time; graded in the browser by the same pure functions CI tests. */
export function EstimationTrainer() {
  const [seed, setSeed] = useState(1);
  const drill = useMemo(() => makeDrill(seed), [seed]);
  const [values, setValues] = useState<Partial<Record<DrillAnswerKey, string>>>({});
  const [checked, setChecked] = useState(false);
  const next = () => { setSeed(Math.floor(Math.random() * 1e9) + 1); setValues({}); setChecked(false); };
  const results = drill.questions.map((q) => {
    const v = parseEstimate(values[q.key] ?? "");
    return { ...q, value: v, grade: v == null ? null : gradeEstimate(v, drill.answers[q.key]) };
  });
  const good = results.filter((r) => r.grade === "good").length;
  return (
    <Card className="space-y-4 p-4" data-testid="estimation-trainer">
      <p className="text-sm leading-6" data-testid="drill-story">{drill.story}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((r) => {
          const Icon = r.grade ? ICON[r.grade] : null;
          return (
            <label key={r.key} className="block text-sm">
              <span className="font-medium">{r.label}</span> <span className="text-xs text-muted">({r.unit})</span>
              <Input value={values[r.key] ?? ""} onChange={(e) => { setValues((xs) => ({ ...xs, [r.key]: e.target.value })); setChecked(false); }} placeholder="e.g. 4k or 1.2M" inputMode="decimal" className="mt-1" aria-label={r.label} />
              {checked && (
                <span className="mt-1 block text-xs">
                  {r.grade && Icon ? <span className={`flex items-center gap-1 ${TONE[r.grade]}`}><Icon className="size-3.5" aria-hidden />{WORD[r.grade]} — answer ≈ {fmtNum(drill.answers[r.key])}</span> : <span className="text-danger">Enter a number (4000, 4k, 2.5M).</span>}
                  <span className="mt-0.5 block text-muted">{drill.steps[r.key]}</span>
                </span>
              )}
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setChecked(true)}>Check</Button>
        <Button size="sm" variant="secondary" onClick={next}><RefreshCw className="size-4" aria-hidden />New drill</Button>
        {checked && <span role="status" className="text-sm">{good}/{results.length} within 25%</span>}
      </div>
    </Card>
  );
}
