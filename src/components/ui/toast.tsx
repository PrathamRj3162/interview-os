"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; message: string };
const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});

/** Toasts are announced via aria-live and auto-dismiss after 5s (errors stay until closed). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    if (kind !== "error") setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);
  const icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  const tone = { success: "text-success", error: "text-danger", info: "text-info" };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => {
          const Icon = icon[t.kind];
          return (
            <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-2 px-4 py-3 text-sm shadow-xl">
              <Icon className={cn("mt-0.5 size-4 shrink-0", tone[t.kind])} aria-hidden />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-text"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
