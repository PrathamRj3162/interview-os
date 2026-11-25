import { isSupabaseConfigured } from "@/lib/env";

/** Shown instead of auth UIs when the deployment is missing its database configuration. */
export function SetupNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
      This deployment isn&apos;t connected to its database yet, so sign-up and sign-in are unavailable.
      The maintainer needs to set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see DEPLOYMENT.md).
    </div>
  );
}
