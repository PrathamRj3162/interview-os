import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function SiteHeader() {
  const user = isSupabaseConfigured() ? (await getCurrentUser()).user : null;
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className={buttonClasses("secondary", "sm")}>Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "sm")}>Sign in</Link>
              <Link href="/signup" className={buttonClasses("secondary", "sm")}>Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between">
        <p>Interview OS — free, open-access interview preparation.</p>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
          <Link href="/terms" className="hover:text-text">Terms</Link>
          <Link href="/design" className="hover:text-text">Design system</Link>
        </nav>
      </div>
    </footer>
  );
}
