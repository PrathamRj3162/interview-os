"use client";

/**
 * On-device speech-to-text: Whisper (tiny.en on CPU, base.en with WebGPU) via transformers.js in a module
 * worker. Free and private — audio never leaves the device. The model (~40–80 MB) downloads once and is
 * cached by the browser.
 */
export const TRANSFORMERS_VERSION = "3.5.1";
const WORKER = `
let asr = null;
async function load() {
  const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm");
  const webgpu = typeof navigator !== "undefined" && "gpu" in navigator && !!(await navigator.gpu?.requestAdapter?.().catch(() => null));
  const model = webgpu ? "onnx-community/whisper-base.en" : "onnx-community/whisper-tiny.en";
  asr = await pipeline("automatic-speech-recognition", model, {
    dtype: webgpu ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8", device: webgpu ? "webgpu" : "wasm",
    progress_callback: (p) => { if (p && p.status === "progress" && p.file && p.file.endsWith(".onnx")) self.postMessage({ type: "progress", pct: Math.round(p.progress || 0) }); },
  });
  self.postMessage({ type: "ready", model });
}
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "load") { if (!asr) await load(); else self.postMessage({ type: "ready" }); return; }
    if (m.type === "transcribe") {
      if (!asr) await load();
      const t0 = performance.now();
      const out = await asr(m.audio, { chunk_length_s: 30, stride_length_s: 5 });
      self.postMessage({ type: "text", id: m.id, text: String(out.text || ""), ms: Math.round(performance.now() - t0) });
    }
  } catch (err) { self.postMessage({ type: "error", id: m.id, message: String((err && err.message) || err).slice(0, 300) }); }
};
`;

let worker: Worker | null = null;
let readyP: Promise<void> | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
const progress = new Set<(pct: number) => void>();

function ensure() {
  if (worker) return worker;
  worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" })), { type: "module" });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "progress") for (const l of progress) l(m.pct);
    if (m.type === "text") { pending.get(m.id)?.resolve(m.text); pending.delete(m.id); }
    if (m.type === "error") { if (m.id != null) { pending.get(m.id)?.reject(new Error(m.message)); pending.delete(m.id); } }
  };
  return worker;
}

export function loadLocalWhisper(onProgress?: (pct: number) => void): Promise<void> {
  if (onProgress) progress.add(onProgress);
  if (readyP) return readyP;
  const w = ensure();
  readyP = new Promise<void>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data.type === "ready") { w.removeEventListener("message", onMsg); resolve(); }
      if (e.data.type === "error" && e.data.id == null) { w.removeEventListener("message", onMsg); reject(new Error(e.data.message)); }
    };
    w.addEventListener("message", onMsg);
    w.onerror = (ev) => reject(new Error(ev.message || "On-device speech recognition failed to load"));
    w.postMessage({ type: "load" });
  });
  readyP.catch(() => { readyP = null; worker?.terminate(); worker = null; });
  return readyP;
}

/** Whisper's placeholders for non-speech ("[BLANK_AUDIO]", "(music)") are dropped. */
export const cleanTranscript = (t: string) => t.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

/** Decode a recorded blob to 16 kHz mono and transcribe it on the device. */
export async function transcribeLocal(blob: Blob): Promise<string> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  let audio: Float32Array;
  try { audio = (await ctx.decodeAudioData(await blob.arrayBuffer())).getChannelData(0).slice(); }
  finally { void ctx.close(); }
  const w = ensure();
  const id = ++seq;
  const text = await new Promise<string>((resolve, reject) => { pending.set(id, { resolve, reject }); w.postMessage({ type: "transcribe", id, audio }, [audio.buffer]); });
  return cleanTranscript(text);
}
