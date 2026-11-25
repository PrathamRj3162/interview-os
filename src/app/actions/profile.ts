"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient, getCurrentUser } from "@/lib/supabase/server";
import { profileSchema, profileFromFormData } from "@/lib/validation/profile";
import { fieldErrorsFrom, type ActionState } from "./types";

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");
  const raw = profileFromFormData(fd) as Record<string, unknown>;
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { values: raw, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const isOnboarding = fd.get("mode") === "onboarding";
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, ...(isOnboarding ? { onboarded_at: new Date().toISOString() } : {}) })
    .eq("id", user.id);
  if (error) return { values: raw, message: "Could not save your profile. Please try again." };

  revalidatePath("/", "layout");
  if (isOnboarding) redirect("/dashboard");
  return { ok: true, message: "Profile saved." };
}

export async function setAiConsent(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");
  const consent = fd.get("ai_resume_consent") === "on";
  const { error } = await supabase.from("profiles").update({ ai_resume_consent: consent }).eq("id", user.id);
  if (error) return { message: "Could not update consent." };
  revalidatePath("/settings");
  return { ok: true, message: consent ? "AI processing of your resume is enabled." : "AI processing of your resume is disabled." };
}

/** Permanently deletes the account, all rows (FK cascade) and all stored resume files. */
export async function deleteAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login");
  if (fd.get("confirm") !== "DELETE") return { fieldErrors: { confirm: 'Type DELETE to confirm' } };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { message: "Account deletion is not configured on this server. Contact the maintainer." };
  }

  const { data: files } = await admin.storage.from("resumes").list(user.id, { limit: 1000 });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { message: "Deletion failed. Nothing was removed from your account; please try again." };
  if (files && files.length > 0) {
    const { error: storageError } = await admin.storage
      .from("resumes")
      .remove(files.map((f) => `${user.id}/${f.name}`));
    if (storageError) console.error("[delete-account] storage cleanup failed for a deleted user");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}

const RESERVED = new Set(["admin", "api", "app", "dashboard", "help", "interview", "login", "logout", "me", "new", "progress", "root", "settings", "signup", "support", "system", "user", "users"]);

/** Opt-in public profile: a handle and two switches. Off by default; turning it off hides the page immediately. */
export async function setPublicProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");
  const isPublic = fd.get("is_public") === "on";
  const showScores = fd.get("public_show_scores") === "on";
  const handle = String(fd.get("public_handle") ?? "").trim().toLowerCase();
  const values = { is_public: isPublic, public_show_scores: showScores, public_handle: handle };
  if (handle && !/^[a-z0-9_]{3,24}$/.test(handle)) return { values, fieldErrors: { public_handle: "3–24 characters: lowercase letters, numbers and _." } };
  if (handle && RESERVED.has(handle)) return { values, fieldErrors: { public_handle: "That handle is reserved. Pick another." } };
  if (isPublic && !handle) return { values, fieldErrors: { public_handle: "Choose a handle to make your profile public." } };
  const { error } = await supabase.from("profiles").update({ is_public: isPublic, public_show_scores: showScores, public_handle: handle || null }).eq("id", user.id);
  if (error) return { values, ...(error.code === "23505" ? { fieldErrors: { public_handle: "That handle is taken." } } : { message: "Couldn't save. Please try again." }) };
  revalidatePath("/settings");
  return { ok: true, message: isPublic ? `Public profile is on: /u/${handle}` : "Public profile is off." };
}
