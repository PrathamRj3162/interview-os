/**
 * Content-Security-Policy: allow only what the app actually loads.
 * - scripts: our own bundles + Next's inline scripts (per-request nonce), jsDelivr for Pyodide, Kokoro,
 *   transformers.js and Silero VAD; WebAssembly compilation for those runtimes. No eval in production.
 * - workers: blob: URLs (code runners, voice models).
 * - network: our API, Supabase, jsDelivr and Hugging Face (model files), GitHub (browser fallback for repo reads).
 *   Judge0 and the AI providers are only ever called from the server, so they aren't listed.
 */
export function buildCsp(nonce: string, opts: { dev?: boolean } = {}) {
  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net 'wasm-unsafe-eval'${opts.dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // React style attributes and next/font CSS
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src 'self' ${supabase} ${supabase.replace(/^https:/, "wss:")} https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co https://api.github.com https://raw.githubusercontent.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "report-uri /api/csp-report",
  ];
  return directives.join("; ");
}

/** Enforced by default (validated in report-only mode first: zero violations). CSP_MODE=report-only|off to relax. */
export const cspMode = (): "report-only" | "enforce" | "off" => {
  const m = process.env.CSP_MODE;
  return m === "report-only" || m === "off" ? m : "enforce";
};
