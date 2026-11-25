"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, getCurrentUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/content/gate";
import { CONTENT_BY_ID } from "@/lib/content/registry";
import { REPORT_REASONS } from "@/lib/content/types";

const itemRef = { itemId: z.string().min(3).max(120), version: z.number().int().min(1) };
const reportSchema = z.object({ ...itemRef, reason: z.enum(Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS]), note: z.string().trim().max(500).optional() });

/** Any signed-in user can report a content item (one open report per item version). */
export async function reportProblem(input: z.input<typeof reportSchema>): Promise<{ ok: boolean; message: string }> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please pick a reason." };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { itemId, version, reason, note } = parsed.data;
  if (!CONTENT_BY_ID().has(itemId)) return { ok: false, message: "Unknown item." };
  const { error } = await supabase.from("content_reports").insert({ item_id: itemId, version, reason, note: note || null });
  if (error?.code === "23505") return { ok: true, message: "You've already reported this — thanks, it's in the queue." };
  return error ? { ok: false, message: "Couldn't send the report. Try again." } : { ok: true, message: "Thanks — reported. We'll check it." };
}

async function requireAdmin() {
  const { user } = await getCurrentUser();
  return user && isAdminEmail(user.email) ? user : null;
}

const statusSchema = z.object({ ...itemRef, status: z.enum(["draft", "reviewed", "live"]) });

/** Admin only: set the status of one item version. */
export async function setContentStatus(input: z.input<typeof statusSchema>): Promise<{ ok: boolean }> {
  const parsed = statusSchema.safeParse(input);
  const admin = await requireAdmin();
  if (!parsed.success || !admin) return { ok: false };
  const item = CONTENT_BY_ID().get(parsed.data.itemId);
  if (!item || item.meta.version !== parsed.data.version) return { ok: false };
  if (parsed.data.status === "live" && item.checks.some((c) => !c.ok)) return { ok: false }; // failing checks can't go live
  const { error } = await createAdminClient().from("content_reviews").upsert({
    item_id: parsed.data.itemId, version: parsed.data.version, status: parsed.data.status, reviewed_by: admin.id, updated_at: new Date().toISOString(),
  });
  revalidatePath("/", "layout");
  return { ok: !error };
}

/** Admin only: mark every open report on an item version as resolved (un-hides it). */
export async function resolveReports(input: z.input<z.ZodObject<typeof itemRef>>): Promise<{ ok: boolean }> {
  const parsed = z.object(itemRef).safeParse(input);
  const admin = await requireAdmin();
  if (!parsed.success || !admin) return { ok: false };
  const { error } = await createAdminClient().from("content_reports").update({ resolved_at: new Date().toISOString() })
    .eq("item_id", parsed.data.itemId).eq("version", parsed.data.version).is("resolved_at", null);
  revalidatePath("/", "layout");
  return { ok: !error };
}
