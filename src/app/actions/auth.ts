"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema, signupSchema, safeNext } from "@/lib/validation/profile";
import { publicEnv } from "@/lib/env";
import { fieldErrorsFrom, type ActionState } from "./types";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : publicEnv.siteUrl;
}

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = { email: String(fd.get("email") ?? "") };
  const parsed = credentialsSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { values, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown email and wrong password (no account enumeration).
  if (error) {
    if (error.status === 429) return { values, message: "Too many attempts. Please wait a minute and try again." };
    return { values, message: error.code === "email_not_confirmed" ? "Confirm your email first — check your inbox." : "Incorrect email or password." };
  }
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = { email: String(fd.get("email") ?? ""), full_name: String(fd.get("full_name") ?? "") };
  const parsed = signupSchema.safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
    full_name: fd.get("full_name"),
  });
  if (!parsed.success) return { values, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { values, fieldErrors: { password: error.message } };
    if (error.status === 429)
      return { values, message: "We're receiving a lot of sign-ups right now and can't send more confirmation emails. Please try again in a few minutes." };
    console.warn("[signup] failed:", error.code ?? error.status);
    return { values, message: "Could not create the account. Please try again in a moment." };
  }
  if (data.session) redirect("/onboarding");
  return { ok: true, message: "Check your email for a confirmation link to activate your account." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = { email: String(fd.get("email") ?? "") };
  const parsed = z.object({ email: z.email("Enter a valid email") }).safeParse({ email: fd.get("email") });
  if (!parsed.success) return { values, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/update-password`,
  });
  if (error?.status === 429) return { values, message: "Too many reset emails were requested. Please try again in a few minutes." };
  // Otherwise always the same response, whether or not the email exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({ password: credentialsSchema.shape.password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] })
    .safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: "Your reset link has expired. Request a new one." };
  redirect("/dashboard");
}
