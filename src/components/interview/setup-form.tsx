"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createInterview } from "@/app/actions/interview";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Select } from "@/components/ui/form";
import { PERSONAS, KINDS, DIFFICULTIES, DURATIONS, type KindId, type PersonaId, type Difficulty } from "@/lib/interview/config";
import { LANGUAGES, COMPANIES } from "@/lib/validation/profile";
import { cn } from "@/lib/utils";
import { PROBLEMS } from "@/lib/dsa/bank";
import { warmPython } from "@/lib/dsa/browser-runner";

const STEPS = ["Round", "Interviewer", "Details"] as const;
const option = "cursor-pointer rounded-[var(--radius-md)] border px-4 py-3 text-sm transition-colors duration-[var(--duration-fast)] has-[:focus-visible]:shadow-[var(--focus-glow)]";
const on = "border-accent bg-accent-soft";
const off = "border-border bg-surface hover:border-border-strong hover:bg-surface-2";

export function SetupForm({ defaults, resumes }: {
  defaults: { kind: KindId; problem?: string | null; language: string | null; company: string | null; resumeId: string | null; difficulty?: Difficulty };
  resumes: { id: string; file_name: string; analysed: boolean }[];
}) {
  const [state, action, pending] = useActionState(createInterview, null);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<KindId>(defaults.kind);
  const [persona, setPersona] = useState<PersonaId>(KINDS[defaults.kind].defaultPersona);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaults.difficulty ?? "medium");
  const [mode, setMode] = useState<"mock" | "practice">("mock");
  const [input, setInput] = useState<"text" | "voice">("voice");
  const [duration, setDuration] = useState("20");
  const [resumeId, setResumeId] = useState(defaults.resumeId ?? "none");
  const [language, setLanguage] = useState(defaults.language ?? "none");
  const [company, setCompany] = useState(defaults.company ?? "none");
  const [problem, setProblem] = useState(defaults.problem ?? "none");
  const isDsa = kind === "dsa";
  // DSA round in Python: start downloading the in-browser Python runtime now, so the first Run in the room is instant.
  useEffect(() => { if (isDsa && (language === "python" || (language === "none" && defaults.language === "python"))) warmPython(); }, [isDsa, language, defaults.language]);

  return (
    <form action={action} className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm" aria-label="Setup progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
              className={cn("flex items-center gap-2 rounded-full px-3 py-1 transition-colors", step === i ? "bg-accent-soft font-medium text-text" : "text-muted hover:text-text")}
            >
              <span className={cn("grid size-5 place-items-center rounded-full text-[11px] font-semibold", i < step ? "bg-success text-bg" : step === i ? "bg-accent text-accent-fg" : "bg-surface-3")}>
                {i < step ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <span aria-hidden className="h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      {/* All inputs live in one form; hidden steps keep their values. */}
      <fieldset hidden={step !== 0}>
        <legend className="sr-only">Round</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(KINDS) as KindId[]).map((k) => (
            <label key={k} className={cn(option, kind === k ? on : off)}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => { setKind(k); setPersona(KINDS[k].defaultPersona); }} className="sr-only" />
              <span className="font-medium">{KINDS[k].name}</span>
              {KINDS[k].coding && <span className="mt-0.5 block text-xs text-muted">Includes a code editor</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div hidden={step !== 1} className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Interviewer</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
              <label key={id} className={cn(option, persona === id ? on : off)}>
                <input type="radio" name="persona" value={id} checked={persona === id} onChange={() => setPersona(id)} className="sr-only" />
                <span className="block font-medium">{PERSONAS[id].name}{KINDS[kind].defaultPersona === id && <span className="ml-1.5 text-xs font-normal text-accent">suggested</span>}</span>
                <span className="mt-0.5 block text-xs text-muted">{PERSONAS[id].blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Difficulty" htmlFor="difficulty">
            <Select id="difficulty" name="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {Object.entries(DIFFICULTIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Mode</legend>
            <div className="grid grid-cols-2 gap-2">
              {([["mock", "Mock", "No hints"], ["practice", "Practice", "Hints on request"]] as const).map(([v, t, d]) => (
                <label key={v} className={cn(option, "py-2", mode === v ? on : off)}>
                  <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
                  <span className="font-medium">{t}</span><span className="block text-xs text-muted">{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div hidden={step !== 2} className="grid gap-6 lg:grid-cols-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
          <Field label="Duration" htmlFor="duration_min">
            <Select id="duration_min" name="duration_min" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </Select>
          </Field>
          <Field label="Answer by" htmlFor="input_mode">
            <Select id="input_mode" name="input_mode" value={input} onChange={(e) => setInput(e.target.value as "text" | "voice")}>
              <option value="voice">Voice (browser speech)</option>
              <option value="text">Typing</option>
            </Select>
          </Field>
          <Field label="Resume context" htmlFor="resume_id" hint={resumes.length ? "Claims from this resume steer the questions." : "Upload a resume for resume-aware questions."}>
            <Select id="resume_id" name="resume_id" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
              <option value="none">Don&apos;t use a resume</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.file_name}{r.analysed ? "" : " (no AI analysis yet)"}</option>)}
            </Select>
          </Field>
          <Field label="Programming language" htmlFor="language">
            <Select id="language" name="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="none">{isDsa ? "My profile's language" : "Not relevant"}</option>
              {Object.entries(LANGUAGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          {isDsa && (
            <Field label="Problem" htmlFor="problem_slug" hint="Pick one, or get a random problem you haven't solved yet at this difficulty.">
              <Select id="problem_slug" name="problem_slug" value={problem} onChange={(e) => setProblem(e.target.value)}>
                <option value="none">Pick one for me</option>
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <optgroup key={d} label={d[0].toUpperCase() + d.slice(1)}>
                    {PROBLEMS.filter((p) => p.difficulty === d).map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Target company" htmlFor="company" hint="Style practice only — never presented as real questions.">
            <Select id="company" name="company" value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="none">General</option>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <aside aria-label="Summary" className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-medium">Summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ["Round", KINDS[kind].name], ["Interviewer", PERSONAS[persona].name], ["Difficulty", difficulty], ["Mode", mode === "mock" ? "Mock (no hints)" : "Practice (hints)"],
              ["Duration", `${duration} min`], ["Answer by", input === "voice" ? "Voice" : "Typing"],
              ["Resume", resumes.find((r) => r.id === resumeId)?.file_name ?? "Not used"], ["Company style", company === "none" ? "General" : company],
              ...(isDsa ? [["Problem", PROBLEMS.find((p) => p.slug === problem)?.title ?? "Random"]] : []),
            ].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="truncate text-right capitalize">{v}</dd></div>)}
          </dl>
        </aside>
      </div>

      {state?.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <div className="flex items-center justify-between border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="size-4" aria-hidden /> Back</Button>
        {step < STEPS.length - 1 ? (
          // Distinct keys: otherwise React reuses this DOM node, flips it to type="submit" mid-click,
          // and clicking "Next" on the last step would submit the form without showing the summary.
          <Button key="next" type="button" variant="secondary" onClick={() => setStep((s) => s + 1)}>Next <ArrowRight className="size-4" aria-hidden /></Button>
        ) : (
          <Button key="submit" type="submit" size="lg" disabled={pending}>{pending ? "Starting…" : "Start interview"}</Button>
        )}
      </div>
    </form>
  );
}
