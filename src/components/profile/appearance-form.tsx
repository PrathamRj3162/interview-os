"use client";

import { useActionState } from "react";
import { savePrefs } from "@/app/actions/prefs";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { THEMES, THEME_LABELS, type ThemeId } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

export function AppearanceForm({ theme, vibe }: { theme: ThemeId; vibe: "genz" | "pro" }) {
  const [state, action, pending] = useActionState(savePrefs, null);
  const option = "cursor-pointer rounded-[var(--radius-md)] border border-border bg-surface-2 p-3 text-sm transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:shadow-[var(--focus-glow)]";
  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Theme</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(THEMES) as ThemeId[]).map((t) => (
            <label key={t} className={option}>
              <input type="radio" name="theme" value={t} defaultChecked={theme === t} className="sr-only" />
              <span className="flex items-center gap-3">
                <span className="flex overflow-hidden rounded-[var(--radius-sm)] border border-border" aria-hidden>
                  {(["bg", "surface-2", "accent", "primary"] as const).map((k) => <span key={k} className="size-5" style={{ background: THEMES[t][k] }} />)}
                </span>
                {THEME_LABELS[t]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Vibe</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([["genz", "Gen-Z", "Casual micro-copy in menus, toasts and empty states. Reports stay professional."], ["pro", "Professional", "Neutral wording everywhere."]] as const).map(([v, t, d]) => (
            <label key={v} className={cn(option, "block")}>
              <input type="radio" name="vibe" value={v} defaultChecked={vibe === v} className="sr-only" />
              <span className="font-medium">{t}</span><span className="mt-0.5 block text-xs text-muted">{d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.message && <FormMessage kind={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save appearance"}</Button>
    </form>
  );
}
