"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildProgram, encodeStdin, makeNonce, starterCode, codeLineOffset, fixLineNumbers } from "@/lib/dsa/harness";
import { grade } from "@/lib/dsa/grade";
import { runJavaScript, runPython, warmPython, pythonReady, onPythonReady } from "@/lib/dsa/browser-runner";
import type { Lang, Problem, RunOutcome } from "@/lib/dsa/types";
import type { Phase } from "@/lib/dsa/phases";

export type DsaInit = { problem: Problem; phase: Phase; language: Lang; code: string; hintsUsed: number };
type QueuedEvent = { type: "run" | "paste" | "idle" | "language" | "reset"; payload: Record<string, unknown> };

const IDLE_MS = 120_000;
const storeKey = (id: string, lang: Lang) => `ios-dsa:${id}:${lang}`;
const load = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: server autosave still runs */ } };

/**
 * State and side effects of the coding workspace: per-language code with local + server autosave,
 * Run (samples) / Submit (hidden tests), paste and idle detection, and a small event queue that is
 * flushed to the server before every interviewer turn so the interviewer knows what happened.
 */
export function useDsaWorkspace(interviewId: string, init: DsaInit) {
  const { problem } = init;
  const [language, setLanguage] = useState<Lang>(init.language);
  const [code, setCodeState] = useState(init.code);
  const [busy, setBusy] = useState<null | "run" | "submit">(null);
  const [status, setStatus] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<(RunOutcome & { kind: "run" | "submit" }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(init.phase);
  const [hintsUsed, setHintsUsed] = useState(init.hintsUsed);
  const [pyReady, setPyReady] = useState(false);
  useEffect(() => { setPyReady(pythonReady()); return onPythonReady(setPyReady); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- sync with module state

  const queue = useRef<QueuedEvent[]>([]);
  const lastActivity = useRef(0);
  useEffect(() => { lastActivity.current = Date.now(); }, []);
  const dirty = useRef(false);
  const codeRef = useRef(code);
  const langRef = useRef(language);
  useEffect(() => { codeRef.current = code; langRef.current = language; });

  const offsets = useMemo(() => Object.fromEntries((["python", "javascript", "cpp", "java"] as Lang[]).map((l) => [l, codeLineOffset(l, problem)])) as Record<Lang, number>, [problem]);

  const flush = useCallback(async (withWorkspace = false) => {
    const events = queue.current.splice(0);
    const workspace = withWorkspace || dirty.current ? { language: langRef.current, code: codeRef.current } : undefined;
    if (!events.length && !workspace) return;
    dirty.current = false;
    try {
      await fetch(`/api/interview/${interviewId}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events, workspace }) });
    } catch {
      queue.current.unshift(...events); // retry on the next flush
      dirty.current = true;
    }
  }, [interviewId]);

  // Restore this device's unsent edits after hydration (localStorage isn't available during SSR).
  useEffect(() => {
    const local = load(storeKey(interviewId, init.language));
    if (local && local !== init.code) { setCodeState(local); dirty.current = true; } // eslint-disable-line react-hooks/set-state-in-effect -- one-time restore
  }, [interviewId, init.language, init.code]);

  // Periodic server autosave + event flush.
  useEffect(() => { const t = setInterval(() => void flush(), 15_000); return () => clearInterval(t); }, [flush]);
  useEffect(() => { if (init.language === "python") warmPython(); }, [init.language]);

  const touch = useCallback(() => {
    const now = Date.now();
    const gap = now - lastActivity.current;
    if (gap >= IDLE_MS) queue.current.push({ type: "idle", payload: { seconds: Math.min(7200, Math.round(gap / 1000)) } });
    lastActivity.current = now;
  }, []);

  const setCode = useCallback((c: string) => {
    setCodeState(c);
    save(storeKey(interviewId, langRef.current), c);
    dirty.current = true;
    touch();
  }, [interviewId, touch]);

  const onPaste = useCallback((chars: number) => { if (chars >= 40) queue.current.push({ type: "paste", payload: { chars } }); }, []);

  const switchLanguage = useCallback((to: Lang) => {
    const from = langRef.current;
    if (to === from) return;
    save(storeKey(interviewId, from), codeRef.current);
    const next = load(storeKey(interviewId, to)) ?? starterCode(problem, to);
    setLanguage(to); setCodeState(next); setOutcome(null);
    queue.current.push({ type: "language", payload: { from, to } });
    dirty.current = true;
    if (to === "python") warmPython();
  }, [interviewId, problem]);

  const reset = useCallback(() => {
    const s = starterCode(problem, langRef.current);
    setCodeState(s); save(storeKey(interviewId, langRef.current), s); setOutcome(null);
    queue.current.push({ type: "reset", payload: { language: langRef.current } });
    dirty.current = true;
  }, [interviewId, problem]);

  const fixLines = useCallback((o: RunOutcome, lang: Lang): RunOutcome => ({
    ...o,
    compileOutput: o.compileOutput ? fixLineNumbers(lang, o.compileOutput, offsets[lang]) : o.compileOutput,
    stdout: fixLineNumbers(lang, o.stdout, offsets[lang]),
    tests: o.tests.map((t) => (t.error ? { ...t, error: fixLineNumbers(lang, t.error, offsets[lang]) } : t)),
  }), [offsets]);

  const remote = useCallback(async (mode: "run" | "submit") => {
    const lang = langRef.current;
    const res = await fetch(`/api/interview/${interviewId}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: lang, code: codeRef.current, mode }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.outcome) throw new Error(data.error ?? "The code judge didn't respond. Try again.");
    return fixLines(data.outcome as RunOutcome, lang);
  }, [interviewId, fixLines]);

  const run = useCallback(async () => {
    if (busy) return;
    touch();
    const lang = langRef.current;
    // Python still loading in the browser (first visit downloads ~10 MB): run this one on the judge instead of waiting.
    const viaJudge = lang === "cpp" || lang === "java" || (lang === "python" && !pythonReady());
    setBusy("run"); setError(null);
    setStatus(lang === "python" && viaJudge ? "Python is still loading in your browser, so this run goes to the judge (5–15 s)…" : viaJudge ? "Compiling and running on the judge (usually 5–15 s)…" : "Running in your browser…");
    if (lang === "python") warmPython();
    try {
      let o: RunOutcome | null = null;
      if (viaJudge && lang === "python") {
        try { o = await remote("run"); } catch { setStatus("The judge is busy; waiting for Python to finish loading in your browser…"); }
      }
      if (o) { /* ran on the judge */ }
      else if (lang === "python" || lang === "javascript") {
        const cases = problem.examples.map((e) => ({ input: e.input, expected: e.output, hidden: false }));
        const nonce = makeNonce();
        const program = buildProgram(lang, problem, codeRef.current, nonce);
        const stdin = encodeStdin(lang, problem, cases.map((c) => c.input));
        const exec = lang === "python" ? await runPython(program, stdin, { onStatus: setStatus }) : await runJavaScript(program, stdin);
        if (exec.status === "unavailable") throw new Error(exec.message ?? "The in-browser runner is unavailable.");
        o = fixLines(grade(problem, cases, exec, nonce, "browser"), lang);
        const bad = o.tests.find((t) => t.verdict !== "pass" && t.input);
        queue.current.push({ type: "run", payload: { language: lang, status: o.status, passed: o.passed, total: o.total, runner: "browser", ...(bad ? { firstFailure: { input: bad.input?.slice(0, 400), expected: bad.expected?.slice(0, 300), actual: (bad.actual ?? bad.error)?.slice(0, 300), hidden: false } } : {}) } });
      } else {
        o = await remote("run");
      }
      setOutcome({ ...o, kind: "run" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed.");
    } finally { setBusy(null); setStatus(null); }
  }, [busy, problem, remote, touch, fixLines]);

  const submit = useCallback(async () => {
    if (busy) return;
    touch();
    setBusy("submit"); setError(null); setStatus("Submitting to the judge — running every hidden test (usually 5–20 s)…");
    try {
      await flush(true);
      setOutcome({ ...(await remote("submit")), kind: "submit" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed.");
    } finally { setBusy(null); setStatus(null); }
  }, [busy, flush, remote, touch]);

  return {
    problem, language, code, setCode, switchLanguage, reset, onPaste, touch,
    run, submit, busy, status, outcome, error, clearError: () => setError(null),
    phase, setPhase, hintsUsed, setHintsUsed, flush, pyReady,
  };
}

export type DsaWorkspace = ReturnType<typeof useDsaWorkspace>;
