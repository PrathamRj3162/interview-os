"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScanSearch, Trash2 } from "lucide-react";
import { addProject, analyseProject, deleteProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function AddProjectForm() {
  const [state, action, pending] = useActionState(addProject, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Project title" htmlFor="title"><Input id="title" name="title" required minLength={2} maxLength={200} /></Field>
      <Field label="Public GitHub URL (optional)" htmlFor="repo_url"><Input id="repo_url" name="repo_url" placeholder="https://github.com/you/project" maxLength={300} /></Field>
      <div className="sm:col-span-2"><Field label="What it does (your words)" htmlFor="description"><Textarea id="description" name="description" rows={2} maxLength={2000} /></Field></div>
      <Field label="Technologies (comma-separated)" htmlFor="technologies"><Input id="technologies" name="technologies" maxLength={500} placeholder="Next.js, PostgreSQL, Redis" /></Field>
      <div className="flex items-end gap-3"><Button type="submit" size="sm" disabled={pending}>Add project</Button>{state?.message && <span role="status" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>{state.message}</span>}</div>
    </form>
  );
}

export function AnalyseButton({ id, hasRepo }: { id: string; hasRepo: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!hasRepo) return <span className="text-xs text-muted">Add a GitHub URL to analyse the code.</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await analyseProject(id); setMsg(r.message); if (r.ok) router.refresh(); })}>
        <ScanSearch className="size-4" aria-hidden />{pending ? "Reading the repo…" : "Analyse repository"}
      </Button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </span>
  );
}

export function DeleteProjectButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  return confirm ? (
    <span className="flex items-center gap-2 text-xs"><span>Delete?</span><Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { await deleteProject(id); router.refresh(); })}>Yes</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>No</Button></span>
  ) : <button type="button" onClick={() => setConfirm(true)} className="rounded p-1 text-muted hover:text-danger" aria-label="Delete project"><Trash2 className="size-4" /></button>;
}
