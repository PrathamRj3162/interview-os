"use client";

import { useActionState, useState, useTransition } from "react";
import { Eye, Trash2, Download } from "lucide-react";
import { reviewCard, addCard, deleteCard, cardsFromReports } from "@/app/actions/learn";
import type { Grade } from "@/lib/learn/sm2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";

type DueCard = { id: string; front: string; back: string; topic: string | null };

const GRADE_BTNS: { g: Grade; label: string; hint: string; variant: "secondary" | "primary" | "danger" }[] = [
  { g: "again", label: "Again", hint: "Didn't know it — see it again in 10 min", variant: "danger" },
  { g: "hard", label: "Hard", hint: "Got it with effort", variant: "secondary" },
  { g: "good", label: "Good", hint: "Knew it", variant: "primary" },
  { g: "easy", label: "Easy", hint: "Instant", variant: "secondary" },
];

/** One-card-at-a-time review: think of the answer, reveal, grade honestly. */
export function ReviewSession({ cards }: { cards: DueCard[] }) {
  const [queue, setQueue] = useState(cards);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [pending, start] = useTransition();
  const card = queue[0];
  if (!card) return <Card className="text-sm" data-testid="review-done">{done ? `Done — ${done} card${done === 1 ? "" : "s"} reviewed. Come back when more are due.` : "Nothing due right now. 🎉"}</Card>;
  const grade = (g: Grade) => start(async () => {
    await reviewCard({ id: card.id, grade: g });
    setDone((d) => d + 1);
    setShown(false);
    setQueue((q) => (g === "again" ? [...q.slice(1), q[0]] : q.slice(1)));
  });
  return (
    <Card className="space-y-4" data-testid="review-card">
      <div className="flex items-center justify-between text-xs text-muted"><span>{card.topic ?? "Card"}</span><span>{queue.length} left</span></div>
      <p className="whitespace-pre-wrap text-lg font-medium">{card.front}</p>
      {shown ? (
        <>
          <p className="whitespace-pre-wrap border-t border-border pt-4 text-sm leading-6">{card.back}</p>
          <div className="flex flex-wrap gap-2">
            {GRADE_BTNS.map((b) => <Button key={b.g} size="sm" variant={b.variant} disabled={pending} onClick={() => grade(b.g)} title={b.hint}>{b.label}</Button>)}
          </div>
        </>
      ) : <Button onClick={() => setShown(true)}><Eye className="size-4" aria-hidden />Show answer</Button>}
    </Card>
  );
}

export function AddCardForm() {
  const [state, action, pending] = useActionState(addCard, null);
  return (
    <form action={action} className="space-y-3">
      <Field label="Front (question)" htmlFor="front"><Input id="front" name="front" required minLength={3} maxLength={2000} /></Field>
      <Field label="Back (answer)" htmlFor="back"><Textarea id="back" name="back" required rows={3} maxLength={5000} /></Field>
      <Field label="Topic (optional)" htmlFor="topic"><Input id="topic" name="topic" maxLength={120} /></Field>
      {state?.message && <p className={state.ok ? "text-sm text-success" : "text-sm text-danger"} role="status">{state.message}</p>}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>Add card</Button>
    </form>
  );
}

export function ImportFromReports() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await cardsFromReports(); setMsg(r.ok ? (r.added ? `Added ${r.added} card${r.added === 1 ? "" : "s"} from your reports.` : "No new missed concepts to add.") : "Couldn't import."); })}>
        <Download className="size-4" aria-hidden />Add missed concepts from my reports
      </Button>
      {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
    </div>
  );
}

export function DeleteCardButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return <span className="text-xs text-muted">Deleted</span>;
  return <button type="button" disabled={pending} onClick={() => start(async () => { const r = await deleteCard(id); if (r.ok) setGone(true); })} className="rounded p-1 text-muted hover:text-danger" aria-label="Delete card"><Trash2 className="size-4" /></button>;
}
