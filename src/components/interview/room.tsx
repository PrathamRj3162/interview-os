"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mic, MicOff, Volume2, VolumeX, Pause, Play, Square, Send, Lightbulb, RotateCcw, Code2, Loader2, Keyboard, Maximize2, Minimize2, SlidersHorizontal, Gauge } from "lucide-react";
import Link from "next/link";
import { Dialog } from "@/components/ui/interactive";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useVoice } from "@/components/voice/use-voice";
import { InterviewerAvatar } from "./avatar";
import { VoiceSettingsDialog, LevelMeter } from "@/components/voice/voice-ui";
import { useDsaWorkspace, type DsaInit, type DsaWorkspace } from "@/components/dsa/use-dsa-workspace";
import { ProblemPanel, EditorPanel, PhaseStepper, SplitPanes } from "@/components/dsa/panels";
import type { Phase } from "@/lib/dsa/phases";
import { boardText, type BoardElement } from "@/lib/interview/board";
import { DESIGN_PHASES, DESIGN_PHASE_LABELS, type DesignPhase } from "@/lib/interview/design-phases";
import { Whiteboard } from "./whiteboard";
import { McWorkspace, type McInit } from "@/components/mc/mc-workspace";

type Turn = { id: number; role: "interviewer" | "candidate"; content: string; code?: string | null };

export type RoomProps = {
  id: string;
  title: string;
  personaName: string;
  personaId?: string;
  mode: "mock" | "practice";
  inputMode: "text" | "voice";
  coding: boolean;
  durationMin: number;
  startedAt: string;
  initialTurns: Turn[];
  /** Present for the DSA live-coding round. */
  dsa?: DsaInit;
  /** Server speech-to-text (Whisper on Groq) is configured. */
  sttServer?: boolean;
  /** System design rounds: an Excalidraw whiteboard the interviewer can read. */
  board?: { initialElements: Record<string, unknown>[] };
  /** Machine coding round: problem, files and the server-driven build/review clock. */
  mc?: McInit;
  /** System design (HLD) round: the server-driven phase, shown as a stepper. */
  designPhase?: string | null;
};

type Net = "idle" | "thinking" | "error";

export function InterviewRoom(p: RoomProps) {
  return p.dsa ? <DsaRoom {...p} dsa={p.dsa} /> : <RoomCore {...p} />;
}

function DsaRoom(p: RoomProps & { dsa: DsaInit }) {
  const ws = useDsaWorkspace(p.id, p.dsa);
  return <RoomCore {...p} ws={ws} />;
}

function RoomCore({ ws, ...p }: RoomProps & { ws?: DsaWorkspace }) {
  const router = useRouter();
  const wsRef = useRef(ws);
  useEffect(() => { wsRef.current = ws; });
  const [turns, setTurns] = useState<Turn[]>(p.initialTurns);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState(() => [...p.initialTurns].reverse().find((t) => t.code)?.code ?? "");
  const [showCode, setShowCode] = useState(p.coding);
  const boardEls = useRef<readonly BoardElement[]>([]);
  const onBoardElements = useCallback((els: readonly BoardElement[]) => { boardEls.current = els; }, []);
  const boardPayload = () => (p.board ? { board: boardText(boardEls.current) || null } : {});
  const [pane, setPane] = useState<"board" | "code">("board");
  const [designPhase, setDesignPhase] = useState<string | null>(p.designPhase ?? null);
  const isDesign = p.designPhase !== undefined;
  const [net, setNet] = useState<Net>("idle");
  /** The interviewer's reply while it streams in (null when nothing is streaming). */
  const [liveText, setLiveText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [voiceOut, setVoiceOut] = useState(p.inputMode === "voice");
  const [autoListen, setAutoListen] = useState(p.inputMode === "voice");
  const [paused, setPaused] = useState(false);
  const [wrapUp, setWrapUp] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState<null | "evaluating" | "failed" | "abandoned">(null);
  const [endMsg, setEndMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The coding round needs the width for three panes, so it starts in focus mode (sidebar hidden).
  const [focusMode, setFocusMode] = useState(Boolean(ws) || Boolean(p.board) || Boolean(p.mc));
  // Machine coding: unsaved edits are flushed before every answer so the interviewer reads the latest code.
  const mcFlush = useRef<(() => Promise<void>) | null>(null);
  const registerMcFlush = useCallback((fn: () => Promise<void>) => { mcFlush.current = fn; }, []);
  const [showKeys, setShowKeys] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const spokenRef = useRef<number>(p.initialTurns.at(-1)?.id ?? 0);

  const sendRef = useRef<() => void>(() => {});
  const voice = useVoice({
    sttServer: Boolean(p.sttServer), enabled: true,
    onText: useCallback((text: string) => {
      if (text) { setDraft((d) => (d ? d.trimEnd() + " " : "") + text); wsRef.current?.touch(); }
    }, []),
    onAutoSend: useCallback(() => sendRef.current(), []),
  });
  const { mic, tts } = voice;
  const [showVoice, setShowVoice] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [reportReady, setReportReady] = useState(false);
  // Open the report once it's ready — after the spoken summary finishes, so it isn't cut off.
  useEffect(() => { if (reportReady && !tts.speaking) router.push(`/interview/${p.id}/report`); }, [reportReady, tts.speaking, router, p.id]);
  const pastedRef = useRef(0); // characters pasted into the current answer

  // Clock
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(p.startedAt).getTime()) / 1000));
  const remaining = p.durationMin * 60 - elapsed;
  const fmt = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

  // Keep transcript scrolled to latest
  useEffect(() => { listRef.current?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [turns, net, liveText]);

  const noteAi = voice.noteAi;
  // What happens after the interviewer finishes speaking (kept in a ref so the stream reader sees the latest).
  const afterSpeech = useRef<() => void>(() => {});
  const canSpeak = useRef(false);
  useEffect(() => {
    canSpeak.current = voiceOut && tts.supported && !paused;
    afterSpeech.current = () => { if (autoListen && mic.supported) mic.start(); else if (mic.state !== "listening") mic.stop(); };
  });

  /** Reads the streamed reply: show it as it arrives, start speaking at the first sentence. */
  const readStream = useCallback(async (res: Response, t0: number): Promise<boolean> => {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", speakingStarted = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let sep: number;
      while ((sep = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, sep); buf = buf.slice(sep + 2);
        const event = /^event: (\w+)/m.exec(block)?.[1];
        const raw = /^data: (.*)$/m.exec(block)?.[1];
        if (!event || !raw) continue;
        const data = JSON.parse(raw);
        if (event === "delta") {
          if (!text) noteAi(Date.now() - t0); // time to the interviewer's first words
          text += data.text;
          setLiveText(text);
          if (canSpeak.current) {
            if (!speakingStarted) {
              speakingStarted = true;
              if (p.inputMode === "voice" && voice.settings.bargeIn && mic.supported) mic.monitor();
              tts.beginSpeech(() => afterSpeech.current());
            }
            tts.pushSpeech(data.text);
          }
        } else if (event === "done") {
          const newest = data.turns?.at(-1);
          if (speakingStarted && newest) { spokenRef.current = newest.id; tts.endSpeech(); }
          setLiveText(null);
          setTurns(data.turns);
          if (data.phase) { if (wsRef.current) wsRef.current.setPhase(data.phase as Phase); else if (isDesign) setDesignPhase(data.phase); }
          if (data.shouldEnd) setWrapUp(true);
          setNet("idle");
          return true;
        } else if (event === "error") {
          if (speakingStarted) tts.cancel();
          setLiveText(null);
          if (data.turns) setTurns(data.turns);
          setNet("error"); setError(data.error ?? "Something went wrong."); setRetryable(Boolean(data.retryable));
          return false;
        }
      }
    }
    setLiveText(null);
    setNet("error"); setError("The connection dropped while the interviewer was replying. Your answer is saved — press Retry."); setRetryable(true);
    return false;
  }, [noteAi, tts, mic, p.inputMode, voice.settings.bargeIn, isDesign]);

  const post = useCallback(async (body: object) => {
    setNet("thinking"); setError(null); setRetryable(false);
    try {
      const t0 = Date.now();
      const res = await fetch(`/api/interview/${p.id}/turn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok && res.body && (res.headers.get("content-type") ?? "").includes("text/event-stream")) return await readStream(res, t0);
      const data = await res.json().catch(() => ({}));
      if (res.ok) noteAi(Date.now() - t0);
      if (data.turns) setTurns(data.turns);
      if (data.phase) { if (wsRef.current) wsRef.current.setPhase(data.phase as Phase); else if (isDesign) setDesignPhase(data.phase); }
      if (typeof data.hintsUsed === "number") wsRef.current?.setHintsUsed(data.hintsUsed);
      if (!res.ok) {
        setNet("error"); setError(data.error ?? "Something went wrong."); setRetryable(Boolean(data.retryable ?? res.status >= 500));
        return false;
      }
      if (data.shouldEnd) setWrapUp(true);
      setNet("idle");
      return true;
    } catch {
      setNet("error"); setError("Connection lost. Check your network — your answer will be resent when you press Retry."); setRetryable(true);
      return false;
    }
  }, [p.id, noteAi, readStream]);

  // ── Proactive interviewer (coding round): react to long silence, a failed run/submit, or a big paste ──
  const lastNudge = useRef(0);
  const nudge = useCallback(async (reason: "idle" | "failed_run" | "paste", detail: string) => {
    const w = wsRef.current;
    if (!w || net !== "idle" || paused || liveText != null || tts.speaking || mic.userSpeaking || turns.length === 0) return;
    if (Date.now() - lastNudge.current < 120_000) return; // at most one nudge every 2 minutes (the server enforces it too)
    lastNudge.current = Date.now();
    await w.flush(true); // the interviewer sees the latest code and run results
    const t0 = Date.now();
    const res = await fetch(`/api/interview/${p.id}/turn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "nudge", reason, detail, code: w.code, language: w.language }) }).catch(() => null);
    if (res?.ok && res.body && (res.headers.get("content-type") ?? "").includes("text/event-stream")) { setNet("thinking"); await readStream(res, t0); }
    // Skipped (rate limit / nothing to react to) is silent: a nudge is never worth an error banner.
  }, [net, paused, liveText, tts.speaking, mic.userSpeaking, turns.length, p.id, readStream]);
  const nudgeRef = useRef(nudge);
  useEffect(() => { nudgeRef.current = nudge; });

  const outcome = ws?.outcome;
  useEffect(() => {
    if (outcome && outcome.status !== "accepted" && outcome.status !== "error") void nudgeRef.current("failed_run", `${outcome.kind === "submit" ? "submission" : "run"}: ${outcome.status.replace("_", " ")}, ${outcome.passed}/${outcome.total} tests`);
  }, [outcome]);
  const pasteN = ws?.bigPaste.n ?? 0;
  const pasteChars = ws?.bigPaste.chars ?? 0;
  useEffect(() => { if (pasteN > 0) void nudgeRef.current("paste", `${pasteChars} characters`); }, [pasteN, pasteChars]);
  useEffect(() => {
    if (!ws) return;
    const t = setInterval(() => {
      const w = wsRef.current;
      if (!w || !["code", "test"].includes(w.phase)) return;
      const idle = w.idleMs();
      if (idle >= 90_000) void nudgeRef.current("idle", `about ${Math.round(idle / 1000)} seconds without typing or speaking`);
    }, 15_000);
    return () => clearInterval(t);
  }, [ws]);

  // Open the interview (idempotent on reload)
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (p.initialTurns.length === 0) void post({ action: "start" }); // eslint-disable-line react-hooks/set-state-in-effect -- network kickoff
  }, [p.initialTurns.length, post]);

  // Speak each new interviewer message once, then optionally listen
  const last = turns.at(-1);
  useEffect(() => {
    if (!last || last.role !== "interviewer" || last.id <= spokenRef.current) return;
    spokenRef.current = last.id;
    if (paused) return;
    if (voiceOut && tts.supported) {
      // Voice mode: watch the mic while the interviewer talks so speaking up interrupts it (nothing is recorded).
      if (p.inputMode === "voice" && voice.settings.bargeIn && mic.supported) mic.monitor();
      tts.speak(last.content, () => { if (autoListen && mic.supported) mic.start(); else if (mic.state !== "listening") mic.stop(); });
    } else if (autoListen && mic.supported && p.inputMode === "voice") {
      mic.start();
    }
  }, [last, voiceOut, autoListen, paused, tts, mic, p.inputMode, voice.settings.bargeIn]);

  const send = async () => {
    const content = (draft + (mic.interim ? " " + mic.interim : "")).trim();
    if (!content || net === "thinking") return;
    mic.stop(); tts.cancel(); voice.cancelAutoSend();
    setDraft("");
    let ok: boolean;
    if (ws) {
      ws.touch();
      await ws.flush(true); // the interviewer sees runs/pastes/idle that happened since its last message
      ok = await post({ action: "answer", content, code: ws.code, language: ws.language, ...(pastedRef.current ? { pasted: pastedRef.current } : {}) });
    } else {
      if (p.mc) await mcFlush.current?.();
      ok = await post({ action: "answer", content, code: !p.mc && showCode && code.trim() ? code : null, ...boardPayload(), ...(pastedRef.current ? { pasted: pastedRef.current } : {}) });
    }
    if (ok) pastedRef.current = 0;
    if (!ok && !turns.some((t) => t.role === "candidate" && t.content === content)) setDraft(content);
  };

  useEffect(() => { sendRef.current = () => { void send(); }; });

  const retry = () => {
    const lastCandidate = [...turns].reverse().find((t) => t.role === "candidate");
    if (turns.length === 0) void post({ action: "start" });
    else if (turns.at(-1)?.role === "candidate" && lastCandidate) void post({ action: "answer", content: lastCandidate.content, code: ws ? ws.code : lastCandidate.code ?? null, ...(ws ? { language: ws.language } : boardPayload()) });
    else void send();
  };

  const togglePause = () => {
    if (!paused) { mic.stop(); tts.cancel(); }
    setPaused(!paused);
  };
  const togglePauseRef = useRef(togglePause);
  useEffect(() => { togglePauseRef.current = togglePause; });

  /** Builds the report with live progress stages; returns the final status body, or null to fall back to polling. */
  const streamComplete = async (): Promise<{ status?: string; error?: string; message?: string } | null> => {
    const res = await fetch(`/api/interview/${p.id}/complete`, { method: "POST", headers: { Accept: "text/event-stream" } }).catch(() => null);
    if (!res) return null;
    if (!(res.headers.get("content-type") ?? "").includes("text/event-stream") || !res.body) return res.json().catch(() => null);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) return null;
      buf += dec.decode(value, { stream: true });
      let sep: number;
      while ((sep = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, sep); buf = buf.slice(sep + 2);
        const event = /^event: (\w+)/m.exec(block)?.[1];
        const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] ?? "{}");
        if (event === "stage") setStages((xs) => [...xs, data.stage]);
        if (event === "done") return data;
      }
    }
  };

  const end = async () => {
    mic.stop(); tts.cancel(); setConfirmEnd(false); setEnding("evaluating"); setEndMsg(null); setStages([]); setSummary(null);
    // Instant spoken feedback (small, fast call) while the full report is built.
    void fetch(`/api/interview/${p.id}/summary`, { method: "POST" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d?.text) return;
      setSummary(d.text);
      if (voiceOut && tts.supported) tts.speak(d.text);
    }).catch(() => {});
    const first = await streamComplete();
    if (first?.status === "completed") { setReportReady(true); return; }
    if (first?.status === "abandoned") { setEnding("abandoned"); setEndMsg(first.message ?? "Interview ended without answers."); return; }
    if (first?.status === "evaluation_failed") { setEnding("failed"); setEndMsg(first.error ?? "Report generation failed."); return; }
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const res = await fetch(`/api/interview/${p.id}/complete`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (data.status === "completed") { setReportReady(true); return; }
        if (data.status === "abandoned") { setEnding("abandoned"); setEndMsg(data.message ?? "Interview ended without answers."); return; }
        if (data.status === "evaluation_failed") { setEnding("failed"); setEndMsg(data.error ?? "Report generation failed."); return; }
      } catch { /* network blip: keep polling */ }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setEnding("failed"); setEndMsg("The report is taking longer than expected. Refresh this page in a minute.");
  };

  // Global shortcuts: Space (hold) = push-to-talk when not typing, Esc = pause/resume, ? = cheat-sheet.
  const pttRef = useRef(false);
  useEffect(() => {
    const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT" || el.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showKeys) { e.preventDefault(); togglePauseRef.current(); return; }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") { e.preventDefault(); setShowKeys(true); }
      if (e.code === "Space" && !e.repeat && mic.supported && !paused) { e.preventDefault(); pttRef.current = true; mic.start(); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space" && pttRef.current) { pttRef.current = false; mic.stop(); } };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [mic, paused, showKeys]);

  // Focus mode hides the app chrome (sidebar/header) for a distraction-free room.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-focus-mode", focusMode);
    return () => document.documentElement.removeAttribute("data-focus-mode");
  }, [focusMode]);

  // Ctrl/Cmd+Enter sends
  const onKey = (e: React.KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void send(); } };

  const visibleTurns = turns;
  const status = paused ? "Paused" : net === "thinking" ? "Interviewer is thinking…" : tts.speaking ? "Interviewer is speaking" : mic.state === "listening" ? "Listening" : net === "error" ? "Needs attention" : "Your turn";

  if (ending) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center" role="status" aria-live="polite">
        {ending === "evaluating" && (
          <>
            {reportReady ? <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden /> : <Loader2 className="mx-auto size-8 animate-spin text-accent" aria-hidden />}
            <h2 className="mt-4 text-lg font-medium">{reportReady ? "Your report is ready" : "Building your report…"}</h2>
            {summary && (
              <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4 text-left text-sm leading-6" data-testid="spoken-summary">
                <p className="mb-1 text-xs font-medium text-muted">{p.personaName} — quick feedback</p>
                <p>{summary}</p>
              </div>
            )}
            <ol className="mt-4 space-y-1 text-left text-sm" aria-label="Report progress">
              {stages.map((st, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i < stages.length - 1 || reportReady ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden /> : <Loader2 className="size-4 shrink-0 animate-spin text-accent" aria-hidden />}
                  <span className={i < stages.length - 1 || reportReady ? "text-muted" : ""}>{st}</span>
                </li>
              ))}
            </ol>
            {!stages.length && !reportReady && <p className="mt-2 text-sm text-muted">Scoring every answer against the rubric with evidence from your transcript. Usually 20–60 seconds.</p>}
            {reportReady && <Button className="mt-6" onClick={() => router.push(`/interview/${p.id}/report`)}>View report now</Button>}
          </>
        )}
        {ending === "abandoned" && (<><h2 className="text-lg font-medium">Interview ended</h2><p className="mt-2 text-sm text-muted">{endMsg}</p><Button className="mt-6" onClick={() => router.push("/interview/new")}>Start a new interview</Button></>)}
        {ending === "failed" && (<><h2 className="text-lg font-medium">Report not ready</h2><p className="mt-2 text-sm text-muted">{endMsg}</p><Button className="mt-6" onClick={end}><RotateCcw className="size-4" aria-hidden /> Retry report</Button></>)}
      </div>
    );
  }

  const headerEl = (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3">
        {p.personaId && <InterviewerAvatar persona={p.personaId} size={36} className="hidden sm:block" />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{p.title}</h1>
          <p className="truncate text-xs text-muted">{p.personaName} · {p.mode === "mock" ? "Mock interview (no hints)" : "Practice mode"}</p>
        </div>
        <span className={cn("font-mono text-lg font-medium tabular-nums", remaining < 0 ? "text-danger" : remaining < 120 ? "text-warning" : "text-text")} aria-label="Time remaining">{fmt(remaining)}</span>
        <span className={cn("flex items-center gap-1.5 text-xs", mic.state === "listening" ? "text-success" : mic.state === "denied" || mic.state === "error" ? "text-danger" : "text-muted")}>
          {mic.state === "listening" ? <Mic className="size-3.5" aria-hidden /> : <MicOff className="size-3.5" aria-hidden />}
          <span className="hidden sm:inline">{mic.state === "listening" ? "Mic live" : mic.state === "denied" ? "Mic blocked" : mic.state === "unsupported" ? "No mic support" : "Mic off"}</span>
        </span>
        {p.inputMode === "voice" && (voice.latency.aiMs != null || voice.latency.sttMs != null || voice.latency.ttsMs != null) && (
          <span className="hidden items-center gap-1 font-mono text-[11px] text-muted md:flex" title="Measured on this device: speech-to-text after you stop talking, the interviewer's reply, and time to the first spoken word" data-testid="latency">
            <Gauge className="size-3.5" aria-hidden />
            {[["STT", voice.latency.sttMs], ["AI", voice.latency.aiMs], ["Voice", voice.latency.ttsMs]].filter(([, v]) => v != null).map(([k, v]) => `${k} ${((v as number) / 1000).toFixed(1)}s`).join(" · ")}
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowVoice(true)} aria-label="Voice settings"><SlidersHorizontal className="size-4" aria-hidden /></Button>
        <Button size="sm" variant="ghost" onClick={() => setShowKeys(true)} aria-label="Keyboard shortcuts" className="hidden sm:inline-flex"><Keyboard className="size-4" aria-hidden /></Button>
        <Button size="sm" variant="ghost" onClick={() => setFocusMode(!focusMode)} aria-pressed={focusMode} aria-label={focusMode ? "Exit focus mode" : "Focus mode"}>
          {focusMode ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
        </Button>
        <Badge tone={net === "error" ? "warning" : mic.state === "listening" ? "success" : "accent"} aria-live="polite">
          {(net === "thinking" || tts.speaking || mic.state === "listening") && <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
          {status}
        </Badge>
      </div>
  );
  const transcriptEl = (
        <section aria-label="Interview transcript" className="flex min-h-0 flex-col rounded-xl border border-border bg-surface">
          <ol ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {visibleTurns.map((t) => (
              <li key={t.id} className={cn("max-w-[90%] rounded-xl px-4 py-3 text-sm leading-6", t.role === "interviewer" ? (/^\[Hint[^\]]*\]/.test(t.content) ? "border border-warning/40 bg-warning/10" : "bg-surface-2") : "ml-auto bg-accent-soft")}>
                <p className="mb-1 text-xs font-medium text-muted">{t.role === "interviewer" ? (/^\[Hint[^\]]*\]/.test(t.content) ? (t.content.match(/^\[(Hint[^\]]*)\]/)?.[1] ?? "Hint") : p.personaName) : "You"}</p>
                <p className="whitespace-pre-wrap">{t.content.replace(/^\[Hint[^\]]*\]\s*/, "")}</p>
                {t.code && !ws && <p className="mt-1 text-xs text-muted">+ code from editor</p>}
              </li>
            ))}
            {liveText != null ? (
              <li data-streaming="true" className="max-w-[90%] rounded-xl bg-surface-2 px-4 py-3 text-sm leading-6">
                <p className="mb-1 text-xs font-medium text-muted">{p.personaName}</p>
                <p className="whitespace-pre-wrap">{liveText}<span aria-hidden className="ml-0.5 inline-block h-3.5 w-[6px] animate-pulse bg-accent align-middle" /></p>
              </li>
            ) : net === "thinking" && (
              <li className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> {turns.length === 0 ? "The interviewer is joining…" : "Thinking…"}</li>
            )}
          </ol>
          {wrapUp && (
            <div className="border-t border-border bg-accent-soft px-4 py-2 text-sm">The interviewer has wrapped up. <button className="font-medium text-accent underline" onClick={() => setConfirmEnd(true)}>End and get your report</button></div>
          )}
        </section>
  );
  const errorsEl = (error || mic.error) ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <span className="flex-1">{error ?? mic.error}</span>
          {error && retryable && <Button size="sm" variant="secondary" onClick={retry}><RotateCcw className="size-4" aria-hidden /> Retry</Button>}
        </div>
  ) : null;
  const composerEl = (
      <div className="rounded-xl border border-border bg-surface p-3">
        <label htmlFor="answer" className="sr-only">Your answer</label>
        <textarea
          id="answer" rows={3} value={draft + (mic.interim ? (draft ? " " : "") + mic.interim : "")}
          onChange={(e) => { if (!mic.interim) setDraft(e.target.value); }}
          onKeyDown={onKey} disabled={paused}
          onPaste={(e) => { pastedRef.current += e.clipboardData.getData("text").length; }}
          placeholder={mic.state === "listening" ? "Listening… speak your answer. You can edit the text before sending." : "Type your answer (Ctrl/⌘ + Enter to send)"}
          className="w-full resize-none bg-transparent text-sm leading-6 focus:outline-none disabled:opacity-50"
        />
        {voice.autoSendIn != null && (
          <div role="status" className="mt-1 flex items-center gap-2 rounded-md bg-accent-soft px-2 py-1 text-xs" data-testid="auto-send">
            <span>Sending in {voice.autoSendIn.toFixed(1)}s — keep talking to continue</span>
            <button type="button" onClick={voice.cancelAutoSend} className="ml-auto font-medium text-accent underline">Don&apos;t send</button>
          </div>
        )}
        {mic.transcribing && <p role="status" className="mt-1 text-xs text-muted">Transcribing…</p>}
        {tts.kokoroPct != null && tts.kokoroPct < 100 && <p role="status" className="mt-1 text-xs text-muted">Loading the natural voice on your device… {tts.kokoroPct}% (one-time download, about 90 MB)</p>}
        {voice.sttPct != null && voice.sttPct < 100 && <p role="status" className="mt-1 text-xs text-muted">Loading on-device speech recognition… {voice.sttPct}% (one-time download)</p>}
        {tts.note && <p className="mt-1 text-xs text-warning">{tts.note}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {mic.supported ? (
            <>
            <Button
              size="sm" variant={mic.state === "listening" ? "primary" : "secondary"} disabled={paused || mic.state === "denied"}
              onClick={() => (mic.state === "listening" ? mic.stop() : mic.start())}
              aria-pressed={mic.state === "listening"} aria-label={mic.state === "listening" ? "Stop microphone" : "Start microphone"}
            >
              {mic.state === "listening" ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4" aria-hidden />}
              {mic.state === "listening" ? "Mic on" : mic.state === "denied" ? "Mic blocked" : "Mic off"}
            </Button>
            {mic.state === "listening" && <LevelMeter level={mic.level} active={mic.userSpeaking} />}
            </>
          ) : p.inputMode === "voice" ? (
            <span className="text-xs text-muted">Voice input isn&apos;t supported in this browser (try Chrome, Edge or Safari) — type instead.</span>
          ) : null}
          {tts.supported && (
            <Button size="sm" variant="ghost" onClick={() => { if (voiceOut) tts.cancel(); setVoiceOut(!voiceOut); }} aria-pressed={voiceOut} aria-label={voiceOut ? "Mute interviewer voice" : "Unmute interviewer voice"}>
              {voiceOut ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
              <span className="hidden sm:inline">{voiceOut ? "Voice on" : "Voice off"}</span>
            </Button>
          )}
          {mic.supported && (
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={autoListen} onChange={(e) => setAutoListen(e.target.checked)} className="accent-[var(--accent)]" /> Auto-listen
            </label>
          )}
          {!ws && <Button size="sm" variant="ghost" onClick={() => setShowCode(!showCode)} aria-pressed={showCode}><Code2 className="size-4" aria-hidden /><span className="hidden sm:inline">Editor</span></Button>}
          {p.mode === "practice" && (
            <Button size="sm" variant="ghost" disabled={net === "thinking" || paused || turns.length === 0 || (ws ? ws.hintsUsed >= 3 : false)} onClick={() => void post({ action: "hint" })}><Lightbulb className="size-4" aria-hidden /> Hint{ws ? ` ${ws.hintsUsed}/3` : ""}</Button>
          )}
          <Button size="sm" variant="ghost" onClick={togglePause} aria-pressed={paused}>{paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}<span className="hidden sm:inline">{paused ? "Resume" : "Pause"}</span></Button>
          <div className="ml-auto flex items-center gap-2">
            {confirmEnd ? (
              <>
                <span className="text-xs text-muted">End now?</span>
                <Button size="sm" variant="danger" onClick={end}>Yes, end</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(false)}>Cancel</Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirmEnd(true)}><Square className="size-4" aria-hidden /> End</Button>
            )}
            <Button size="sm" onClick={send} disabled={paused || net === "thinking" || !(draft + mic.interim).trim()}><Send className="size-4" aria-hidden /> Send</Button>
          </div>
        </div>
        {p.inputMode === "voice" && (
          <p className="mt-2 text-[11px] text-muted">
            {voice.settings.stt === "whisper" && p.sttServer ? "Listening with Whisper: each answer's audio is sent to Groq for transcription and not stored by Interview OS." : voice.settings.stt === "local" ? "Listening with Whisper on your device: audio never leaves it." : "Listening with your browser's speech recognition (in Chrome, Google's speech service)."}{" "}
            {voice.settings.tts === "kokoro" ? "The interviewer's natural voice runs on your device." : "The interviewer uses your browser's voice."}{" "}
            {voice.settings.autoSend ? "Your answer sends after a pause (you can cancel)." : "Press Send when you're done."} Interview OS stores only the text transcript. <Link href="/mic-check" className="underline" target="_blank">Mic check</Link>
          </p>
        )}
      </div>
  );
  const voiceDialog = <VoiceSettingsDialog open={showVoice} onClose={() => setShowVoice(false)} voice={voice} />;
  const keysDialog = (
      <Dialog open={showKeys} onClose={() => setShowKeys(false)} title="Keyboard shortcuts">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {[["Hold Space", "Push-to-talk (when not typing)"], ["Ctrl/⌘ + Enter", "Send your answer"], ["Esc", "Pause / resume"], ["?", "Show this sheet"], ...(ws ? [["Ctrl/⌘ + '", "Run the examples"], ["Ctrl/⌘ + Shift + Enter", "Submit (hidden tests)"], ["Tab (in editor)", "Indent"]] : [["Tab (in editor)", "Insert two spaces"]])].map(([k, d]) => (
            <div key={k} className="contents"><dt><kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{k}</kbd></dt><dd className="text-muted">{d}</dd></div>
          ))}
        </dl>
      </Dialog>
  );

  if (ws) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] min-h-[36rem] flex-col gap-3 lg:h-[calc(100dvh-4rem)]">
        {headerEl}
        <PhaseStepper phase={ws.phase} />
        <SplitPanes panes={[
          { id: "problem", label: "Problem", node: <ProblemPanel problem={ws.problem} /> },
          { id: "code", label: "Code", node: <EditorPanel ws={ws} disabled={paused} /> },
          { id: "chat", label: "Interviewer", node: (
            <div className="flex h-full min-h-0 flex-col gap-3">
              {transcriptEl}
              {errorsEl}
              {composerEl}
            </div>
          ) },
        ]} />
        {keysDialog}
        {voiceDialog}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[32rem] flex-col gap-3 lg:h-[calc(100dvh-4rem)]">
      {headerEl}
      {isDesign && <DesignStepper phase={designPhase} />}
      <div className={cn("grid min-h-0 flex-1 gap-3", p.board || p.mc ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : showCode && "lg:grid-cols-2")}>
        {transcriptEl}
        {p.mc && <McWorkspace interviewId={p.id} init={p.mc} registerFlush={registerMcFlush} />}
        {p.board && (
          <div className="flex min-h-0 flex-col gap-2">
            {showCode && (
              <div role="tablist" aria-label="Work area" className="flex gap-1 text-sm">
                {(["board", "code"] as const).map((k) => (
                  <button key={k} type="button" role="tab" aria-selected={pane === k} onClick={() => setPane(k)} className={cn("rounded-md px-3 py-1", pane === k ? "bg-accent-soft text-text" : "text-muted hover:text-text")}>{k === "board" ? "Whiteboard" : "Code"}</button>
                ))}
              </div>
            )}
            <div className={cn("min-h-0 flex-1", pane !== "board" && showCode && "hidden")}>
              <Whiteboard interviewId={p.id} initialElements={p.board.initialElements} onElements={onBoardElements} footer={pane === "board" || !showCode ? composerEl : undefined} />
            </div>
          </div>
        )}
        {showCode && !p.mc && (!p.board || pane === "code") && (
          <section aria-label="Code editor" className="flex min-h-48 flex-col rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted">
              <span className="flex items-center gap-1 font-mono">editor<span aria-hidden className="inline-block h-3.5 w-[7px] animate-[var(--animate-caret)] bg-accent" /><span className="ml-2 font-sans">sent with your next answer</span></span>
              <span>{code.split("\n").length} lines</span>
            </div>
            <textarea
              value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} aria-label="Code"
              onKeyDown={(e) => {
                if (e.key === "Tab") { e.preventDefault(); const el = e.currentTarget; const s = el.selectionStart; setCode(code.slice(0, s) + "  " + code.slice(el.selectionEnd)); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; }); }
              }}
              className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-5 focus:outline-none"
              placeholder="// Write your solution here"
            />
          </section>
        )}
      </div>
      {errorsEl}
      {!(p.board && (pane === "board" || !showCode)) && composerEl}
      {keysDialog}
      {voiceDialog}
    </div>
  );
}

/** Phase stepper for the system design round (the server moves it on a timer). */
function DesignStepper({ phase }: { phase: string | null }) {
  const at = phase ? DESIGN_PHASES.indexOf(phase as DesignPhase) : 0;
  return (
    <ol className="flex items-center gap-1 overflow-x-auto text-[11px]" aria-label="Interview phase" data-testid="design-phases">
      {DESIGN_PHASES.map((ph, i) => (
        <li key={ph} aria-current={i === at ? "step" : undefined}
          className={cn("whitespace-nowrap rounded-full px-2 py-0.5", i === at ? "bg-accent text-accent-fg font-semibold" : i < at ? "text-success" : "text-muted")}>
          {i < at && "✓ "}{DESIGN_PHASE_LABELS[ph]}
        </li>
      ))}
    </ol>
  );
}
