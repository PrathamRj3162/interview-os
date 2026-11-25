"use client";

import { useActionState } from "react";
import { deleteAccount, setAiConsent, setPublicProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

export function AiConsentForm({ initial }: { initial: boolean }) {
  const [state, action, pending] = useActionState(setAiConsent, null);
  return (
    <form action={action} className="space-y-3">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="ai_resume_consent" defaultChecked={initial} className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>
          Allow my resume text to be sent to the configured AI provider for analysis and question generation.
          <span className="block text-muted">Without this, only on-server rule-based resume checks run.</span>
        </span>
      </label>
      {state?.message && <FormMessage kind={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>{pending ? "Saving…" : "Save consent"}</Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, null);
  return (
    <form action={action} className="space-y-3">
      <Field label='Type "DELETE" to confirm' htmlFor="confirm" error={state?.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" autoComplete="off" className="max-w-xs" />
      </Field>
      {state?.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <Button type="submit" variant="danger" size="sm" disabled={pending}>{pending ? "Deleting…" : "Delete account and all data"}</Button>
    </form>
  );
}

export function PublicProfileForm({ initial }: { initial: { is_public: boolean; public_handle: string | null; public_show_scores: boolean } }) {
  const [state, action, pending] = useActionState(setPublicProfile, null);
  const v = (state?.values ?? initial) as typeof initial;
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="is_public" defaultChecked={v.is_public} className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>
          Make a public profile page anyone with the link can see.
          <span className="block text-muted">Shows your first name, target role, rank, XP, streak, achievements and practice stats. Never your resume, email, transcripts or code. Off by default.</span>
        </span>
      </label>
      <Field label="Handle" htmlFor="public_handle" hint="Your page will be at /u/your_handle" error={state?.fieldErrors?.public_handle}>
        <Input id="public_handle" name="public_handle" defaultValue={v.public_handle ?? ""} autoComplete="off" placeholder="e.g. asha_codes" className="max-w-xs" />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="public_show_scores" defaultChecked={v.public_show_scores} className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>Show interview scores and verdicts<span className="block text-muted">Untick to show only rank, XP, streak and achievements.</span></span>
      </label>
      {state?.message && <FormMessage kind={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>{pending ? "Saving…" : "Save public profile"}</Button>
    </form>
  );
}
