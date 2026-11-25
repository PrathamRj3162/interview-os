import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  full_name: string | null;
  target_role: string | null;
  experience_level: string | null;
  company_track: string | null;
  target_companies: string[];
  preferred_language: string | null;
  daily_hours: number | null;
  deadline: string | null;
  dsa_level: number | null;
  system_design_level: number | null;
  learning_style: string | null;
  ai_resume_consent: boolean;
  onboarded_at: string | null;
};

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile) ?? null;
}
