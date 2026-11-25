"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const live = NAV.filter((n) => n.available);
  const soon = NAV.filter((n) => !n.available);
  return (
    <div className="space-y-4">
      <ul className="space-y-0.5">
        {live.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors duration-[var(--duration-fast)]",
                  active ? "bg-accent-soft font-medium text-text before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent before:shadow-[0_0_8px_var(--accent)]" : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active && "text-accent")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      {soon.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted hover:text-text">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
            Coming soon <span className="ml-auto rounded bg-surface-3 px-1.5 font-mono normal-case">{soon.length}</span>
          </summary>
          <ul className="mt-1 space-y-0.5" aria-label="Modules not available yet">
            {soon.map(({ href, label, icon: Icon }) => (
              <li key={href} className="flex items-center gap-3 px-3 py-1.5 text-sm text-muted/70">
                <Icon className="size-4 shrink-0" aria-hidden />{label}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
