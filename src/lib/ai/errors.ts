/** Shared AI types and errors (kept separate so the live and regular clients can import them without a cycle). */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AIUnavailableError extends Error {
  constructor(message = "No AI provider is currently available. Core features without AI still work.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}
