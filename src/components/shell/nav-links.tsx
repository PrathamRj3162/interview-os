"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon, available, phase }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm";
        return (
          <li key={href}>
            {available ? (
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(base, active ? "bg-accent-soft font-medium text-accent" : "text-text hover:bg-surface-2")}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            ) : (
              <span className={cn(base, "cursor-default text-muted/70")} aria-disabled="true" title={`Arrives in build phase ${phase}`}>
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Soon</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
