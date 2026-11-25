"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in TS's DOM lib everywhere). */
type SRAlternative = { transcript: string };
type SRResult = { isFinal: boolean; 0: SRAlternative; length: number };
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SRErrorEvent = { error: string };
interface SR {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SREvent) => void) | null; onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null; onstart: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}

export type MicState = "off" | "starting" | "listening" | "denied" | "unsupported" | "error";

function getSR(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Browser speech recognition. Audio is handled by the browser (in Chrome, Google's speech service);
 * InterviewOS never receives or stores audio — only the resulting text.
 */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [state, setState] = useState<MicState>("off");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const wantRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  useEffect(() => {
    if (!getSR()) setState("unsupported"); // eslint-disable-line react-hooks/set-state-in-effect -- feature detection after hydration
    return () => { wantRef.current = false; recRef.current?.abort(); };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSR();
    if (!Ctor) { setState("unsupported"); return; }
    window.speechSynthesis?.cancel(); // barge-in: candidate speaking interrupts the interviewer
    wantRef.current = true;
    setError(null);
    if (recRef.current) { try { recRef.current.start(); } catch { /* already running */ } return; }
    const rec = new Ctor();
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setState("listening");
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current(r[0].transcript.trim());
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false; setState("denied");
        setError("Microphone access was blocked. Allow it in your browser's site settings, or answer by typing.");
      } else if (e.error === "no-speech" || e.error === "aborted") {
        /* benign — onend restarts if still wanted */
      } else if (e.error === "network") {
        setError("Speech recognition lost its connection. Check your network, then turn the mic back on.");
        wantRef.current = false; setState("error");
      } else {
        setError(`Speech recognition error (${e.error}). You can keep answering by typing.`);
        wantRef.current = false; setState("error");
      }
    };
    rec.onend = () => {
      setInterim("");
      // Browsers stop after silence; keep listening while the candidate hasn't turned the mic off.
      if (wantRef.current) { try { rec.start(); return; } catch { /* fall through */ } }
      setState((s) => (s === "denied" || s === "error" ? s : "off"));
    };
    recRef.current = rec;
    setState("starting");
    try { rec.start(); } catch { setState("error"); setError("Couldn't start the microphone."); }
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setState((s) => (s === "listening" || s === "starting" ? "off" : s));
  }, []);

  return { state, interim, error, start, stop, supported: state !== "unsupported" };
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setSupported(false); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang === navigator.language && /natural|neural|google|premium|enhanced/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith("en") && /natural|neural|google|premium|enhanced/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith("en")) ?? null;
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", pick); window.speechSynthesis.cancel(); };
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!("speechSynthesis" in window)) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, " (see the code shown on screen) ").replace(/[*_#`]/g, ""));
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); onDone?.(); };
    u.onerror = () => { setSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(u);
  }, []);

  const cancel = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, []);
  return { speak, cancel, speaking, supported };
}
