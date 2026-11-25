import type { ExecResult } from "./types";

/**
 * In-browser code runners for Python (Pyodide) and JavaScript. Both run inside a dedicated Web Worker
 * created from a Blob, so candidate code never touches the page: no DOM, no access to app state.
 * A run that exceeds its time limit is stopped by terminating the worker.
 */

export const PYODIDE_VERSION = "0.28.3";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const JS_WORKER = `
self.onmessage = (e) => {
  const { program, stdin } = e.data;
  const out = [];
  const fmt = (a) => a.map((x) => (typeof x === "string" ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })())).join(" ");
  for (const k of ["log", "info", "warn", "error", "debug"]) console[k] = (...a) => { if (out.length < 5000) out.push(fmt(a)); };
  self.__STDIN__ = stdin;
  const t0 = performance.now();
  let fn;
  try { fn = new Function(program); }
  catch (err) { self.postMessage({ status: "compile_error", stdout: "", stderr: String(err && err.message || err), timeMs: 0 }); return; }
  try { fn(); self.postMessage({ status: "ok", stdout: out.join("\\n") + "\\n", stderr: "", timeMs: Math.round(performance.now() - t0) }); }
  catch (err) { self.postMessage({ status: "runtime_error", stdout: out.join("\\n"), stderr: String(err && err.stack || err), timeMs: Math.round(performance.now() - t0) }); }
};
`;

const PY_WORKER = `
importScripts("${PYODIDE_URL}pyodide.js");
const ready = loadPyodide({ indexURL: "${PYODIDE_URL}" }).then((py) => { self.postMessage({ type: "ready" }); return py; })
  .catch((err) => { self.postMessage({ type: "load_error", message: String(err) }); throw err; });
self.onmessage = async (e) => {
  const py = await ready;
  const { program, stdin } = e.data;
  let out = "", err = "";
  py.setStdout({ batched: (s) => { if (out.length < 400000) out += s + "\\n"; } });
  py.setStderr({ batched: (s) => { if (err.length < 100000) err += s + "\\n"; } });
  const ns = py.globals.get("dict")();
  ns.set("__stdin_data", stdin);
  ns.set("__name__", "__main__");
  const t0 = performance.now();
  try {
    py.runPython("import sys, io\\nsys.stdin = io.StringIO(__stdin_data)", { globals: ns });
    try { py.runPython("compile(" + JSON.stringify(program) + ", 'solution.py', 'exec')", { globals: ns }); }
    catch (ce) { self.postMessage({ type: "result", status: "compile_error", stdout: "", stderr: String(ce.message || ce).split("\\n").slice(-6).join("\\n"), timeMs: 0 }); return; }
    py.runPython(program, { globals: ns });
    self.postMessage({ type: "result", status: "ok", stdout: out, stderr: err, timeMs: Math.round(performance.now() - t0) });
  } catch (re) {
    self.postMessage({ type: "result", status: "runtime_error", stdout: out, stderr: err + String(re.message || re).split("\\n").slice(-8).join("\\n"), timeMs: Math.round(performance.now() - t0) });
  } finally { ns.destroy(); }
};
`;

const blobUrl = (src: string) => URL.createObjectURL(new Blob([src], { type: "text/javascript" }));

export async function runJavaScript(program: string, stdin: string, timeoutMs = 5000): Promise<ExecResult> {
  const url = blobUrl(JS_WORKER);
  const worker = new Worker(url);
  try {
    return await new Promise<ExecResult>((resolve) => {
      const timer = setTimeout(() => resolve({ status: "timeout", stdout: "", stderr: "", timeMs: timeoutMs, message: `Stopped after ${timeoutMs / 1000}s — is there an infinite loop?` }), timeoutMs);
      worker.onmessage = (e) => { clearTimeout(timer); resolve(e.data as ExecResult); };
      worker.onerror = (e) => { clearTimeout(timer); resolve({ status: "runtime_error", stdout: "", stderr: e.message, timeMs: null }); };
      worker.postMessage({ program, stdin });
    });
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
}

// Pyodide takes a few seconds (~10 MB download, cached by the browser) to start, so keep one warm worker.
let py: { worker: Worker; ready: Promise<void> } | null = null;

function pythonWorker(onStatus?: (s: string) => void) {
  if (py) return py;
  const url = blobUrl(PY_WORKER);
  const worker = new Worker(url);
  onStatus?.("Loading Python in your browser (first run downloads about 10 MB)…");
  const ready = new Promise<void>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "ready") { worker.removeEventListener("message", onMsg); resolve(); }
      if (e.data?.type === "load_error") { worker.removeEventListener("message", onMsg); reject(new Error(e.data.message)); }
    };
    worker.addEventListener("message", onMsg);
    worker.onerror = () => reject(new Error("Python runtime failed to load"));
  });
  py = { worker, ready };
  ready.catch(() => { worker.terminate(); py = null; });
  return py;
}

/** Start loading Pyodide early (e.g. when a Python round opens) so the first Run is fast. */
export function warmPython() {
  if (typeof window !== "undefined" && typeof Worker !== "undefined") pythonWorker();
}

export async function runPython(program: string, stdin: string, opts: { timeoutMs?: number; onStatus?: (s: string) => void } = {}): Promise<ExecResult> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const w = pythonWorker(opts.onStatus);
  try {
    await Promise.race([w.ready, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60_000))]);
  } catch {
    py?.worker.terminate(); py = null;
    return { status: "unavailable", stdout: "", stderr: "", timeMs: null, message: "Couldn't load the in-browser Python runtime (CDN blocked or offline). Use Submit to run on the server judge instead." };
  }
  opts.onStatus?.("Running…");
  return new Promise<ExecResult>((resolve) => {
    const timer = setTimeout(() => {
      // Pyodide can't be interrupted without cross-origin isolation, so stop the worker; the next run reloads it.
      w.worker.terminate(); py = null;
      resolve({ status: "timeout", stdout: "", stderr: "", timeMs: timeoutMs, message: `Stopped after ${timeoutMs / 1000}s — is there an infinite loop? (Python will reload on the next run.)` });
    }, timeoutMs);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "result") return;
      clearTimeout(timer); w.worker.removeEventListener("message", onMsg);
      const { status, stdout, stderr, timeMs } = e.data;
      resolve({ status, stdout, stderr, timeMs });
    };
    w.worker.addEventListener("message", onMsg);
    w.worker.postMessage({ program, stdin });
  });
}
