"use client";

import { useActionState, useState, useTransition } from "react";
import { Wand2 } from "lucide-react";
import { generateWeek, addTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";

export function PlanWeekButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => start(async () => setMsg((await generateWeek()).message))} disabled={pending}><Wand2 className="size-4" aria-hidden />{pending ? "Planning…" : "Plan my week"}</Button>
      {msg && <span role="status" className="text-sm text-muted">{msg}</span>}
    </div>
  );
}

export function AddTaskForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addTask, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      <Field label="Task" htmlFor="title"><Input id="title" name="title" required minLength={2} maxLength={300} placeholder="e.g. Revise consistent hashing" /></Field>
      <Field label="Type" htmlFor="kind">
        <Select id="kind" name="kind" defaultValue="lesson">
          {[["dsa", "DSA"], ["lesson", "Study"], ["quiz", "Quiz"], ["system_design", "System design"], ["project", "Project"], ["mock", "Mock interview"], ["revision", "Revision"], ["resume", "Resume"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Date" htmlFor="due_date"><Input id="due_date" name="due_date" type="date" defaultValue={today} required /></Field>
      <Field label="Minutes" htmlFor="minutes"><Input id="minutes" name="minutes" type="number" min={5} max={480} defaultValue={30} className="w-24" /></Field>
      <div className="sm:col-span-4 flex items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>Add task</Button>
        {state?.message && <span role="status" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>{state.message}</span>}
      </div>
    </form>
  );
}
