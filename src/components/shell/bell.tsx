"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: string; at: string; title: string; body: string; href: string; tone: "info" | "success" | "warning"; unread: boolean };
const TONE = { info: "bg-info", success: "bg-success", warning: "bg-warning" };

/** Notification bell: loads lazily, refreshes on navigation, "mark all read" stores the time on your profile. */
export function NotificationBell({ align = "left" }: { align?: "left" | "right" }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    if (ref.current && ref.current.offsetParent === null) return; // the hidden copy (desktop vs mobile header) doesn't fetch
    fetch("/api/notifications").then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d) { setItems(d.items); setUnread(d.unread); } }).catch(() => {});
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const markRead = async () => {
    setUnread(0); setItems((xs) => xs?.map((x) => ({ ...x, unread: false })) ?? xs);
    await fetch("/api/notifications", { method: "POST" }).catch(() => {});
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" data-testid="bell">
        <Bell className="size-5" aria-hidden />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-fg">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className={cn("absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl", align === "right" ? "right-0" : "left-0")}>
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && <button type="button" onClick={markRead} className="text-xs text-accent hover:underline">Mark all read</button>}
          </div>
          {items === null ? <p className="p-4 text-sm text-muted">Loading…</p> : items.length === 0 ? <p className="p-4 text-sm text-muted">You&apos;re all caught up.</p> : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.unread ? TONE[n.tone] : "bg-transparent")} aria-hidden />
                    <span className="min-w-0">
                      <span className={cn("block text-sm", n.unread && "font-medium")}>{n.title}</span>
                      <span className="block text-xs text-muted">{n.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-border px-4 py-2 text-[11px] text-muted">Shown here only — no emails or push messages.</p>
        </div>
      )}
    </div>
  );
}
