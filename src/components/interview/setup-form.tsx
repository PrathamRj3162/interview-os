"use client";

import { useActionState, useState } from "react";
import { createInterview } from "@/app/actions/interview";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Select } from "@/components/ui/form";
import { PERSONAS, KINDS, DIFFICULTIES, DURATIONS, type KindId } from "@/lib/interview/config";
import { LANGUAGES, COMPANIES } from "@/lib/validation/profile";
import { cn } from "@/lib/utils";

export function SetupForm({ defaults, resumes }: {
  defaults: { kind: KindId; language: string | null; company: string | null; resumeId: string | null };
  resumes: { id: string; file_name: string; analysed: boolean }[];
}) {
  const [state, action, pending] = useActionState(createInterview, null);
  const [kind, setKind] = useState<KindId>(defaults.kind);
  const [persona, setPersona] = useState<string>(KINDS[defaults.kind].defaultPersona);
  const [mode, setMode] = useState<"mock" | "practice">("mock");
  const [input, setInput] = useState<"text" | "voice">("voice");
  const e = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-8">
      <fieldset>
        <legend className="mb-3 font-medium">Round</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(KINDS) as KindId[]).map((k) => (
            <label key={k} className={cn("cursor-pointer rounded-lg border px-4 py-3 text-sm transition", kind === k ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2")}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => { setKind(k); setPersona(KINDS[k].defaultPersona); }} className="sr-only" />
              <span className="font-medium">{KINDS[k].name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-medium">Interviewer</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PERSONAS).map(([id, p]) => (
            <label key={id} className={cn("cursor-pointer rounded-lg border px-4 py-3 text-sm transition", persona === id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2")}>
              <input type="radio" name="persona" value={id} checked={persona === id} onChange={() => setPersona(id)} className="sr-only" />
              <span className="block font-medium">{p.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{p.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Difficulty" htmlFor="difficulty" error={e.difficulty}>
          <Select id="difficulty" name="difficulty" defaultValue="medium">
            {Object.entries(DIFFICULTIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Duration" htmlFor="duration_min" error={e.duration_min}>
          <Select id="duration_min" name="duration_min" defaultValue="20">
            {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
          </Select>
        </Field>
        <Field label="Resume context" htmlFor="resume_id" hint={resumes.length ? "Claims from this resume steer the questions." : "Upload a resume to get resume-aware questions."}>
          <Select id="resume_id" name="resume_id" defaultValue={defaults.resumeId ?? "none"}>
            <option value="none">Don&apos;t use a resume</option>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.file_name}{r.analysed ? "" : " (no AI analysis yet)"}</option>)}
          </Select>
        </Field>
        <Field label="Programming language" htmlFor="language">
          <Select id="language" name="language" defaultValue={defaults.language ?? "none"}>
            <option value="none">Not relevant</option>
            {Object.entries(LANGUAGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Target company" htmlFor="company" hint="Style emulation only — never presented as real questions.">
          <Select id="company" name="company" defaultValue={defaults.company ?? "none"}>
            <option value="none">General</option>
            {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Mode</legend>
          {([["mock", "Mock interview", "Realistic: no hints, no answers revealed."], ["practice", "Practice", "Hints on request; the interviewer may flag misconceptions."]] as const).map(([v, t, d]) => (
            <label key={v} className="mt-2 flex cursor-pointer items-start gap-3 text-sm">
              <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="mt-1 accent-[var(--accent)]" />
              <span><span className="font-medium">{t}</span><span className="block text-muted">{d}</span></span>
            </label>
          ))}
        </fieldset>
        <fieldset className="rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Answer by</legend>
          {([["voice", "Voice", "Speak your answers; questions are read aloud. Uses your browser's speech features."], ["text", "Typing", "Type your answers. Works in every browser."]] as const).map(([v, t, d]) => (
            <label key={v} className="mt-2 flex cursor-pointer items-start gap-3 text-sm">
              <input type="radio" name="input_mode" value={v} checked={input === v} onChange={() => setInput(v)} className="mt-1 accent-[var(--accent)]" />
              <span><span className="font-medium">{t}</span><span className="block text-muted">{d}</span></span>
            </label>
          ))}
        </fieldset>
      </div>

      {state?.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Starting…" : "Start interview"}</Button>
    </form>
  );
}
