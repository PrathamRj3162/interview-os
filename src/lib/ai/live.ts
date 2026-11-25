import "server-only";
import { getConfiguredProviders, type ProviderConfig } from "./providers";
import { UNTRUSTED_GUARD } from "./json";
import { mockEnabled, mockReply } from "./mock";
import { AIUnavailableError, type ChatMessage } from "./errors";

/**
 * Live budget for interview turns: fast providers first, 8 s to the first token per attempt, 15 s overall to
 * get a reply started, then a clear retry message. (Reports keep the long, patient chain in `chat`.)
 */
export const LIVE_FIRST_TOKEN_MS = Number(process.env.AI_LIVE_FIRST_TOKEN_MS ?? 8000);
export const LIVE_TOTAL_MS = Number(process.env.AI_LIVE_TOTAL_MS ?? 15000);
const LIVE_GENERATION_MS = 25_000;

export class LiveTimeoutError extends AIUnavailableError {
  constructor() { super("The interviewer is taking too long to respond (the free AI tier is busy). Your answer is saved — press Retry."); }
}

/** Groq first, then lighter Gemini models before heavier ones, then the rest. */
export function liveOrder(providers: ProviderConfig[]): ProviderConfig[] {
  const score = (p: ProviderConfig) => (p.id === "groq" ? 0 : p.id === "gemini" ? (/lite/.test(p.model) ? 1 : 2) : 3);
  return [...providers].sort((a, b) => score(a) - score(b));
}

/**
 * Streams a chat completion, calling onDelta with each text fragment as it arrives.
 * Falls through to the next provider only while nothing has been emitted yet.
 */
export async function streamChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number },
  onDelta: (text: string) => void,
): Promise<{ text: string; provider: string; model: string }> {
  if (mockEnabled()) {
    const text = mockReply(messages);
    for (let k = 0; k < text.length; k += 12) { const part = text.slice(k, k + 12); onDelta(part); await new Promise((r) => setTimeout(r, 15)); }
    return { text, provider: "gemini", model: "mock" };
  }
  const providers = liveOrder(getConfiguredProviders());
  if (!providers.length) throw new AIUnavailableError("No AI provider is configured on this server.");
  const guarded: ChatMessage[] = [{ role: "system", content: UNTRUSTED_GUARD }, ...messages];
  const deadline = Date.now() + LIVE_TOTAL_MS;

  for (const p of providers) {
    const budget = Math.min(LIVE_FIRST_TOKEN_MS, deadline - Date.now());
    if (budget < 1000) break;
    const ctrl = new AbortController();
    const firstTimer = setTimeout(() => ctrl.abort(), budget);
    const t0 = Date.now();
    let text = "";
    try {
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(p.apiKey ? { Authorization: `Bearer ${p.apiKey}` } : {}) },
        // gpt-oss on Groq reasons before speaking: keep it brief for live turns (reasoning arrives in a separate field we ignore).
        body: JSON.stringify({ model: p.model, messages: guarded, temperature: opts.temperature ?? 0.6, max_tokens: opts.maxTokens ?? 900, stream: true, ...(p.id === "groq" && /gpt-oss/.test(p.model) ? { reasoning_effort: "low" } : {}) }),
        signal: ctrl.signal, cache: "no-store",
      });
      if (!res.ok || !res.body) throw new Error(`${p.id} responded ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let started = false;
      const hardStop = setTimeout(() => ctrl.abort(), LIVE_GENERATION_MS);
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const delta = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
              if (delta) {
                if (!started) { started = true; clearTimeout(firstTimer); console.info(`[ai-live] first token ${p.model} ${Date.now() - t0}ms`); }
                text += delta;
                onDelta(delta);
              }
            } catch { /* keep-alive or partial line */ }
          }
        }
      } finally { clearTimeout(hardStop); }
      clearTimeout(firstTimer);
      if (!text.trim()) throw new Error(`${p.id} returned an empty stream`);
      console.info(`[ai-live] ok ${p.model} ${Date.now() - t0}ms`);
      return { text, provider: p.id, model: p.model };
    } catch (e) {
      clearTimeout(firstTimer);
      console.info(`[ai-live] fail ${p.model} ${Date.now() - t0}ms ${e instanceof Error ? e.name + " " + e.message : ""}`);
      if (text) return { text, provider: p.id, model: p.model }; // already speaking: keep what we have
    }
  }
  throw new LiveTimeoutError();
}

/** Splits the streamed reply into what is said and the trailing `@@META {json}` line. */
export const META = "@@META";
export function splitMeta(full: string): { say: string; meta: Record<string, unknown> } {
  const i = full.lastIndexOf(META);
  if (i < 0) return { say: full.trim(), meta: {} };
  const raw = full.slice(i + META.length).trim();
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch { /* defaults */ }
  return { say: full.slice(0, i).trim(), meta };
}

/** Emits only the spoken part of a stream: holds back text that could be the start of the META marker. */
export function spokenFilter(emit: (text: string) => void) {
  let pending = "";
  let done = false;
  return (delta: string) => {
    if (done) return;
    pending += delta;
    const at = pending.indexOf(META);
    if (at >= 0) { if (at > 0) emit(pending.slice(0, at)); done = true; pending = ""; return; }
    // Keep a tail that might be a partial marker ("@@M…").
    let keep = 0;
    for (let k = Math.min(META.length - 1, pending.length); k > 0; k--) if (META.startsWith(pending.slice(-k))) { keep = k; break; }
    const out = pending.slice(0, pending.length - keep);
    if (out) emit(out);
    pending = pending.slice(pending.length - keep);
  };
}
