import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const DAILY_LIMIT = Number(process.env.AI_DAILY_REQUEST_LIMIT ?? 60);

export class QuotaExceededError extends Error {
  constructor() {
    super(`Daily AI limit reached (${DAILY_LIMIT} requests). It resets 24 hours after your earliest request today. Non-AI features remain available.`);
    this.name = "QuotaExceededError";
  }
}

/** Per-user rolling 24h quota, stored in ai_usage (RLS: users see only their own rows). */
export async function assertQuota(supabase: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error("Could not verify AI quota");
  if ((count ?? 0) >= DAILY_LIMIT) throw new QuotaExceededError();
}

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
  provider: string,
  model: string,
) {
  await supabase.from("ai_usage").insert({ user_id: userId, feature, provider, model });
}

export async function remainingQuota(supabase: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return { used: count ?? 0, limit: DAILY_LIMIT };
}
