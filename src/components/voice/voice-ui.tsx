"use client";

import Link from "next/link";
import { Dialog } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";
import type { Voice } from "./use-voice";

/** Small live input-level meter; turns green while the VAD hears speech. */
export function LevelMeter({ level, active }: { level: number; active: boolean }) {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-label={active ? "Hearing you" : "Mic level"} role="img" data-testid="level-meter">
      {[0.15, 0.3, 0.5, 0.7, 0.9].map((t, i) => (
        <span key={i} className={cn("w-1 rounded-sm transition-colors", level >= t ? (active ? "bg-success" : "bg-accent") : "bg-surface-3")} style={{ height: `${30 + i * 17}%` }} />
      ))}
    </span>
  );
}

function Choice<T extends string>({ name, value, onChange, options }: { name: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; hint: string; disabled?: boolean }[] }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 text-sm font-medium">{name}</legend>
      {options.map((o) => (
        <label key={o.value} className={cn("flex cursor-pointer gap-2 rounded-lg border p-2.5 text-sm", value === o.value ? "border-accent bg-accent-soft" : "border-border", o.disabled && "cursor-not-allowed opacity-50")}>
          <input type="radio" name={name} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} className="mt-0.5 accent-[var(--accent)]" />
          <span><span className="font-medium">{o.label}</span><span className="block text-xs text-muted">{o.hint}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

export function VoiceSettingsDialog({ open, onClose, voice }: { open: boolean; onClose: () => void; voice: Voice }) {
  const s = voice.settings;
  return (
    <Dialog open={open} onClose={onClose} title="Voice settings">
      <div className="space-y-5">
        <Choice name="Listening (speech-to-text)" value={s.stt} onChange={(v) => voice.setSettings({ stt: v })} options={[
          { value: "browser", label: "Browser", hint: "Your browser's speech recognition. Live words as you speak. In Chrome, audio goes to Google's speech service; not available in Firefox." },
          { value: "local", label: "Whisper (on this device)", hint: `Free and private: audio never leaves your device. One-time ~40–80 MB download; text appears after each pause.${voice.sttPct != null && voice.sttPct < 100 ? ` Downloading… ${voice.sttPct}%` : voice.sttPct === 100 ? " Ready." : ""}` },
          { value: "whisper", label: "Whisper (server)", disabled: !voice.sttServer, hint: voice.sttServer ? "More accurate on technical words. Each answer's audio is sent to Groq; counts toward your daily AI limit." : "Not configured on this deployment (needs a free Groq API key)." },
        ]} />
        <Choice name="Interviewer voice" value={s.tts} onChange={(v) => voice.setSettings({ tts: v })} options={[
          { value: "browser", label: "Browser voice", hint: "Instant. Quality depends on your device's voices." },
          { value: "kokoro", label: "Natural voice (Kokoro, on-device)", hint: `Runs entirely in your browser. One-time ~90 MB download (cached), starts downloading as soon as you pick it; if your device can't keep up, the browser voice takes over automatically.${voice.tts.kokoroPct != null && voice.tts.kokoroPct < 100 ? ` Downloading… ${voice.tts.kokoroPct}%` : voice.tts.kokoroPct === 100 ? " Ready." : ""}` },
        ]} />
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={s.autoSend} onChange={(e) => voice.setSettings({ autoSend: e.target.checked })} className="mt-0.5 accent-[var(--accent)]" />
            <span><span className="font-medium">Send when I stop talking</span><span className="block text-xs text-muted">After a pause, a 1.5 s countdown starts; keep talking or press &quot;Don&apos;t send&quot; to cancel.</span></span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Pause that ends an answer: {(s.silenceMs / 1000).toFixed(1)} s</span>
            <input type="range" min={800} max={3000} step={100} value={s.silenceMs} onChange={(e) => voice.setSettings({ silenceMs: Number(e.target.value) })} className="mt-1 w-full accent-[var(--accent)]" aria-label="Pause length in milliseconds" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={s.bargeIn} onChange={(e) => voice.setSettings({ bargeIn: e.target.checked })} className="mt-0.5 accent-[var(--accent)]" />
            <span><span className="font-medium">Interrupt the interviewer by speaking</span><span className="block text-xs text-muted">Works best with headphones, so the interviewer&apos;s voice isn&apos;t mistaken for yours.</span></span>
          </label>
        </div>
        <p className="text-xs text-muted">Settings are saved on this device. <Link href="/mic-check" target="_blank" className="underline">Open the mic check</Link> to test your microphone and voices.</p>
      </div>
    </Dialog>
  );
}
