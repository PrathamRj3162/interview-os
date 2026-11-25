"use client";

/**
 * Model-based voice activity detection: Silero VAD v5 via @ricky0123/vad-web, loaded from jsDelivr at runtime
 * (the model is ~2 MB and cached by the browser). Much better than loudness alone at ignoring fans, hostel
 * noise and keyboard clicks. If it can't load, the room falls back to the energy-based detector.
 */
export const VAD_WEB_VERSION = "0.0.30";
export const ORT_VERSION = "1.22.0";
const ORT_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const VAD_URL = `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_WEB_VERSION}/dist/`;

type MicVAD = { start(): void; pause(): void; destroy(): void };
type VadGlobal = { MicVAD: { "new": (opts: Record<string, unknown>) => Promise<MicVAD> } };

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = () => resolve(); s.onerror = () => { scripts.delete(src); reject(new Error(`Couldn't load ${src}`)); };
      document.head.appendChild(s);
    });
    scripts.set(src, p);
  }
  return p;
}

export type SileroOptions = { stream: MediaStream; silenceMs: number; noisy: boolean; onStart: () => void; onEnd: () => void };

/** Starts Silero on an existing microphone stream. Resolves to a handle, or rejects (caller falls back). */
export async function startSilero(o: SileroOptions): Promise<MicVAD> {
  await loadScript(`${ORT_URL}ort.wasm.min.js`);
  await loadScript(`${VAD_URL}bundle.min.js`);
  const vad = (window as unknown as { vad?: VadGlobal }).vad;
  if (!vad) throw new Error("VAD library missing");
  const mic = await vad.MicVAD.new({
    model: "v5",
    getStream: async () => o.stream,
    pauseStream: async () => {}, // the room owns the microphone stream
    resumeStream: async () => o.stream,
    baseAssetPath: VAD_URL,
    onnxWASMBasePath: ORT_URL,
    // "Noisy room": needs clearer, longer speech before it counts.
    positiveSpeechThreshold: o.noisy ? 0.75 : 0.5,
    negativeSpeechThreshold: o.noisy ? 0.55 : 0.35,
    minSpeechMs: o.noisy ? 400 : 250,
    redemptionMs: o.silenceMs,
    preSpeechPadMs: 200,
    onSpeechStart: o.onStart,
    onSpeechEnd: o.onEnd,
    onVADMisfire: o.onEnd,
  });
  mic.start();
  return mic;
}
