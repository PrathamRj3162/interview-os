"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition, type MicState } from "@/components/interview/use-speech";
import { createVad, rmsOf } from "@/lib/voice/vad";
import { splitSentences } from "@/lib/voice/sentences";
import { loadKokoro, synthKokoro } from "./kokoro";
import { loadLocalWhisper, transcribeLocal } from "./whisper-local";

export type VoiceSettings = {
  /** browser = Web Speech API · local = Whisper on this device · whisper = Whisper on the server (Groq key needed). */
  stt: "browser" | "local" | "whisper";
  tts: "browser" | "kokoro";
  /** Send automatically after you stop talking (with a short cancellable countdown). */
  autoSend: boolean;
  /** How long a pause counts as "done talking". */
  silenceMs: number;
  /** Talking over the interviewer stops its voice. */
  bargeIn: boolean;
  deviceId: string | null;
};
export const DEFAULT_VOICE: VoiceSettings = { stt: "browser", tts: "browser", autoSend: true, silenceMs: 1400, bargeIn: true, deviceId: null };
const KEY = "ios-voice-settings";
const AUTO_SEND_MS = 1500;

export type Latency = { sttMs: number | null; aiMs: number | null; ttsMs: number | null };

function loadSettings(): VoiceSettings {
  // Browsers without built-in recognition (e.g. Firefox) default to on-device Whisper.
  const hasSR = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const base = hasSR ? DEFAULT_VOICE : { ...DEFAULT_VOICE, stt: "local" as const };
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return base; }
}

/**
 * Voice layer for the interview room:
 * - Listening: browser speech recognition, or Whisper on the server when configured (audio is sent only then).
 * - VAD on the same microphone: level meter, end-of-turn detection (auto-send countdown) and barge-in.
 * - Speaking: browser voices or the optional in-browser Kokoro model, sentence by sentence so audio starts early.
 * - Latency of each stage, measured on this device.
 */
export function useVoice(opts: { sttServer: boolean; onText: (text: string) => void; onAutoSend: () => void; enabled: boolean }) {
  const [settings, setSettingsState] = useState<VoiceSettings>(DEFAULT_VOICE);
  useEffect(() => { setSettingsState(loadSettings()); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- restore per-device settings after hydration
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; });
  const setSettings = useCallback((patch: Partial<VoiceSettings>) => {
    setSettingsState((s) => { const n = { ...s, ...patch }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  }, []);
  // Record-and-transcribe mode (Whisper on the server or on this device) instead of live browser recognition.
  const useWhisper = (opts.sttServer && settings.stt === "whisper") || settings.stt === "local";
  const [sttPct, setSttPct] = useState<number | null>(null);

  const cb = useRef(opts);
  useEffect(() => { cb.current = opts; });

  const [latency, setLatency] = useState<Latency>({ sttMs: null, aiMs: null, ttsMs: null });
  const vadEndAt = useRef<number | null>(null);

  // ── Browser speech recognition (also the fallback) ──
  const sr = useSpeechRecognition(useCallback((text: string) => {
    if (vadEndAt.current) { const ms = Date.now() - vadEndAt.current; if (ms < 6000) setLatency((l) => ({ ...l, sttMs: ms })); vadEndAt.current = null; }
    cb.current.onText(text);
  }, []));

  // ── Microphone + VAD ──
  const [level, setLevel] = useState(0);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [autoSendIn, setAutoSendIn] = useState<number | null>(null);
  // Start downloading the on-device models as soon as they're chosen, not at the first answer.
  useEffect(() => {
    if (settings.stt !== "local") return;
    setSttPct((p) => p ?? 0); // eslint-disable-line react-hooks/set-state-in-effect -- progress of a background download
    loadLocalWhisper((p) => setSttPct(p)).then(() => setSttPct(100)).catch(() => { setSttPct(null); setMicError("On-device speech recognition couldn't load (offline or blocked). Switch the listening engine in voice settings."); });
  }, [settings.stt]);
  const media = useRef<{ stream: MediaStream; ctx: AudioContext; timer: number; rec: MediaRecorder | null } | null>(null);
  const vad = useRef(createVad());
  const autoTimer = useRef<number | null>(null);
  const ttsSpeaking = useRef(false);

  const cancelAutoSend = useCallback(() => {
    if (autoTimer.current) { clearInterval(autoTimer.current); autoTimer.current = null; }
    setAutoSendIn(null);
  }, []);

  const scheduleAutoSend = useCallback(() => {
    if (!settingsRef.current.autoSend) return;
    cancelAutoSend();
    const until = Date.now() + AUTO_SEND_MS;
    setAutoSendIn(AUTO_SEND_MS / 1000);
    autoTimer.current = window.setInterval(() => {
      const left = until - Date.now();
      if (left <= 0) { cancelAutoSend(); cb.current.onAutoSend(); }
      else setAutoSendIn(Math.ceil(left / 100) / 10);
    }, 100);
  }, [cancelAutoSend]);

  const transcribe = useCallback(async (blob: Blob) => {
    if (blob.size < 2000) return; // a click or a breath
    setTranscribing(true);
    const t0 = Date.now();
    try {
      if (settingsRef.current.stt === "local") {
        const text = await transcribeLocal(blob);
        setLatency((l) => ({ ...l, sttMs: Date.now() - t0 }));
        if (text) { cb.current.onText(text); scheduleAutoSend(); }
        return;
      }
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      const res = await fetch("/api/voice/stt", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMicError(data.error ?? "Speech-to-text failed."); return; }
      setLatency((l) => ({ ...l, sttMs: Date.now() - t0 }));
      if (data.text) { cb.current.onText(data.text); scheduleAutoSend(); }
    } catch { setMicError(settingsRef.current.stt === "local" ? "On-device transcription failed. You can keep typing." : "Speech-to-text failed (network). You can keep typing."); }
    finally { setTranscribing(false); }
  }, [scheduleAutoSend]);

  const stopTts = useRef<() => void>(() => {});
  const useWhisperRef = useRef(useWhisper);
  useEffect(() => { useWhisperRef.current = useWhisper; });
  /** True while the candidate means to answer (mic "on"); false while only monitoring for barge-in. */
  const armed = useRef(false);

  const stopMic = useCallback(() => {
    const m = media.current;
    media.current = null;
    if (m) {
      clearInterval(m.timer);
      if (m.rec && m.rec.state !== "inactive") { m.rec.onstop = null; m.rec.stop(); }
      m.stream.getTracks().forEach((t) => t.stop());
      void m.ctx.close().catch(() => {});
    }
    vad.current.reset();
    armed.current = false;
    setLevel(0); setUserSpeaking(false); setListening(false);
  }, []);

  const restartRef = useRef<(m: NonNullable<typeof media.current>) => void>(() => {});
  const startRecorder = useCallback((m: NonNullable<typeof media.current>) => {
    if (typeof MediaRecorder === "undefined" || (m.rec && m.rec.state === "recording")) return;
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(m.stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    // Each pause ends one recording: transcribe it and start the next one while still listening.
    rec.onstop = () => { void transcribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); if (media.current === m && armed.current) restartRef.current(m); };
    rec.start();
    m.rec = rec;
  }, [transcribe]);
  useEffect(() => { restartRef.current = startRecorder; }, [startRecorder]);

  /** Begin answering on an open microphone: Whisper recorder or browser recognition. */
  const arm = useCallback(() => {
    armed.current = true;
    setListening(true);
    if (useWhisperRef.current) { if (media.current) startRecorder(media.current); }
    else sr.start();
  }, [sr, startRecorder]);

  const openMic = useCallback(async (): Promise<boolean> => {
    if (media.current) return true;
    setMicError(null);
    try {
      const s = settingsRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: s.deviceId ? { exact: s.deviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      vad.current = createVad({ endMs: s.silenceMs });
      let lastUi = 0;
      const m = { stream, ctx, timer: 0, rec: null as MediaRecorder | null };
      m.timer = window.setInterval(() => {
        an.getFloatTimeDomainData(buf);
        const r = rmsOf(buf);
        const now = performance.now();
        const ev = vad.current.push(r, now, ttsSpeaking.current);
        if (now - lastUi > 80) { lastUi = now; setLevel(Math.min(1, r * 8)); }
        if (ev === "start") {
          setUserSpeaking(true);
          cancelAutoSend();
          if (ttsSpeaking.current && settingsRef.current.bargeIn) { stopTts.current(); if (!armed.current) arm(); } // barge-in
        }
        if (ev === "end") {
          setUserSpeaking(false);
          if (!armed.current) return;
          vadEndAt.current = Date.now();
          if (useWhisperRef.current) { if (m.rec && m.rec.state === "recording") m.rec.stop(); }
          else scheduleAutoSend();
        }
      }, 30);
      media.current = m;
      return true;
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setMicError(name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser's site settings, or answer by typing." : name === "NotFoundError" ? "No microphone found." : "Couldn't open the microphone.");
      return false;
    }
  }, [cancelAutoSend, scheduleAutoSend, arm]);

  /** Listen for barge-in only (while the interviewer talks): nothing is recorded or transcribed. */
  const monitor = useCallback(() => { void openMic(); }, [openMic]);
  const micStart = useCallback(async () => { if (await openMic()) arm(); else if (!useWhisperRef.current) sr.start(); }, [openMic, arm, sr]);
  const micStop = useCallback(() => {
    // Whisper: transcribe what was said so far before closing (stop() flushes, then onstop runs once).
    const rec = media.current?.rec;
    armed.current = false;
    if (rec && rec.state === "recording") rec.stop();
    if (media.current) media.current.rec = null;
    stopMic();
    sr.stop();
    cancelAutoSend();
  }, [stopMic, sr, cancelAutoSend]);

  useEffect(() => () => { stopMic(); cancelAutoSend(); }, [stopMic, cancelAutoSend]);
  useEffect(() => { if (media.current) vad.current.setEndMs(settings.silenceMs); }, [settings.silenceMs]);

  const micState: MicState = useWhisper
    ? (micError?.includes("blocked") ? "denied" : micError ? "error" : listening ? "listening" : "off")
    : sr.state;

  // ── Speaking ──
  const [speaking, setSpeaking] = useState(false);
  const [ttsNote, setTtsNote] = useState<string | null>(null);
  const [kokoroPct, setKokoroPct] = useState<number | null>(null);
  const playCtx = useRef<AudioContext | null>(null);
  const playToken = useRef(0);
  const sources = useRef<AudioBufferSourceNode[]>([]);
  const ttsSupported = typeof window === "undefined" ? true : "speechSynthesis" in window || settings.tts === "kokoro";

  type Utterance = { token: number; t0: number; onDone?: () => void; ended: boolean; outstanding: number; first: boolean; buf: string; engine: "browser" | "kokoro"; chain: Promise<void>; at: number; slow: number };
  const cur = useRef<Utterance | null>(null);
  const cancel = useCallback(() => {
    playToken.current++;
    cur.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    for (const s of sources.current) { try { s.stop(); } catch { /* already stopped */ } }
    sources.current = [];
    ttsSpeaking.current = false;
    setSpeaking(false);
  }, []);
  useEffect(() => { stopTts.current = cancel; }, [cancel]);

  useEffect(() => {
    if (settings.tts !== "kokoro") return;
    setKokoroPct((p) => p ?? 0); // eslint-disable-line react-hooks/set-state-in-effect -- progress of a background download
    loadKokoro((p) => setKokoroPct(p)).then(() => setKokoroPct(100)).catch(() => {});
  }, [settings.tts]);

  /**
   * One spoken message, fed incrementally: sentences are queued as soon as they're complete, so speech starts
   * while the interviewer's reply is still streaming. Browser voices use the native queue; Kokoro synthesises
   * sentence i+1 while sentence i plays, and hands over to the browser voice if it can't keep up.
   */

  const maybeDone = useCallback((u: Utterance) => {
    if (!u.ended || u.outstanding > 0 || u.token !== playToken.current) return;
    cur.current = null; ttsSpeaking.current = false; setSpeaking(false); sources.current = [];
    u.onDone?.();
  }, []);
  const markFirst = useCallback((u: Utterance) => {
    if (!u.first || u.token !== playToken.current) return;
    u.first = false;
    setLatency((l) => ({ ...l, ttsMs: Math.round(performance.now() - u.t0) }));
  }, []);

  const enqueueBrowser = useCallback((u: Utterance, chunk: string) => {
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith("en") && /natural|neural|google|premium|enhanced/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    const x = new SpeechSynthesisUtterance(chunk);
    if (voice) x.voice = voice;
    u.outstanding++;
    x.onstart = () => markFirst(u);
    const done = () => { u.outstanding--; maybeDone(u); };
    x.onend = done; x.onerror = done;
    window.speechSynthesis.speak(x);
  }, [markFirst, maybeDone]);

  const enqueueKokoro = useCallback((u: Utterance, chunk: string) => {
    u.outstanding++;
    const synth = synthKokoro(chunk); // starts now: overlaps with what's already playing
    u.chain = u.chain.then(async () => {
      if (u.token !== playToken.current) return;
      if (u.engine === "browser") { u.outstanding--; enqueueBrowser(u, chunk); return; }
      const g0 = performance.now();
      let out: { audio: Float32Array; rate: number };
      try { out = await synth; } catch { u.outstanding--; enqueueBrowser(u, chunk); return; }
      if (u.token !== playToken.current) return;
      // Slower than real time twice in a row → this device can't keep up: the browser voice takes over.
      const genMs = performance.now() - g0, audioMs = (out.audio.length / out.rate) * 1000;
      u.slow = genMs > audioMs * 1.3 && !u.first ? u.slow + 1 : 0;
      if (u.slow >= 2) {
        u.engine = "browser";
        setTtsNote("The natural voice is slower than real time on this device, so the browser voice is used from now on. You can switch back in voice settings.");
        setSettings({ tts: "browser" });
      }
      playCtx.current ??= new AudioContext();
      const ctx = playCtx.current;
      const buffer = ctx.createBuffer(1, out.audio.length, out.rate);
      buffer.copyToChannel(out.audio as Float32Array<ArrayBuffer>, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      u.at = Math.max(u.at, ctx.currentTime + 0.02);
      src.start(u.at);
      u.at += buffer.duration;
      sources.current.push(src);
      markFirst(u);
      src.onended = () => { u.outstanding--; maybeDone(u); };
    });
  }, [enqueueBrowser, markFirst, maybeDone, setSettings]);

  const enqueue = useCallback((u: Utterance, chunk: string) => {
    if (!chunk.trim() || u.token !== playToken.current) return;
    if (u.engine === "kokoro") enqueueKokoro(u, chunk); else enqueueBrowser(u, chunk);
  }, [enqueueBrowser, enqueueKokoro]);

  const beginSpeech = useCallback((onDone?: () => void) => {
    cancel();
    const u: Utterance = { token: ++playToken.current, t0: performance.now(), onDone, ended: false, outstanding: 0, first: true, buf: "", engine: settingsRef.current.tts === "kokoro" ? "kokoro" : "browser", chain: Promise.resolve(), at: 0, slow: 0 };
    if (u.engine === "kokoro") {
      setKokoroPct((p) => p ?? 0);
      u.chain = loadKokoro((p) => setKokoroPct(p)).then(() => setKokoroPct(100), () => {
        u.engine = "browser";
        setTtsNote("The natural voice couldn't load (offline or blocked), so the browser voice is used.");
        setSettings({ tts: "browser" });
      });
    }
    cur.current = u;
    ttsSpeaking.current = true;
    setSpeaking(true);
  }, [cancel, setSettings]);

  /** Append streamed text; complete sentences are spoken right away (a long clause is cut at a comma). */
  const pushSpeech = useCallback((text: string) => {
    const u = cur.current;
    if (!u) return;
    u.buf += text;
    let cut = -1;
    const re = /[.!?]["')\]]?\s/g;
    for (let m = re.exec(u.buf); m; m = re.exec(u.buf)) cut = m.index + m[0].length;
    if (cut < 0 && u.first && u.buf.length > 140) { const c = u.buf.lastIndexOf(", "); if (c > 40) cut = c + 2; }
    if (cut < 0) return;
    const ready = u.buf.slice(0, cut);
    u.buf = u.buf.slice(cut);
    for (const chunk of splitSentences(ready, u.first ? 1 : 40)) enqueue(u, chunk);
  }, [enqueue]);

  const endSpeech = useCallback(() => {
    const u = cur.current;
    if (!u) return;
    for (const chunk of splitSentences(u.buf)) enqueue(u, chunk);
    u.buf = "";
    u.ended = true;
    void u.chain.then(() => maybeDone(u));
    maybeDone(u);
  }, [enqueue, maybeDone]);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!splitSentences(text).length) { onDone?.(); return; }
    beginSpeech(onDone);
    pushSpeech(text + " ");
    endSpeech();
  }, [beginSpeech, pushSpeech, endSpeech]);

  const noteAi = useCallback((ms: number) => setLatency((l) => ({ ...l, aiMs: ms })), []);

  return {
    settings, setSettings, sttServer: opts.sttServer, latency, noteAi,
    mic: {
      state: micState,
      interim: useWhisper ? (transcribing ? "…" : "") : sr.interim,
      error: micError ?? (useWhisper ? null : sr.error),
      start: () => { void micStart(); }, stop: micStop, monitor,
      supported: useWhisper ? true : sr.supported,
      level, userSpeaking, transcribing,
    },
    tts: { speak, cancel, speaking, supported: ttsSupported, note: ttsNote, kokoroPct, beginSpeech, pushSpeech, endSpeech },
    sttPct,
    autoSendIn, cancelAutoSend,
  };
}

export type Voice = ReturnType<typeof useVoice>;
