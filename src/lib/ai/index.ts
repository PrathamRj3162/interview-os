import "server-only";
import type { ZodType } from "zod";
import { getConfiguredProviders, type ProviderConfig, type ProviderId } from "./providers";
import { extractJson, UNTRUSTED_GUARD } from "./json";
import { mockEnabled, mockReply } from "./mock";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  text: string;
  provider: ProviderId;
  model: string;
}

export class AIUnavailableError extends Error {
  constructor(message = "No AI provider is currently available. Core features without AI still work.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 45000);

class ProviderHttpError extends Error {
  constructor(public provider: string, public status: number) {
    super(`${provider} responded ${status}`);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callProvider(
  p: ProviderConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; json?: boolean },
): Promise<string> {
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(p.apiKey ? { Authorization: `Bearer ${p.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: p.model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.json && p.id !== "ollama" ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    // Never log bodies: they may echo user content.
    throw new ProviderHttpError(p.id, res.status);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${p.id} returned an empty response`);
  return text;
}

/** Tries each configured provider in order; falls through on errors / rate limits. */
export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; json?: boolean } = {},
): Promise<ChatResult> {
  if (mockEnabled()) return { text: mockReply(messages), provider: "gemini", model: "mock" };
  const providers = getConfiguredProviders();
  if (providers.length === 0) throw new AIUnavailableError("No AI provider is configured on this server.");
  const guarded: ChatMessage[] = [{ role: "system", content: UNTRUSTED_GUARD }, ...messages];
  const errors: string[] = [];
  for (const p of providers) {
    // Free tiers return 503 "high demand" / 429 in short bursts: one quick retry before falling through.
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      try {
        const text = await callProvider(p, guarded, opts);
        console.info(`[ai] ok ${p.model} ${Date.now() - t0}ms`);
        return { text, provider: p.id, model: p.model };
      } catch (e) {
        console.info(`[ai] fail ${p.model} ${Date.now() - t0}ms ${e instanceof Error ? e.message : ""}`);
        errors.push(`${p.model}: ${e instanceof Error ? e.message : String(e)}`);
        const transient = e instanceof ProviderHttpError && (e.status === 503 || e.status === 429 || e.status === 500);
        if (!transient || attempt === 1) break;
        await sleep(1500 + Math.random() * 1000);
      }
    }
  }
  console.warn("[ai] all providers failed:", errors.join("; "));
  throw new AIUnavailableError();
}

/** Chat that must return JSON matching `schema`. Retries once with the validation error. */
export async function generateObject<T>(
  schema: ZodType<T>,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<{ data: T; provider: ProviderId; model: string }> {
  let convo = [...messages];
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await chat(convo, { ...opts, json: true });
    try {
      const parsed = schema.safeParse(extractJson(result.text));
      if (parsed.success) return { data: parsed.data, provider: result.provider, model: result.model };
      lastError = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "invalid JSON";
    }
    console.info(`[ai] invalid output from ${result.model}: ${lastError.slice(0, 200)}`);
    convo = [
      ...messages,
      { role: "assistant", content: result.text },
      { role: "user", content: `Your previous output was invalid (${lastError}). Return ONLY corrected JSON.` },
    ];
  }
  throw new Error(`AI output failed validation: ${lastError}`);
}

export function aiStatus() {
  if (mockEnabled()) return [{ id: "gemini" as const, label: "Mock AI (tests only)", model: "mock" }];
  return getConfiguredProviders().map((p) => ({ id: p.id, label: p.label, model: p.model }));
}
