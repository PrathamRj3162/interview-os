"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Volume2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { createVad, rmsOf } from "@/lib/voice/vad";
import { useSpeechRecognition } from "@/components/interview/use-speech";
import { loadKokoro, synthKokoro } from "./kokoro";
import { LevelMeter } from "./voice-ui";
import { cn } from "@/lib/utils";

const SAMPLE = "Hi! I'll be your interviewer today. Can you walk me through your approach before you start coding?";

/** Pre-interview check: microphone level and noise, a recording you can play back, speech recognition and both voices. */
export function MicCheck({ sttServer }: { sttServer: boolean }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [peak, setPeak] = useState(0);
  const [recState, setRecState] = useState<"idle" | "recording" | "done">("idle");
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const [kokoro, setKokoro] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [kokoroPct, setKokoroPct] = useState(0);
  const [ttsMs, setTtsMs] = useState<{ browser?: number; kokoro?: number }>({});
  const m = useRef<{ stream: MediaStream; ctx: AudioContext; timer: number } | null>(null);
  const sr = useSpeechRecognition(useCallback((t: string) => setHeard((h) => (h ? h + " " : "") + t), []));

  const stop = useCallback(() => {
    if (!m.current) return;
    clearInterval(m.current.timer);
    m.current.stream.getTracks().forEach((t) => t.stop());
    void m.current.ctx.close().catch(() => {});
    m.current = null;
    setOn(false); setLevel(0); setSpeaking(false);
  }, []);
  useEffect(() => stop, [stop]);

  const start = async () => {
    stop(); setErr(null); setPeak(0); setFloor(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput"));
      const ctx = new AudioContext();
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      const vad = createVad();
      let n = 0;
      const timer = window.setInterval(() => {
        an.getFloatTimeDomainData(buf);
        const r = rmsOf(buf);
        const ev = vad.push(r, performance.now());
        if (ev === "start") setSpeaking(true);
        if (ev === "end") setSpeaking(false);
        if (vad.speaking) setPeak((p) => Math.max(p, r));
        if (++n % 3 === 0) { setLevel(Math.min(1, r * 8)); setFloor(vad.floor); }
      }, 30);
      m.current = { stream, ctx, timer };
      setOn(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setErr(name === "NotAllowedError" ? "Microphone access is blocked. Allow it in your browser's site settings (the icon left of the address bar), then try again." : name === "NotFoundError" ? "No microphone was found." : "Couldn't open the microphone.");
    }
  };

  const record = () => {
    if (!m.current || typeof MediaRecorder === "undefined") return;
    const rec = new MediaRecorder(m.current.stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => { if (recUrl) URL.revokeObjectURL(recUrl); setRecUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }))); setRecState("done"); };
    rec.start(); setRecState("recording");
    window.setTimeout(() => rec.state === "recording" && rec.stop(), 5000);
  };

  const sayBrowser = () => {
    if (!("speechSynthesis" in window)) return;
    const t0 = performance.now();
    const u = new SpeechSynthesisUtterance(SAMPLE);
    u.onstart = () => setTtsMs((x) => ({ ...x, browser: Math.round(performance.now() - t0) }));
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  };
  const sayKokoro = async () => {
    try {
      if (kokoro !== "ready") { setKokoro("loading"); await loadKokoro(setKokoroPct); setKokoro("ready"); }
      const t0 = performance.now();
      const out = await synthKokoro(SAMPLE.split("!")[0] + "!");
      const ctx = new AudioContext();
      const b = ctx.createBuffer(1, out.audio.length, out.rate);
      b.copyToChannel(out.audio as Float32Array<ArrayBuffer>, 0);
      const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start();
      setTtsMs((x) => ({ ...x, kokoro: Math.round(performance.now() - t0) }));
    } catch { setKokoro("error"); }
  };

  const floorVerdict = floor == null ? null : floor < 0.012 ? { ok: true, text: "Quiet room — good." } : floor < 0.03 ? { ok: true, text: "Some background noise — fine with headphones." } : { ok: false, text: "Noisy background — the pause detection may struggle. Try a quieter spot or a headset." };
  const peakVerdict = peak === 0 ? null : peak < 0.04 ? { ok: false, text: "You sound quiet — move closer to the mic or raise its input volume." } : peak > 0.6 ? { ok: false, text: "Very loud — you may be clipping. Move back a little." } : { ok: true, text: "Your voice level is good." };

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm">
            <span className="font-medium">Microphone</span>
            <Select value={deviceId} onChange={(e) => { setDeviceId(e.target.value); stop(); }} className="mt-1">
              <option value="">Default microphone</option>
              {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
            </Select>
          </label>
          {on ? <Button variant="secondary" onClick={stop}><Square className="size-4" aria-hidden />Stop</Button> : <Button onClick={start}><Mic className="size-4" aria-hidden />Start mic test</Button>}
        </div>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        {on && (
          <div className="space-y-2" aria-live="polite">
            <div className="flex items-center gap-3 text-sm">
              <LevelMeter level={level} active={speaking} />
              <span className={speaking ? "text-success" : "text-muted"} data-testid="vad-state">{speaking ? "Hearing you" : "Silence"}</span>
              <span className="ml-auto font-mono text-xs text-muted">noise floor {floor == null ? "…" : floor.toFixed(3)} · peak {peak.toFixed(3)}</span>
            </div>
            <p className="text-xs text-muted">Stay silent for 2 seconds, then say a sentence out loud.</p>
            {[floorVerdict, peakVerdict].filter(Boolean).map((v, i) => (
              <p key={i} className={cn("flex items-center gap-1.5 text-sm", v!.ok ? "text-success" : "text-warning")}>{v!.ok ? <CheckCircle2 className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}{v!.text}</p>
            ))}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button size="sm" variant="secondary" onClick={record} disabled={recState === "recording"}>{recState === "recording" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mic className="size-4" aria-hidden />}{recState === "recording" ? "Recording 5 s…" : "Record 5 s"}</Button>
              {recUrl && <audio controls src={recUrl} className="h-9" aria-label="Your recording" />}
            </div>
            <p className="text-xs text-muted">The recording stays in this tab and is never uploaded.</p>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">Speech recognition</h2>
        {sr.supported ? (
          <>
            <p className="text-sm text-muted">Say: &ldquo;I would use a hash map to get constant-time lookups.&rdquo;</p>
            <div className="flex flex-wrap items-center gap-3">
              {sr.state === "listening" ? <Button size="sm" variant="secondary" onClick={sr.stop}><Square className="size-4" aria-hidden />Stop</Button> : <Button size="sm" variant="secondary" onClick={() => { setHeard(""); sr.start(); }}><Mic className="size-4" aria-hidden />Test recognition</Button>}
              <span className="text-sm">{heard || sr.interim || <span className="text-muted">Your words will appear here.</span>}</span>
            </div>
            {sr.error && <p className="text-sm text-warning">{sr.error}</p>}
          </>
        ) : <p className="text-sm text-warning">This browser has no built-in speech recognition. Use Chrome, Edge or Safari, or type your answers.</p>}
        <p className="text-xs text-muted">{sttServer ? "Whisper (server) is also available in the room's voice settings." : "Server speech-to-text (Whisper) isn't configured on this deployment, so the browser's recognition is used."}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">Interviewer voice</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="secondary" onClick={sayBrowser}><Volume2 className="size-4" aria-hidden />Browser voice</Button>
          {ttsMs.browser != null && <span className="font-mono text-xs text-muted">started in {ttsMs.browser} ms</span>}
          <Button size="sm" variant="secondary" onClick={() => void sayKokoro()} disabled={kokoro === "loading"}>
            {kokoro === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}Natural voice (on-device)
          </Button>
          {kokoro === "loading" && <span className="text-xs text-muted">Downloading the model… {kokoroPct}% (one-time, ~90 MB)</span>}
          {ttsMs.kokoro != null && <span className="font-mono text-xs text-muted">generated in {ttsMs.kokoro} ms</span>}
          {kokoro === "error" && <span className="text-xs text-warning">Couldn&apos;t load the natural voice (offline, or the CDN is blocked). The browser voice still works.</span>}
        </div>
      </Card>
    </div>
  );
}
