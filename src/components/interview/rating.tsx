"use client";

import { useState, useTransition } from "react";
import { rateInterview } from "@/app/actions/interview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FACES = [
  { v: 1, e: "😞", l: "Frustrating" }, { v: 2, e: "😕", l: "Meh" }, { v: 3, e: "😐", l: "Okay" },
  { v: 4, e: "🙂", l: "Good" }, { v: 5, e: "🤩", l: "Great" },
];

/** How did this interview feel? One tap to rate; an optional note helps us improve the interviewer. */
export function InterviewRating({ id, initial, initialNote }: { id: string; initial: number | null; initialNote: string | null }) {
  const [rating, setRating] = useState<number | null>(initial);
  const [note, setNote] = useState(initialNote ?? "");
  const [saved, setSaved] = useState<"idle" | "saved" | "error">(initial ? "saved" : "idle");
  const [pending, start] = useTransition();
  const save = (r: number, n = note) => start(async () => {
    setRating(r);
    const res = await rateInterview({ id, rating: r, note: n });
    setSaved(res.ok ? "saved" : "error");
  });
  return (
    <div className="space-y-3" data-testid="rating">
      <p className="text-sm font-medium">How did this interview feel?</p>
      <div role="radiogroup" aria-label="Rate this interview" className="flex flex-wrap gap-2">
        {FACES.map((f) => (
          <button key={f.v} type="button" role="radio" aria-checked={rating === f.v} aria-label={f.l} title={f.l} disabled={pending}
            onClick={() => save(f.v)}
            className={cn("grid size-11 place-items-center rounded-full border text-2xl transition-transform hover:scale-110", rating === f.v ? "border-accent bg-accent-soft" : "border-border")}>
            <span aria-hidden>{f.e}</span>
          </button>
        ))}
      </div>
      {rating != null && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-xs text-muted">
            Anything the interviewer should do differently? (optional)
            <input value={note} onChange={(e) => { setNote(e.target.value.slice(0, 500)); setSaved("idle"); }} maxLength={500} className="mt-1 h-9 w-full rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 text-sm text-text" />
          </label>
          <Button size="sm" variant="secondary" onClick={() => save(rating, note)} disabled={pending}>Save</Button>
        </div>
      )}
      <p className="text-xs text-muted" aria-live="polite">{saved === "saved" ? "Thanks — saved." : saved === "error" ? "Couldn't save. Try again." : ""}</p>
    </div>
  );
}
