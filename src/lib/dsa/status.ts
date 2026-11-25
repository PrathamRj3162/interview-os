import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SolveStatus = "solved" | "attempted" | "new";

/** Per-problem status from your judge submissions (accepted at least once → solved). */
export async function problemStatuses(supabase: SupabaseClient): Promise<Record<string, SolveStatus>> {
  const { data } = await supabase.from("submissions").select("problem_slug, status").limit(5000);
  const out: Record<string, SolveStatus> = {};
  for (const s of data ?? []) out[s.problem_slug] = s.status === "accepted" || out[s.problem_slug] === "solved" ? "solved" : "attempted";
  return out;
}
