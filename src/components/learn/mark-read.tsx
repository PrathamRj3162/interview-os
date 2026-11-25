"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { markProgress } from "@/app/actions/learn";
import { Button } from "@/components/ui/button";

export function MarkReadButton({ itemType, slug, topic, done }: { itemType: "lesson" | "hld" | "lld"; slug: string; topic?: string; done: boolean }) {
  const [isDone, setDone] = useState(done);
  const [pending, start] = useTransition();
  return (
    <Button variant={isDone ? "secondary" : "primary"} size="sm" disabled={pending} aria-pressed={isDone}
      onClick={() => start(async () => { const next = !isDone; setDone(next); const r = await markProgress({ itemType, slug, topic, done: next }); if (!r.ok) setDone(!next); })}>
      {isDone ? <CheckCircle2 className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
      {isDone ? "Marked as studied" : "Mark as studied"}
    </Button>
  );
}
