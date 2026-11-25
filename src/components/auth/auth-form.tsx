"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import type { ActionState } from "@/app/actions/types";

type FieldDef = { name: string; label: string; type: string; autoComplete?: string; hint?: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
  disabled,
  footer,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  fields: FieldDef[];
  submitLabel: string;
  hidden?: Record<string, string>;
  disabled?: boolean;
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok && state.message) return <FormMessage kind="success">{state.message}</FormMessage>;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <Field key={f.name} label={f.label} htmlFor={f.name} hint={f.hint} error={state?.fieldErrors?.[f.name]}>
          <Input
            id={f.name}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            defaultValue={f.type === "password" ? undefined : String(state?.values?.[f.name] ?? "")}
            required
            aria-invalid={Boolean(state?.fieldErrors?.[f.name])}
          />
        </Field>
      ))}
      {state?.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <Button type="submit" className="w-full" disabled={pending || disabled}>
        {pending ? "Please wait…" : submitLabel}
      </Button>
      {footer && <div className="text-center text-sm text-muted">{footer}</div>}
    </form>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-accent hover:underline">
      {children}
    </Link>
  );
}
