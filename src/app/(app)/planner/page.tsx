import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { toggleTask, deleteTask } from "@/app/actions/tasks";
import { dayKey } from "@/lib/progress/xp";
import { PlanWeekButton, AddTaskForm } from "@/components/learn/planner-ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Study planner" };

const KIND_LABEL: Record<string, string> = { dsa: "DSA", lesson: "Study", quiz: "Quiz", system_design: "Design", project: "Project", mock: "Mock", revision: "Revision", resume: "Resume" };

export default async function PlannerPage() {
  const { supabase, user } = await requireUser();
  const today = dayKey(new Date());
  const end = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: tasks }, { data: prof }] = await Promise.all([
    supabase.from("study_tasks").select("id, title, reason, link, kind, minutes, due_date, done_at").lt("due_date", end).or(`done_at.is.null,due_date.gte.${today}`).order("due_date").limit(200),
    supabase.from("profiles").select("daily_hours, deadline").eq("id", user.id).maybeSingle(),
  ]);
  const overdue = (tasks ?? []).filter((t) => t.due_date < today && !t.done_at);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${today}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));
  const budget = Math.round(Number(prof?.daily_hours ?? 1) * 60);

  const TaskRow = ({ t }: { t: NonNullable<typeof tasks>[number] }) => (
    <li className="flex items-start gap-2 py-2">
      <form action={toggleTask}>
        <input type="hidden" name="task_id" value={t.id} /><input type="hidden" name="done" value={t.done_at ? "0" : "1"} />
        <button type="submit" aria-label={t.done_at ? "Mark as not done" : "Mark as done"} className="mt-0.5 text-muted hover:text-accent">{t.done_at ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4" />}</button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", t.done_at && "text-muted line-through")}>{t.link ? <Link href={t.link} className="hover:underline">{t.title}</Link> : t.title}</p>
        <p className="text-xs text-muted"><Badge className="mr-1">{KIND_LABEL[t.kind] ?? t.kind}</Badge>{t.minutes} min{t.reason ? ` · ${t.reason}` : ""}</p>
      </div>
      <form action={deleteTask}><input type="hidden" name="task_id" value={t.id} /><button type="submit" aria-label="Delete task" className="mt-0.5 rounded p-0.5 text-muted hover:text-danger"><Trash2 className="size-3.5" /></button></form>
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Study planner</h1>
          <p className="text-sm text-muted">Your next 7 days, sized to your {budget}-minute daily budget{prof?.deadline ? ` and your ${new Date(prof.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} deadline` : ""}. Tasks come from your reports, unsolved problems, weak patterns, quiz accuracy and due cards.</p>
        </div>
        <PlanWeekButton />
      </div>
      {overdue.length > 0 && (
        <Card className="border-warning/40">
          <h2 className="font-medium text-warning">Overdue ({overdue.length})</h2>
          <ul className="divide-y divide-border">{overdue.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((d, i) => {
          const list = (tasks ?? []).filter((t) => t.due_date === d);
          const mins = list.filter((t) => !t.done_at).reduce((s, t) => s + t.minutes, 0);
          return (
            <Card key={d} className={cn("p-4", i === 0 && "border-accent/50")} data-testid={i === 0 ? "planner-today" : undefined}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-medium">{i === 0 ? "Today" : new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}</h2>
                <span className={cn("text-xs tabular-nums", mins > budget ? "text-warning" : "text-muted")}>{mins}/{budget} min</span>
              </div>
              {list.length ? <ul className="divide-y divide-border">{list.map((t) => <TaskRow key={t.id} t={t} />)}</ul> : <p className="mt-2 text-sm text-muted">Nothing planned.</p>}
            </Card>
          );
        })}
      </div>
      <Card><h2 className="mb-3 font-medium">Add your own task</h2><AddTaskForm today={today} /></Card>
    </div>
  );
}
