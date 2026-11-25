"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./nav-links";
import { Logo } from "@/components/logo";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-lg hover:bg-surface-2"
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo href="/dashboard" />
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2" aria-label="Close navigation" autoFocus>
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </div>
  );
}
