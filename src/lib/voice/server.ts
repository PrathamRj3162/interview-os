import "server-only";

/** Whether server speech-to-text (Whisper on Groq) is available: only when a Groq key is configured. */
export const sttAvailable = () => Boolean(process.env.GROQ_API_KEY);
