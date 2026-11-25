import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

// Placeholders let the client be constructed when unconfigured; callers check isSupabaseConfigured().
const SUPABASE_URL = publicEnv.supabaseUrl || "http://localhost:54321";
const SUPABASE_KEY = publicEnv.supabaseAnonKey || "unconfigured";

/** Per-request Supabase client acting as the signed-in user (RLS enforced). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS — use ONLY for operations that must act
 * across tables on behalf of an already-verified user (e.g. account deletion).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createAdminSupabase(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Returns the verified user or null. Uses getUser(), which validates with the Auth server. */
export async function getCurrentUser() {
  const supabase = await createClient();
  if (!isSupabaseConfigured()) return { supabase, user: null };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

/**
 * For pages and actions that need a signed-in user. Pages render in parallel with their
 * layout, so each page must enforce this itself rather than relying on the layout.
 */
export async function requireUser() {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");
  return { supabase, user };
}
