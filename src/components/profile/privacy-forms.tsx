"use client";

import { useActionState } from "react";
import { deleteAccount, setAiConsent } from "@/app/actions/profile";
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
