import "server-only";

/**
 * All supported providers expose an OpenAI-compatible /chat/completions endpoint,
 * so one adapter covers them. Keys stay server-side; nothing here is sent to the browser.
 * No provider in this list requires a paid plan to operate within its free quota.
 */
export type ProviderId = "gemini" | "groq" | "openrouter" | "ollama";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function getConfiguredProviders(): ProviderConfig[] {
  const order = (env("AI_PROVIDER_ORDER") ?? "gemini,groq,openrouter,ollama")
    .split(",")
    .map((s) => s.trim()) as ProviderId[];

  const all: Record<ProviderId, ProviderConfig | null> = {
    gemini: env("GEMINI_API_KEY")
      ? {
          id: "gemini",
          label: "Google Gemini (free tier)",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: env("GEMINI_API_KEY"),
          model: env("GEMINI_MODEL") ?? "gemini-flash-latest,gemini-flash-lite-latest",
        }
      : null,
    groq: env("GROQ_API_KEY")
      ? {
          id: "groq",
          label: "Groq (free tier)",
          baseUrl: "https://api.groq.com/openai/v1",
          apiKey: env("GROQ_API_KEY"),
          model: env("GROQ_MODEL") ?? "openai/gpt-oss-120b",
        }
      : null,
    // OpenRouter is only used with an explicitly chosen free model (ids ending in ":free"),
    // so it can never silently route to a paid model.
    openrouter: (() => {
      const freeModels = (env("OPENROUTER_MODEL") ?? "").split(",").map((m) => m.trim()).filter((m) => m.endsWith(":free"));
      return env("OPENROUTER_API_KEY") && freeModels.length
        ? {
            id: "openrouter" as const,
            label: "OpenRouter (free model)",
            baseUrl: "https://openrouter.ai/api/v1",
            apiKey: env("OPENROUTER_API_KEY"),
            model: freeModels.join(","), // non-":free" entries are dropped above: never a paid model
          }
        : null;
    })(),
    ollama: env("OLLAMA_BASE_URL")
      ? {
          id: "ollama",
          label: "Ollama (self-hosted)",
          baseUrl: env("OLLAMA_BASE_URL")!.replace(/\/$/, "") + "/v1",
          model: env("OLLAMA_MODEL") ?? "llama3.1",
        }
      : null,
  };

  // A provider's *_MODEL may list several models ("a,b"): each becomes its own fallback entry,
  // so an overloaded model (e.g. 503 "high demand") falls through to a lighter one.
  return order
    .map((id) => all[id])
    .filter((p): p is ProviderConfig => Boolean(p))
    .flatMap((p) =>
      p.model.split(",").map((m) => m.trim()).filter(Boolean).map((model) => ({ ...p, model })),
    );
}
