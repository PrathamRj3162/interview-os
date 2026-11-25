import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/shell/nav-links";
import { MobileNav } from "@/components/shell/mobile-nav";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarded_at) redirect("/onboarding");

  const name = profile.full_name || user.email || "Account";
  return (
    <div className="flex min-h-dvh">
      <aside data-app-chrome className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface/60 p-4 lg:flex">
        <div className="mb-6 px-2"><Logo href="/dashboard" /></div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto"><NavLinks /></nav>
        <div className="border-t border-border pt-3">
          <p className="truncate px-3 text-sm font-medium">{name}</p>
          <p className="truncate px-3 text-xs text-muted">{user.email}</p>
          <form action={signOut}>
            <button type="submit" className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header data-app-chrome className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/85 px-4 py-2 backdrop-blur-md lg:hidden">
          <MobileNav />
          <Logo href="/dashboard" />
          <form action={signOut}>
            <button type="submit" className="grid size-10 place-items-center rounded-lg hover:bg-surface-2" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
