"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Volume2, VolumeX, Pause, Play, Square, Send, Lightbulb, RotateCcw, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSpeechRecognition, useSpeechSynthesis } from "./use-speech";

type Turn = { id: number; role: "interviewer" | "candidate"; content: string; code?: string | null };

export type RoomProps = {
  id: string;
  title: string;
  personaName: string;
  mode: "mock" | "practice";
  inputMode: "text" | "voice";
  coding: boolean;
  durationMin: number;
  startedAt: string;
  initialTurns: Turn[];
};

type Net = "idle" | "thinking" | "error";

export function InterviewRoom(p: RoomProps) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(p.initialTurns);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState(() => [...p.initialTurns].reverse().find((t) => t.code)?.code ?? "");
  const [showCode, setShowCode] = useState(p.coding);
  const [net, setNet] = useState<Net>("idle");
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
  const listRef = useRef<HTMLOListElement>(null);
  const spokenRef = useRef<number>(p.initialTurns.at(-1)?.id ?? 0);

  const tts = useSpeechSynthesis();
  const mic = useSpeechRecognition(useCallback((text: string) => {
    if (text) setDraft((d) => (d ? d.trimEnd() + " " : "") + text);
  }, []));

  // Clock
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(p.startedAt).getTime()) / 1000));
  const remaining = p.durationMin * 60 - elapsed;
  const fmt = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

  // Keep transcript scrolled to latest
  useEffect(() => { listRef.current?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [turns, net]);

  const post = useCallback(async (body: object) => {
    setNet("thinking"); setError(null); setRetryable(false);
    try {
      const res = await fetch(`/api/interview/${p.id}/turn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (data.turns) setTurns(data.turns);
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
  }, [p.id]);

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
      tts.speak(last.content, () => { if (autoListen && mic.supported) mic.start(); });
    } else if (autoListen && mic.supported && p.inputMode === "voice") {
      mic.start();
    }
  }, [last, voiceOut, autoListen, paused, tts, mic, p.inputMode]);

  const send = async () => {
    const content = (draft + (mic.interim ? " " + mic.interim : "")).trim();
    if (!content || net === "thinking") return;
    mic.stop(); tts.cancel();
    setDraft("");
    const ok = await post({ action: "answer", content, code: showCode && code.trim() ? code : null });
    if (!ok && !turns.some((t) => t.role === "candidate" && t.content === content)) setDraft(content);
  };

  const retry = () => {
    const lastCandidate = [...turns].reverse().find((t) => t.role === "candidate");
    if (turns.length === 0) void post({ action: "start" });
    else if (turns.at(-1)?.role === "candidate" && lastCandidate) void post({ action: "answer", content: lastCandidate.content, code: lastCandidate.code ?? null });
    else void send();
  };

  const togglePause = () => {
    if (!paused) { mic.stop(); tts.cancel(); }
    setPaused(!paused);
  };

  const end = async () => {
    mic.stop(); tts.cancel(); setConfirmEnd(false); setEnding("evaluating"); setEndMsg(null);
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const res = await fetch(`/api/interview/${p.id}/complete`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (data.status === "completed") { router.push(`/interview/${p.id}/report`); return; }
        if (data.status === "abandoned") { setEnding("abandoned"); setEndMsg(data.message ?? "Interview ended without answers."); return; }
        if (data.status === "evaluation_failed") { setEnding("failed"); setEndMsg(data.error ?? "Report generation failed."); return; }
      } catch { /* network blip: keep polling */ }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setEnding("failed"); setEndMsg("The report is taking longer than expected. Refresh this page in a minute.");
  };

  // Ctrl/Cmd+Enter sends
  const onKey = (e: React.KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void send(); } };

  const visibleTurns = turns;
  const status = paused ? "Paused" : net === "thinking" ? "Interviewer is thinking…" : tts.speaking ? "Interviewer is speaking" : mic.state === "listening" ? "Listening" : net === "error" ? "Needs attention" : "Your turn";

  if (ending) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center" role="status" aria-live="polite">
        {ending === "evaluating" && (<><Loader2 className="mx-auto size-8 animate-spin text-accent" aria-hidden /><h2 className="mt-4 text-lg font-medium">Evaluating your interview…</h2><p className="mt-2 text-sm text-muted">Scoring every answer against the rubric with evidence from your transcript. This usually takes 20–60 seconds.</p></>)}
        {ending === "abandoned" && (<><h2 className="text-lg font-medium">Interview ended</h2><p className="mt-2 text-sm text-muted">{endMsg}</p><Button className="mt-6" onClick={() => router.push("/interview/new")}>Start a new interview</Button></>)}
        {ending === "failed" && (<><h2 className="text-lg font-medium">Report not ready</h2><p className="mt-2 text-sm text-muted">{endMsg}</p><Button className="mt-6" onClick={end}><RotateCcw className="size-4" aria-hidden /> Retry report</Button></>)}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[32rem] flex-col gap-3 lg:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{p.title}</h1>
          <p className="truncate text-xs text-muted">{p.personaName} · {p.mode === "mock" ? "Mock interview (no hints)" : "Practice mode"}</p>
        </div>
        <span className={cn("font-mono text-sm tabular-nums", remaining < 0 ? "text-danger" : remaining < 120 ? "text-warning" : "text-muted")} aria-label="Time remaining">{fmt(remaining)}</span>
        <Badge tone={net === "error" ? "warning" : mic.state === "listening" ? "success" : "accent"} aria-live="polite">
          {(net === "thinking" || tts.speaking || mic.state === "listening") && <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
          {status}
        </Badge>
      </div>

      <div className={cn("grid min-h-0 flex-1 gap-3", showCode && "lg:grid-cols-2")}>
        {/* Transcript */}
        <section aria-label="Interview transcript" className="flex min-h-0 flex-col rounded-xl border border-border bg-surface">
          <ol ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {visibleTurns.map((t) => (
              <li key={t.id} className={cn("max-w-[90%] rounded-xl px-4 py-3 text-sm leading-6", t.role === "interviewer" ? (t.content.startsWith("[Hint]") ? "border border-warning/40 bg-warning/10" : "bg-surface-2") : "ml-auto bg-accent-soft")}>
                <p className="mb-1 text-xs font-medium text-muted">{t.role === "interviewer" ? (t.content.startsWith("[Hint]") ? "Hint" : p.personaName) : "You"}</p>
                <p className="whitespace-pre-wrap">{t.content.replace(/^\[Hint\]\s*/, "")}</p>
                {t.code && <p className="mt-1 text-xs text-muted">+ code from editor</p>}
              </li>
            ))}
            {net === "thinking" && (
              <li className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> {turns.length === 0 ? "The interviewer is joining…" : "Thinking…"}</li>
            )}
          </ol>
          {wrapUp && (
            <div className="border-t border-border bg-accent-soft px-4 py-2 text-sm">The interviewer has wrapped up. <button className="font-medium text-accent underline" onClick={() => setConfirmEnd(true)}>End and get your report</button></div>
          )}
        </section>

        {/* Code panel */}
        {showCode && (
          <section aria-label="Code editor" className="flex min-h-48 flex-col rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted">
              <span>Editor — sent with your next answer</span>
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

      {/* Errors */}
      {(error || mic.error) && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <span className="flex-1">{error ?? mic.error}</span>
          {error && retryable && <Button size="sm" variant="secondary" onClick={retry}><RotateCcw className="size-4" aria-hidden /> Retry</Button>}
        </div>
      )}

      {/* Composer */}
      <div className="rounded-xl border border-border bg-surface p-3">
        <label htmlFor="answer" className="sr-only">Your answer</label>
        <textarea
          id="answer" rows={3} value={draft + (mic.interim ? (draft ? " " : "") + mic.interim : "")}
          onChange={(e) => { if (!mic.interim) setDraft(e.target.value); }}
          onKeyDown={onKey} disabled={paused}
          placeholder={mic.state === "listening" ? "Listening… speak your answer. You can edit the text before sending." : "Type your answer (Ctrl/⌘ + Enter to send)"}
          className="w-full resize-none bg-transparent text-sm leading-6 focus:outline-none disabled:opacity-50"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {mic.supported ? (
            <Button
              size="sm" variant={mic.state === "listening" ? "primary" : "secondary"} disabled={paused || mic.state === "denied"}
              onClick={() => (mic.state === "listening" ? mic.stop() : mic.start())}
              aria-pressed={mic.state === "listening"} aria-label={mic.state === "listening" ? "Stop microphone" : "Start microphone"}
            >
              {mic.state === "listening" ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4" aria-hidden />}
              {mic.state === "listening" ? "Mic on" : mic.state === "denied" ? "Mic blocked" : "Mic off"}
            </Button>
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
          <Button size="sm" variant="ghost" onClick={() => setShowCode(!showCode)} aria-pressed={showCode}><Code2 className="size-4" aria-hidden /><span className="hidden sm:inline">Editor</span></Button>
          {p.mode === "practice" && (
            <Button size="sm" variant="ghost" disabled={net === "thinking" || paused || turns.length === 0} onClick={() => void post({ action: "hint" })}><Lightbulb className="size-4" aria-hidden /> Hint</Button>
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
          <p className="mt-2 text-[11px] text-muted">Turn-based voice using your browser&apos;s speech recognition and text-to-speech — not a real-time voice model. InterviewOS stores only the text transcript, never audio.</p>
        )}
      </div>
    </div>
  );
}
