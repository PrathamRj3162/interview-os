"use client";

import { Fragment, useCallback, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Play, Send, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Loader2, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";
import { show } from "@/lib/dsa/compare";
import { LANGS, LANG_LABELS, type Lang, type Problem, type RunOutcome } from "@/lib/dsa/types";
import { PHASES, PHASE_LABELS, type Phase } from "@/lib/dsa/phases";
import type { DsaWorkspace } from "./use-dsa-workspace";

const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading editor…</div>,
});

/** Inline `code` spans and paragraphs from the plain-text statement format. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="mb-3 leading-6">
          {para.split(/(`[^`]+`)/g).map((part, j) => (part.startsWith("`") && part.endsWith("`")
            ? <code key={j} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[12.5px]">{part.slice(1, -1)}</code>
            : <Fragment key={j}>{part}</Fragment>))}
        </p>
      ))}
    </>
  );
}

const DIFF_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

export function ProblemPanel({ problem }: { problem: Problem }) {
  return (
    <section aria-label="Problem" className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="mr-auto font-semibold">{problem.title}</h2>
        <Badge tone={DIFF_TONE[problem.difficulty]} className="capitalize">{problem.difficulty}</Badge>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
        <RichText text={problem.statement} />
        {problem.examples.map((e, i) => (
          <div key={i} className="mb-3 rounded-lg border border-border bg-surface-2 p-3 font-mono text-[12.5px] leading-5">
            <p className="mb-1 font-sans text-xs font-medium text-muted">Example {i + 1}</p>
            <p className="break-all"><span className="text-muted">Input: </span>{problem.params.map((p, k) => `${p.name} = ${show(e.input[k], 400)}`).join(", ")}</p>
            <p className="break-all"><span className="text-muted">Output: </span>{show(e.output, 400)}</p>
            {e.explanation && <p className="mt-1 font-sans text-xs text-muted">{e.explanation}</p>}
          </div>
        ))}
        <h3 className="mb-1 mt-4 text-xs font-medium uppercase tracking-wide text-muted">Constraints</h3>
        <ul className="list-disc space-y-0.5 pl-5 font-mono text-[12.5px]">{problem.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
        <div className="mt-4 flex flex-wrap gap-1.5">{problem.topics.map((t) => <Badge key={t}>{t}</Badge>)}</div>
        <p className="mt-4 text-xs text-muted">Topics are shown because this is practice. In a real interview, you&apos;d have to work these out yourself.</p>
      </div>
    </section>
  );
}

const STATUS_META: Record<RunOutcome["status"], { label: string; tone: "success" | "danger" | "warning"; Icon: typeof CheckCircle2 }> = {
  accepted: { label: "All tests passed", tone: "success", Icon: CheckCircle2 },
  wrong_answer: { label: "Wrong answer", tone: "danger", Icon: XCircle },
  runtime_error: { label: "Runtime error", tone: "danger", Icon: AlertTriangle },
  compile_error: { label: "Compile error", tone: "danger", Icon: AlertTriangle },
  time_limit: { label: "Time limit exceeded", tone: "warning", Icon: Clock },
  error: { label: "Couldn't run", tone: "warning", Icon: AlertTriangle },
};

function Results({ ws }: { ws: DsaWorkspace }) {
  const o = ws.outcome;
  if (ws.busy) return <p role="status" className="flex items-center gap-2 p-3 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> {ws.status}</p>;
  if (ws.error) return <p role="alert" className="p-3 text-sm text-warning">{ws.error}</p>;
  if (!o) return <p className="p-3 text-sm text-muted">Run checks the examples ({ws.language === "python" || ws.language === "javascript" ? "in your browser" : "on the judge"}). Submit runs the hidden tests too.</p>;
  const meta = STATUS_META[o.status];
  const hidden = o.tests.filter((t) => t.hidden);
  return (
    <div className="space-y-3 p-3 text-sm" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("flex items-center gap-1.5 font-semibold", meta.tone === "success" ? "text-success" : meta.tone === "danger" ? "text-danger" : "text-warning")}>
          <meta.Icon className="size-4" aria-hidden /> {o.status === "accepted" && o.kind === "run" ? "Examples passed" : meta.label}
        </span>
        <span className="text-muted">{o.passed}/{o.total} passed · {o.kind === "submit" ? "submission" : "run"} · {o.runner === "browser" ? "in browser" : "Judge0"}{o.timeMs != null ? ` · ${o.timeMs} ms` : ""}</span>
      </div>
      {o.message && <p className="text-xs text-muted">{o.message}</p>}
      {o.compileOutput && <pre className="max-h-48 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs text-danger">{o.compileOutput}</pre>}
      {o.tests.filter((t) => !t.hidden || t.input).map((t) => (
        <details key={t.index} open={t.verdict !== "pass"} className="rounded-lg border border-border bg-surface-2">
          <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium">
            {t.verdict === "pass" ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : t.verdict === "not_run" ? <Clock className="size-3.5 text-muted" aria-hidden /> : <XCircle className="size-3.5 text-danger" aria-hidden />}
            {t.hidden ? "First failing hidden test" : `Example ${t.index + 1}`} — {t.verdict.replace("_", " ")}
          </summary>
          {t.input && (
            <dl className="space-y-1 border-t border-border px-3 py-2 font-mono text-xs leading-5">
              <div><dt className="inline text-muted">Input: </dt><dd className="inline whitespace-pre-wrap break-all">{t.input}</dd></div>
              <div><dt className="inline text-muted">Expected: </dt><dd className="inline break-all">{t.expected}</dd></div>
              {t.actual !== undefined && <div><dt className="inline text-muted">Got: </dt><dd className="inline break-all">{t.actual}</dd></div>}
              {t.error && <div><dt className="inline text-muted">Error: </dt><dd className="inline whitespace-pre-wrap break-all text-danger">{t.error}</dd></div>}
            </dl>
          )}
        </details>
      ))}
      {hidden.length > 0 && <p className="flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" aria-hidden /> Hidden tests: {hidden.filter((t) => t.verdict === "pass").length}/{hidden.length} passed</p>}
      {o.stdout && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Your output (print / console.log)</p>
          <pre className="max-h-40 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs">{o.stdout}</pre>
        </div>
      )}
    </div>
  );
}

export function EditorPanel({ ws, disabled }: { ws: DsaWorkspace; disabled?: boolean }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const remoteRun = ws.language === "cpp" || ws.language === "java";
  return (
    <section aria-label="Code editor" className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <label htmlFor="dsa-lang" className="sr-only">Language</label>
        <Select id="dsa-lang" value={ws.language} onChange={(e) => ws.switchLanguage(e.target.value as Lang)} className="h-8 w-auto py-0 text-xs" disabled={Boolean(ws.busy)}>
          {LANGS.map((l) => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
        </Select>
        <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)} disabled={Boolean(ws.busy)} aria-label="Reset to starter code" title="Reset to starter code"><RotateCcw className="size-3.5" aria-hidden /><span className="hidden 2xl:inline">Reset</span></Button>
        <span className="ml-auto" />
        <Button size="sm" variant="secondary" onClick={() => void ws.run()} disabled={disabled || Boolean(ws.busy)} title="Run examples (Ctrl/⌘ + ')">
          {ws.busy === "run" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Play className="size-3.5" aria-hidden />} Run
        </Button>
        <Button size="sm" onClick={() => void ws.submit()} disabled={disabled || Boolean(ws.busy)} title="Submit (Ctrl/⌘ + Shift + Enter)">
          {ws.busy === "submit" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />} Submit
        </Button>
      </div>
      <div className="min-h-0 flex-[3]">
        <CodeEditor value={ws.code} language={ws.language} onChange={ws.setCode} onPaste={ws.onPaste} onRun={() => void ws.run()} onSubmit={() => void ws.submit()} readOnly={disabled} />
      </div>
      <div className="min-h-0 flex-[2] overflow-y-auto border-t border-border" aria-label="Test results">
        <Results ws={ws} />
      </div>
      <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted">
        Autosaved. {remoteRun ? "C++/Java runs and all submissions" : "Submissions"} execute on the free public Judge0 service, so your code is sent to a third party. Python/JS Run stays in your browser.
      </p>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset the editor?"
        footer={<><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { ws.reset(); setConfirmReset(false); }}>Reset to starter code</Button></>}>
        Your {LANG_LABELS[ws.language]} code will be replaced with the starter template. This can&apos;t be undone.
      </Dialog>
    </section>
  );
}

export function PhaseStepper({ phase }: { phase: Phase }) {
  const at = PHASES.indexOf(phase);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto text-[11px]" aria-label="Interview phase">
      {PHASES.map((p, i) => (
        <li key={p} aria-current={i === at ? "step" : undefined}
          className={cn("whitespace-nowrap rounded-full px-2 py-0.5", i === at ? "bg-accent text-accent-fg font-semibold" : i < at ? "text-success" : "text-muted")}>
          {i < at && "✓ "}{PHASE_LABELS[p]}
        </li>
      ))}
    </ol>
  );
}

/**
 * Three resizable panes (problem | editor | interviewer). Separators are draggable and keyboard-operable
 * (focus + ←/→). Below the lg breakpoint, panes become tabs.
 */
export function SplitPanes({ panes }: { panes: { id: string; label: string; node: ReactNode }[] }) {
  const [sizes, setSizes] = useState([28, 42, 30]);
  const [tab, setTab] = useState(panes[1]?.id ?? panes[0].id);
  const box = useRef<HTMLDivElement>(null);

  const resize = useCallback((i: number, deltaPct: number) => {
    setSizes((s) => {
      const n = [...s];
      const d = Math.max(-(n[i] - 18), Math.min(n[i + 1] - 18, deltaPct));
      n[i] += d; n[i + 1] -= d;
      return n;
    });
  }, []);

  const drag = (i: number) => (e: React.PointerEvent) => {
    const el = box.current; if (!el) return;
    e.preventDefault();
    const width = el.getBoundingClientRect().width;
    let last = e.clientX;
    const move = (ev: PointerEvent) => { resize(i, ((ev.clientX - last) / width) * 100); last = ev.clientX; };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
  };

  return (
    <>
      <div role="tablist" aria-label="Panes" className="flex gap-1 rounded-lg border border-border bg-surface p-1 lg:hidden">
        {panes.map((p) => (
          <button key={p.id} role="tab" aria-selected={tab === p.id} onClick={() => setTab(p.id)}
            className={cn("flex-1 rounded-md px-3 py-1.5 text-sm", tab === p.id ? "bg-accent-soft font-medium text-text" : "text-muted")}>{p.label}</button>
        ))}
      </div>
      <div ref={box} className="flex min-h-0 flex-1 gap-0">
        {panes.map((p, i) => (
          <Fragment key={p.id}>
            <div className={cn("min-h-0 min-w-0 basis-full lg:block lg:basis-[var(--pane)]", tab === p.id ? "block" : "hidden")} style={{ "--pane": `${sizes[i]}%` } as React.CSSProperties} data-pane={p.id}>
              {p.node}
            </div>
            {i < panes.length - 1 && (
              <div
                role="separator" aria-orientation="vertical" aria-label={`Resize ${p.label} and ${panes[i + 1].label}`}
                aria-valuenow={Math.round(sizes[i])} aria-valuemin={18} aria-valuemax={64} tabIndex={0}
                onPointerDown={drag(i)}
                onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); resize(i, -2); } if (e.key === "ArrowRight") { e.preventDefault(); resize(i, 2); } }}
                className="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center lg:flex"
              >
                <span className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-accent group-focus-visible:bg-accent" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </>
  );
}
