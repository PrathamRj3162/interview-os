"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Send, FilePlus2, Trash2, Lock, Sparkles, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/interactive";
import { CodeEditor } from "@/components/dsa/code-editor";
import { cn } from "@/lib/utils";
import { MC_ENTRY, MC_EXT, MC_FILE_RE, MC_LANG_LABEL, type McFiles, type McLang, type McProblem } from "@/lib/mc/types";

export type McInit = {
  problem: McProblem; language: McLang; files: McFiles;
  phase: "build" | "review" | "wrap"; revealed: boolean;
  plan: { buildMin: number; reviewMin: number; revealAtMin: number };
  startedAt: string;
};

type SubmitSummary = { status: string; core: { passed: number; total: number }; ext: { passed: number; total: number }; revealed: boolean; firstFailure: { name: string; got?: string; expected?: string } | null; compile?: string };
type State = { phase: McInit["phase"]; revealed: boolean };

const clock = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/**
 * The machine coding work area: requirements, a multi-file editor and runs. The server owns the clock (reveal at
 * two-thirds of the build, then the review), so this polls the state and freezes the code when the review starts.
 */
export function McWorkspace({ interviewId, init, registerFlush, onPhase }: { interviewId: string; init: McInit; registerFlush: (fn: () => Promise<void>) => void; onPhase?: (p: string) => void }) {
  const [files, setFiles] = useState<McFiles>(init.files);
  const [active, setActive] = useState(MC_ENTRY[init.language]);
  const [tab, setTab] = useState<"req" | "code" | "run">("req");
  const [state, setState] = useState<State>({ phase: init.phase, revealed: init.revealed });
  const [stdin, setStdin] = useState(init.problem.sample.input);
  const [runOut, setRunOut] = useState<{ status: string; output: string; stderr?: string } | null>(null);
  const [submit, setSubmit] = useState<SubmitSummary | null>(null);
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [now, setNow] = useState(() => Date.now());
  const [newFile, setNewFile] = useState<string | null>(null);
  const [confirmReview, setConfirmReview] = useState(false);
  const dirty = useRef(false);
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; });
  const frozen = state.phase !== "build";

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });
  const apply = useCallback((d: { phase?: State["phase"]; revealed?: boolean }) => {
    const s = stateRef.current;
    const next = { phase: d.phase ?? s.phase, revealed: d.revealed ?? s.revealed };
    if (next.phase === s.phase && next.revealed === s.revealed) return;
    stateRef.current = next;
    setState(next);
    if (next.revealed && !s.revealed) setTab("req"); // show the new requirement as soon as it arrives
    if (next.phase !== s.phase) onPhase?.(next.phase);
  }, [onPhase]);

  const call = useCallback(async (body: object) => {
    const res = await fetch(`/api/interview/${interviewId}/mc`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : { error: "Network error — check your connection." };
    apply(data);
    return { ok: Boolean(res?.ok), data };
  }, [interviewId, apply]);

  const save = useCallback(async () => {
    if (!dirty.current || frozen) return;
    dirty.current = false;
    setSaved("saving");
    const r = await call({ action: "save", files: filesRef.current });
    setSaved(r.ok ? "saved" : "error");
    if (!r.ok) { dirty.current = true; if (r.data.error) setErr(r.data.error); }
  }, [call, frozen]);

  useEffect(() => { registerFlush(save); }, [registerFlush, save]);
  // Autosave every 4 s while editing; poll the server clock every 20 s (reveal / review switch).
  useEffect(() => { const t = setInterval(() => { void save(); }, 4000); return () => clearInterval(t); }, [save]);
  useEffect(() => { const t = setInterval(() => { void call({ action: "state" }); }, 20_000); return () => clearInterval(t); }, [call]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const edit = (name: string, src: string) => { setFiles((f) => ({ ...f, [name]: src })); dirty.current = true; setSaved("saving"); };
  const run = async () => {
    setBusy("run"); setErr(null);
    const r = await call({ action: "run", files: filesRef.current, stdin });
    if (r.data.run) { setRunOut(r.data.run); dirty.current = false; setSaved("saved"); } else setErr(r.data.error ?? "Run failed.");
    setBusy(null); setTab("run");
  };
  const doSubmit = async () => {
    setBusy("submit"); setErr(null);
    const r = await call({ action: "submit", files: filesRef.current });
    if (r.data.submit) { setSubmit(r.data.submit); dirty.current = false; setSaved("saved"); } else setErr(r.data.error ?? "Submit failed.");
    setBusy(null); setTab("run");
  };
  const startReview = async () => { setConfirmReview(false); await save(); await call({ action: "review" }); };

  const elapsed = now - Date.parse(init.startedAt);
  const buildLeft = init.plan.buildMin * 60_000 - elapsed;
  const revealIn = init.plan.revealAtMin * 60_000 - elapsed;
  const p = init.problem;

  const addFile = () => {
    const name = (newFile ?? "").trim();
    if (!MC_FILE_RE.test(name) || !name.endsWith(MC_EXT[init.language])) { setErr(`File names look like Parking${MC_EXT[init.language]} (letters, digits, _; no folders).`); return; }
    if (files[name] !== undefined) { setErr("That file already exists."); return; }
    edit(name, ""); setActive(name); setNewFile(null); setTab("code"); setErr(null);
  };
  const removeFile = (name: string) => {
    if (name === MC_ENTRY[init.language]) return;
    setFiles((f) => { const n = { ...f }; delete n[name]; return n; });
    dirty.current = true;
    if (active === name) setActive(MC_ENTRY[init.language]);
  };

  return (
    <section aria-label="Machine coding workspace" className="flex min-h-0 flex-col rounded-xl border border-border bg-surface" data-testid="mc-workspace">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
        <Badge>{MC_LANG_LABEL[init.language]}</Badge>
        {frozen ? <span className="flex items-center gap-1 font-medium text-warning" data-testid="mc-phase"><Lock className="size-3.5" aria-hidden />Code review — code frozen</span>
          : <span data-testid="mc-phase">Build · <span className="font-mono tabular-nums">{clock(buildLeft)}</span> left</span>}
        {!state.revealed && !frozen && <span className="text-muted">· new requirement in <span className="font-mono">{clock(revealIn)}</span></span>}
        {state.revealed && <span className="flex items-center gap-1 text-accent"><Sparkles className="size-3.5" aria-hidden />New requirement added</span>}
        <span className="ml-auto text-muted" aria-live="polite">{frozen ? "" : saved === "saving" ? "Saving…" : saved === "error" ? "Not saved" : "Saved"}</span>
      </div>
      <div role="tablist" className="flex gap-1 border-b border-border px-2 pt-2 text-sm">
        {([["req", "Requirements"], ["code", "Code"], ["run", "Run & tests"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-t-md px-3 py-1.5", tab === k ? "bg-bg text-text" : "text-muted hover:text-text")}>{l}{k === "req" && state.revealed && <span className="ml-1 inline-block size-1.5 rounded-full bg-accent align-middle" aria-hidden />}</button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "req" && (
          <div className="space-y-4 p-4 text-sm" data-testid="mc-requirements">
            <div><h2 className="text-base font-semibold">{p.title}</h2>{p.statement.map((x) => <p key={x} className="mt-1">{x}</p>)}</div>
            {state.revealed && (
              <div className="rounded-lg border border-accent/50 bg-accent-soft p-3" data-testid="mc-extension">
                <p className="font-medium">New requirement: {p.extension.title}</p>
                {p.extension.text.map((x) => <p key={x} className="mt-1">{x}</p>)}
                <ul className="mt-1 list-disc pl-5">{p.extension.io.map((x) => <li key={x} className="font-mono text-xs">{x}</li>)}</ul>
              </div>
            )}
            <div><p className="font-medium">Commands (stdin → stdout)</p><ul className="mt-1 list-disc space-y-1 pl-5">{p.io.map((x) => <li key={x} className="font-mono text-xs">{x}</li>)}</ul></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="font-medium">Core</p><ul className="mt-1 list-disc pl-5">{p.core.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><p className="font-medium">Bonus</p><ul className="mt-1 list-disc pl-5">{p.bonus.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="font-medium">Sample input</p><pre className="mt-1 overflow-auto rounded bg-bg p-2 font-mono text-xs">{p.sample.input}</pre></div>
              <div><p className="font-medium">Sample output</p><pre className="mt-1 overflow-auto rounded bg-bg p-2 font-mono text-xs">{p.sample.output}</pre></div>
            </div>
            <p className="text-xs text-muted">Entry file: <span className="font-mono">{MC_ENTRY[init.language]}</span>. Flat files only (no packages or folders). Hidden tests compare your output line by line (trailing spaces ignored). Judged on working code, modular design, validation and how easily the new requirement fits.</p>
          </div>
        )}

        {tab === "code" && (
          <div className="flex h-full min-h-80">
            <ul className="w-44 shrink-0 space-y-0.5 border-r border-border p-2 text-xs" aria-label="Files">
              {Object.keys(files).sort((a, b) => (a === MC_ENTRY[init.language] ? -1 : b === MC_ENTRY[init.language] ? 1 : a.localeCompare(b))).map((f) => (
                <li key={f} className="flex items-center gap-1">
                  <button type="button" onClick={() => setActive(f)} className={cn("min-w-0 flex-1 truncate rounded px-2 py-1 text-left font-mono", active === f ? "bg-accent-soft text-text" : "text-muted hover:text-text")}>{f}</button>
                  {!frozen && f !== MC_ENTRY[init.language] && <button type="button" aria-label={`Delete ${f}`} onClick={() => removeFile(f)} className="text-muted hover:text-danger"><Trash2 className="size-3.5" /></button>}
                </li>
              ))}
              {!frozen && (newFile === null
                ? <li><button type="button" onClick={() => setNewFile("")} className="mt-1 flex items-center gap-1 px-2 py-1 text-accent"><FilePlus2 className="size-3.5" aria-hidden />New file</button></li>
                : <li className="mt-1 space-y-1"><input autoFocus aria-label="New file name" value={newFile} onChange={(e) => setNewFile(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFile(); if (e.key === "Escape") setNewFile(null); }} placeholder={`Name${MC_EXT[init.language]}`} className="w-full rounded border border-border bg-bg px-1.5 py-1 font-mono" /></li>)}
            </ul>
            <div className="min-w-0 flex-1">
              <CodeEditor key={active} value={files[active] ?? ""} language={init.language} readOnly={frozen} label={`Editor: ${active}`} onChange={(v) => edit(active, v)} onRun={run} />
            </div>
          </div>
        )}

        {tab === "run" && (
          <div className="space-y-3 p-4 text-sm">
            <label className="block font-medium" htmlFor="mc-stdin">Input (one command per line)</label>
            <Textarea id="mc-stdin" rows={6} value={stdin} onChange={(e) => setStdin(e.target.value)} className="font-mono text-xs" />
            {runOut && (
              <div data-testid="mc-run-output">
                <p className="font-medium">Output <span className="text-xs text-muted">({runOut.status === "ok" ? "exit 0" : runOut.status.replace("_", " ")})</span></p>
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-bg p-2 font-mono text-xs">{runOut.output || "(no output)"}</pre>
                {runOut.stderr && <pre className="mt-1 max-h-32 overflow-auto rounded bg-bg p-2 font-mono text-xs text-danger">{runOut.stderr}</pre>}
              </div>
            )}
            {submit && (
              <div className="rounded-lg border border-border p-3" data-testid="mc-submit-result">
                <p className="font-medium">Hidden tests: core {submit.core.passed}/{submit.core.total}{submit.revealed ? ` · new requirement ${submit.ext.passed}/${submit.ext.total}` : ""}</p>
                {submit.compile && <pre className="mt-1 max-h-40 overflow-auto font-mono text-xs text-danger">{submit.compile}</pre>}
                {submit.firstFailure && <p className="mt-1 text-xs text-muted">First failing test: {submit.firstFailure.name}{submit.firstFailure.got !== undefined ? " (the sample — compare your output with the sample output)" : ""}</p>}
                {submit.firstFailure?.got !== undefined && <pre className="mt-1 max-h-40 overflow-auto rounded bg-bg p-2 font-mono text-xs">{submit.firstFailure.got || "(no output)"}</pre>}
              </div>
            )}
          </div>
        )}
      </div>

      {err && <p role="alert" className="border-t border-border px-3 py-2 text-xs text-danger">{err}</p>}
      {!frozen && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
          <Button size="sm" variant="secondary" disabled={busy !== null} onClick={run}><Play className="size-4" aria-hidden />{busy === "run" ? "Running…" : "Run"}</Button>
          <Button size="sm" variant="secondary" disabled={busy !== null} onClick={doSubmit}><Send className="size-4" aria-hidden />{busy === "submit" ? "Testing…" : "Submit (hidden tests)"}</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setConfirmReview(true)}><Flag className="size-4" aria-hidden />Finish build</Button>
        </div>
      )}
      <Dialog open={confirmReview} onClose={() => setConfirmReview(false)} title="Finish the build?" footer={<><Button variant="ghost" size="sm" onClick={() => setConfirmReview(false)}>Keep building</Button><Button size="sm" onClick={startReview}>Start the review</Button></>}>
        <p className="text-sm">Your code is frozen for the review. Submit once more first if you&apos;ve changed anything since the last test run.</p>
      </Dialog>
    </section>
  );
}
