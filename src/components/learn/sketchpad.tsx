"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Pencil, Square, Trash2, Download } from "lucide-react";

type Tool = "pen" | "box" | "eraser";
const W = 960, H = 540;

/**
 * A plain in-browser sketchpad for drawing your own design before comparing with the reference.
 * Everything stays on this device (saved in localStorage per case); nothing is uploaded.
 */
export function Sketchpad({ storageKey }: { storageKey: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ x: number; y: number; snap: ImageData } | null>(null);
  const drawing = useRef(false);
  const [tool, setTool] = useState<Tool>("pen");

  const ctx = () => canvas.current?.getContext("2d") ?? null;
  const colour = () => getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#eee";
  const save = () => { try { localStorage.setItem(storageKey, canvas.current!.toDataURL("image/png")); } catch { /* storage full or blocked: keep drawing */ } };

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* blocked */ }
    if (!saved) return;
    const img = new Image();
    img.onload = () => ctx()?.drawImage(img, 0, 0);
    img.src = saved;
  }, [storageKey]);

  const point = (ev: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  };
  const down = (ev: React.PointerEvent) => {
    const c = ctx(); if (!c) return;
    canvas.current!.setPointerCapture(ev.pointerId);
    drawing.current = true; const p = point(ev);
    c.lineCap = "round"; c.lineJoin = "round";
    if (tool === "box") { start.current = { ...p, snap: c.getImageData(0, 0, W, H) }; return; }
    c.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    c.strokeStyle = colour(); c.lineWidth = tool === "eraser" ? 22 : 2.5;
    c.beginPath(); c.moveTo(p.x, p.y);
  };
  const move = (ev: React.PointerEvent) => {
    if (!drawing.current) return; const c = ctx(); if (!c) return; const p = point(ev);
    if (tool === "box" && start.current) {
      c.putImageData(start.current.snap, 0, 0);
      c.globalCompositeOperation = "source-over"; c.strokeStyle = colour(); c.lineWidth = 2;
      c.strokeRect(start.current.x, start.current.y, p.x - start.current.x, p.y - start.current.y);
      return;
    }
    c.lineTo(p.x, p.y); c.stroke();
  };
  const up = () => { if (!drawing.current) return; drawing.current = false; start.current = null; save(); };
  const clear = () => { ctx()?.clearRect(0, 0, W, H); try { localStorage.removeItem(storageKey); } catch { /* blocked */ } };
  const download = () => { const a = document.createElement("a"); a.href = canvas.current!.toDataURL("image/png"); a.download = "my-design.png"; a.click(); };

  const btn = (t: Tool, label: string, Icon: typeof Pencil) => (
    <button type="button" onClick={() => setTool(t)} aria-pressed={tool === t} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm ${tool === t ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong"}`}>
      <Icon className="size-4" aria-hidden />{label}
    </button>
  );

  return (
    <div className="space-y-2" data-testid="sketchpad">
      <div className="flex flex-wrap gap-2">
        {btn("pen", "Pen", Pencil)}{btn("box", "Box", Square)}{btn("eraser", "Eraser", Eraser)}
        <button type="button" onClick={download} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:border-border-strong"><Download className="size-4" aria-hidden />Save PNG</button>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:border-border-strong"><Trash2 className="size-4" aria-hidden />Clear</button>
      </div>
      <canvas
        ref={canvas} width={W} height={H} aria-label="Sketchpad for your own design"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="aspect-video w-full touch-none rounded-[var(--radius-lg)] border border-border bg-bg"
      />
      <p className="text-xs text-muted">Saved on this device only. Draw boxes for components and arrows for requests, then open the reference below to compare.</p>
    </div>
  );
}
