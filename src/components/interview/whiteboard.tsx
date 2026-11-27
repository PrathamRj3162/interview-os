"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "@excalidraw/excalidraw/index.css";
import { boardGraph, type BoardElement } from "@/lib/interview/board";

declare global { interface Window { EXCALIDRAW_ASSET_PATH?: string | string[] } }

// Fonts come from our own origin (copied into public/ at build), never a CDN — the CSP allows font-src 'self'.
if (typeof window !== "undefined") window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading the whiteboard…</div>,
});

const sig = (els: readonly Record<string, unknown>[]) => els.map((e) => `${e.id}:${e.version ?? 0}:${e.isDeleted ? 1 : 0}`).join("|");

type Props = {
  interviewId: string;
  initialElements: readonly Record<string, unknown>[];
  /** Latest elements, read by the room when an answer is sent. */
  onElements: (els: readonly BoardElement[]) => void;
  /** Docked under the canvas — the room puts the answer box here so you can type without leaving the board. */
  footer?: ReactNode;
};

/**
 * Excalidraw whiteboard for system design rounds. The drawing is sent to the interviewer as compact text with
 * each answer (lib/interview/board.ts), and autosaved for reloads.
 */
export function Whiteboard({ interviewId, initialElements, onElements, footer }: Props) {
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error" | null>(null);
  const [summary, setSummary] = useState(() => boardGraph(initialElements as unknown as BoardElement[]));
  const last = useRef<string>(sig(initialElements));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pending = useRef<readonly Record<string, unknown>[] | null>(null);
  const post = (els: readonly Record<string, unknown>[], keepalive = false) =>
    fetch(`/api/interview/${interviewId}/board`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ elements: els }), keepalive }).catch(() => null);

  // Seed the room's copy of the board ONCE. Later prop changes (a server refresh after an answer) must not
  // reset it to the stale initial drawing — Excalidraw keeps the live one.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    onElements(initialElements as unknown as BoardElement[]);
  }, [initialElements, onElements]);
  // On unmount, flush a pending save instead of dropping it.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current) void post(pending.current, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (els: readonly Record<string, unknown>[]) => {
    pending.current = els;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null; pending.current = null;
      setSaveState("saving");
      const res = await post(els);
      setSaveState(res?.ok ? "saved" : "error");
    }, 2500);
  };

  return (
    <section aria-label="Whiteboard" className="flex h-full min-h-80 flex-col overflow-hidden rounded-xl border border-border bg-surface" data-testid="whiteboard">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-muted">
        <span>Whiteboard · sent with your next answer <span className="font-mono" data-testid="board-counts">({summary.nodes.length} boxes, {summary.edges.length} arrows)</span></span>
        <span aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn't save" : ""}</span>
      </div>
      {/* Excalidraw sizes itself to 100% of its parent, which needs a definite size: absolute inset-0 gives it one. */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
        <Excalidraw
          theme="dark" /* both app themes (Neon, High contrast) are dark */
          initialData={{ elements: initialElements as never, appState: { viewBackgroundColor: "transparent" }, scrollToContent: true }}
          UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: true, toggleTheme: false } }}
          onChange={(elements) => {
            const s = sig(elements as unknown as Record<string, unknown>[]);
            if (s === last.current) return; // pointer moves / selection changes don't change element versions
            last.current = s;
            onElements(elements as unknown as BoardElement[]);
            setSummary(boardGraph(elements as unknown as BoardElement[]));
            save(elements as unknown as Record<string, unknown>[]);
          }}
        />
        </div>
      </div>
      <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted">Put text inside boxes to name components; connect them with arrows (label an arrow by double-clicking it). The interviewer reads boxes, arrows and labels, not colours or positions.</p>
      {footer && <div className="border-t border-border p-2" data-testid="board-composer">{footer}</div>}
    </section>
  );
}
