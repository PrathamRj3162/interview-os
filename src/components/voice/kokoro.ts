"use client";

/**
 * Optional natural voice: Kokoro-82M (Apache-2.0) running entirely in the browser, in a module Web Worker.
 * The library comes from jsDelivr and the model (~90 MB, cached by the browser after the first time)
 * from Hugging Face. Nothing is sent anywhere: text in, audio out, on this device.
 */
export const KOKORO_VERSION = "1.2.1";
const WORKER = `
let tts = null;
async function load() {
  const { KokoroTTS } = await import("https://cdn.jsdelivr.net/npm/kokoro-js@${KOKORO_VERSION}/+esm");
  // Always the ~90 MB 8-bit model on WASM: the fp32 WebGPU build is ~330 MB, too big a download for this.
  tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
    dtype: "q8", device: "wasm",
    progress_callback: (p) => { if (p && p.status === "progress" && p.file && p.file.endsWith(".onnx")) self.postMessage({ type: "progress", pct: Math.round(p.progress || 0) }); },
  });
  self.postMessage({ type: "ready", device: "wasm" });
}
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "load") { if (!tts) await load(); else self.postMessage({ type: "ready" }); return; }
    if (m.type === "speak") {
      if (!tts) await load();
      const t0 = performance.now();
      const out = await tts.generate(m.text, { voice: m.voice || "af_heart" });
      self.postMessage({ type: "audio", id: m.id, audio: out.audio, rate: out.sampling_rate, ms: Math.round(performance.now() - t0) }, [out.audio.buffer]);
    }
  } catch (err) { self.postMessage({ type: "error", id: m.id, message: String((err && err.message) || err).slice(0, 300) }); }
};
`;

type Pending = { resolve: (v: { audio: Float32Array; rate: number }) => void; reject: (e: Error) => void };
let worker: Worker | null = null;
let readyP: Promise<void> | null = null;
let seq = 0;
const pending = new Map<number, Pending>();
const progressListeners = new Set<(pct: number) => void>();

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" })), { type: "module" });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "progress") for (const l of progressListeners) l(m.pct);
    if (m.type === "audio") { pending.get(m.id)?.resolve({ audio: m.audio, rate: m.rate }); pending.delete(m.id); }
    if (m.type === "error") {
      if (m.id != null) { pending.get(m.id)?.reject(new Error(m.message)); pending.delete(m.id); }
      else for (const p of pending.values()) p.reject(new Error(m.message));
    }
  };
  return worker;
}

/** Load the model (idempotent). Rejects if the CDN or model can't be reached. */
export function loadKokoro(onProgress?: (pct: number) => void): Promise<void> {
  if (onProgress) progressListeners.add(onProgress);
  if (readyP) return readyP;
  const w = ensureWorker();
  readyP = new Promise<void>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data.type === "ready") { w.removeEventListener("message", onMsg); resolve(); }
      if (e.data.type === "error" && e.data.id == null) { w.removeEventListener("message", onMsg); reject(new Error(e.data.message)); }
    };
    w.addEventListener("message", onMsg);
    w.onerror = (ev) => reject(new Error(ev.message || "Natural voice failed to load"));
    w.postMessage({ type: "load" });
  });
  readyP.catch(() => { readyP = null; worker?.terminate(); worker = null; });
  return readyP;
}

export function synthKokoro(text: string, voice = "af_heart"): Promise<{ audio: Float32Array; rate: number }> {
  const w = ensureWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); w.postMessage({ type: "speak", id, text, voice }); });
}
