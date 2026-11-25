"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible tabs: arrow keys move focus, Home/End jump, panels are labelled. */
export function Tabs({ tabs, initial = 0, label }: { tabs: { label: string; content: ReactNode }[]; initial?: number; label: string }) {
  const [active, setActive] = useState(initial);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    const n = tabs.length;
    const next = e.key === "ArrowRight" ? (active + 1) % n : e.key === "ArrowLeft" ? (active - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next === null) return;
    e.preventDefault(); setActive(next); refs.current[next]?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-border" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={t.label} ref={(el) => { refs.current[i] = el; }} role="tab" id={`${id}-t${i}`} aria-controls={`${id}-p${i}`}
            aria-selected={active === i} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm transition-colors", active === i ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} role="tabpanel" id={`${id}-p${i}`} aria-labelledby={`${id}-t${i}`} hidden={active !== i} className="pt-4">{t.content}</div>
      ))}
    </div>
  );
}

/** Modal dialog built on <dialog>: native focus trap, Esc to close, backdrop click closes. */
export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId(); // unique per dialog: several can exist on one page
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref} onClose={onClose} aria-labelledby={titleId}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-xl)] border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id={titleId} className="font-semibold">{title}</h2>
        <button onClick={onClose} className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-text" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="px-5 py-4 text-sm">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
    </dialog>
  );
}

/** CSS-only tooltip that also shows on keyboard focus; wired with aria-describedby. */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="group/tt relative inline-flex" aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-surface-3 px-2 py-1 text-xs text-text opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover/tt:opacity-100 group-focus-within/tt:opacity-100">
        {content}
      </span>
    </span>
  );
}
