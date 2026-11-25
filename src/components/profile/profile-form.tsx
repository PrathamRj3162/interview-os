"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import {
  COMPANIES, COMPANY_TRACKS, EXPERIENCE, LANGUAGES, LEARNING_STYLES, LEVEL_LABELS, ROLES,
} from "@/lib/validation/profile";

export type ProfileDefaults = {
  full_name: string | null;
  target_role: string | null;
  experience_level: string | null;
  company_track: string | null;
  target_companies: string[];
  preferred_language: string | null;
  daily_hours: number | null;
  deadline: string | null;
  dsa_level: number | null;
  system_design_level: number | null;
  learning_style: string | null;
};

function Options({ map, placeholder }: { map: Record<string, string>; placeholder: string }) {
  return (
    <>
      <option value="" disabled>{placeholder}</option>
      {Object.entries(map).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-border pt-6 md:grid-cols-3">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">{children}</div>
    </fieldset>
  );
}

export function ProfileForm({ defaults: initial, mode }: { defaults: ProfileDefaults; mode: "onboarding" | "settings" }) {
  const [state, action, pending] = useActionState(saveProfile, null);
  // After a failed submit, show what the user entered rather than the stored profile.
  const defaults = (state?.values ? { ...initial, ...state.values } : initial) as ProfileDefaults;
  const e = state?.fieldErrors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="mode" value={mode} />

      <Section title="About you" desc="Used to pitch explanations and interview difficulty at your level.">
        <Field label="Full name" htmlFor="full_name" error={e.full_name}>
          <Input id="full_name" name="full_name" defaultValue={defaults.full_name ?? ""} autoComplete="name" />
        </Field>
        <Field label="Experience level" htmlFor="experience_level" error={e.experience_level}>
          <Select id="experience_level" name="experience_level" defaultValue={defaults.experience_level ?? ""}>
            <Options map={EXPERIENCE} placeholder="Select…" />
          </Select>
        </Field>
      </Section>

      <Section title="Your target" desc="Shapes your roadmap, question selection and mock interviews.">
        <Field label="Target role" htmlFor="target_role" error={e.target_role}>
          <Select id="target_role" name="target_role" defaultValue={defaults.target_role ?? ""}>
            <Options map={ROLES} placeholder="Select…" />
          </Select>
        </Field>
        <Field label="Company type" htmlFor="company_track" error={e.company_track}>
          <Select id="company_track" name="company_track" defaultValue={defaults.company_track ?? ""}>
            <Options map={COMPANY_TRACKS} placeholder="Select…" />
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">Target companies <span className="font-normal text-muted">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {COMPANIES.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="checkbox" name="target_companies" value={c} defaultChecked={defaults.target_companies.includes(c)} className="peer sr-only" />
                <span className="inline-block rounded-full border border-border px-3 py-1 text-sm transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  {c}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Company tracks use company-style practice questions; we never claim a question was asked by a company without a source.</p>
        </div>
      </Section>

      <Section title="Your schedule" desc="The planner fits daily tasks into the time you actually have.">
        <Field label="Hours per day" htmlFor="daily_hours" error={e.daily_hours}>
          <Input id="daily_hours" name="daily_hours" type="number" min={0.5} max={16} step={0.5} defaultValue={String(defaults.daily_hours ?? 2)} />
        </Field>
        <Field label="Interview deadline" htmlFor="deadline" hint="Leave blank if you don't have one." error={e.deadline}>
          <Input id="deadline" name="deadline" type="date" min={today} defaultValue={defaults.deadline ?? ""} />
        </Field>
      </Section>

      <Section title="Current skills" desc="A starting estimate — it's replaced by your real performance as you practise.">
        <Field label="Preferred language" htmlFor="preferred_language" error={e.preferred_language}>
          <Select id="preferred_language" name="preferred_language" defaultValue={defaults.preferred_language ?? ""}>
            <Options map={LANGUAGES} placeholder="Select…" />
          </Select>
        </Field>
        <Field label="Learning style" htmlFor="learning_style" error={e.learning_style}>
          <Select id="learning_style" name="learning_style" defaultValue={defaults.learning_style ?? ""}>
            <Options map={LEARNING_STYLES} placeholder="Select…" />
          </Select>
        </Field>
        <Field label="DSA proficiency" htmlFor="dsa_level" error={e.dsa_level}>
          <Select id="dsa_level" name="dsa_level" defaultValue={String(defaults.dsa_level ?? "")}>
            <option value="" disabled>Select…</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {LEVEL_LABELS[n]}</option>)}
          </Select>
        </Field>
        <Field label="System design proficiency" htmlFor="system_design_level" error={e.system_design_level}>
          <Select id="system_design_level" name="system_design_level" defaultValue={String(defaults.system_design_level ?? "")}>
            <option value="" disabled>Select…</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {LEVEL_LABELS[n]}</option>)}
          </Select>
        </Field>
      </Section>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-end">
        {state?.message && <FormMessage kind={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
        {Object.keys(e).length > 0 && !state?.message && <FormMessage kind="error">Please fix the highlighted fields.</FormMessage>}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : mode === "onboarding" ? "Create my preparation profile" : "Save changes"}</Button>
      </div>
    </form>
  );
}
