"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { runAiResumeAnalysis } from "@/app/actions/resume";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";

export function AiAnalysisForm({ resumeId, hasConsent, providerLabel, rerun }: {
  resumeId: string; hasConsent: boolean; providerLabel: string | null; rerun?: boolean;
}) {
  const [state, action, pending] = useActionState(runAiResumeAnalysis, null);
  if (!providerLabel) {
    return <p className="text-sm text-muted">AI analysis is unavailable on this server right now. The rule-based report above is complete on its own.</p>;
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="resume_id" value={resumeId} />
      {!hasConsent && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span>I agree to send my resume text to <strong>{providerLabel}</strong> for analysis. Free AI tiers may process data under the provider&apos;s terms. You can turn this off in Settings.</span>
        </label>
      )}
      {state?.message && <FormMessage kind={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Button type="submit" variant={rerun ? "secondary" : "primary"} disabled={pending}>
        <Sparkles className="size-4" aria-hidden />
        {pending ? "Analysing — this can take up to a minute…" : rerun ? "Re-run AI analysis" : "Generate interview questions with AI"}
      </Button>
    </form>
  );
}
