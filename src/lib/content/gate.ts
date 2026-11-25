import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ContentMeta, ContentStatus } from "./types";

/** Comma-separated Interview OS login emails allowed to review content (env only, never in code). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export type Gate = {
  isAdmin: boolean;
  statusOf: (m: ContentMeta) => ContentStatus;
  hidden: (m: ContentMeta) => boolean;
  /** Users: live and not hidden by reports. Admins: also reviewed items (preview). */
  visible: (m: ContentMeta) => boolean;
  /** True when an admin is seeing an item ordinary users can't. */
  preview: (m: ContentMeta) => boolean;
};

export function makeGate(reviews: { item_id: string; version: number; status: string }[], hiddenRows: { item_id: string; version: number }[], isAdmin: boolean): Gate {
  const key = (id: string, v: number) => `${id}@${v}`;
  const review = new Map(reviews.map((r) => [key(r.item_id, r.version), r.status as ContentStatus]));
  const hide = new Set(hiddenRows.map((r) => key(r.item_id, r.version)));
  const statusOf = (m: ContentMeta) => review.get(key(m.id, m.version)) ?? m.status;
  const hidden = (m: ContentMeta) => hide.has(key(m.id, m.version));
  const userVisible = (m: ContentMeta) => statusOf(m) === "live" && !hidden(m);
  return {
    isAdmin, statusOf, hidden,
    visible: (m) => userVisible(m) || (isAdmin && statusOf(m) !== "draft"),
    preview: (m) => isAdmin && !userVisible(m),
  };
}

/** Loads review overrides and report-hidden items once per request. Fails open to code defaults if the DB is down. */
export const loadGate = cache(async (): Promise<Gate> => {
  const { supabase, user } = await getCurrentUser();
  if (!user) return makeGate([], [], false);
  const [rv, hd] = await Promise.all([
    supabase.from("content_reviews").select("item_id, version, status"),
    supabase.rpc("content_hidden_items"),
  ]);
  return makeGate(rv.data ?? [], (hd.data as { item_id: string; version: number }[] | null) ?? [], isAdminEmail(user.email));
});
