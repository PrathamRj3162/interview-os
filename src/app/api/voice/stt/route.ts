import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";
import { sttAvailable } from "@/lib/voice/server";

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB
const MODEL = () => process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";


/**
 * Speech-to-text with Whisper on Groq's free tier — only when GROQ_API_KEY is set. Audio is forwarded
 * to Groq and not stored by Interview OS; each call counts against the user's daily AI quota.
 */
export async function POST(request: NextRequest) {
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!sttAvailable()) return NextResponse.json({ error: "Server speech-to-text isn't configured on this deployment. Your browser's speech recognition is used instead." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: "No audio received." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "That recording is too long. Pause between answers, or use typing." }, { status: 413 });
  if (!/^audio\/(webm|ogg|mp4|mpeg|wav|x-wav)/.test(audio.type || "audio/webm")) return NextResponse.json({ error: "Unsupported audio format." }, { status: 415 });

  try { await assertQuota(supabase, user.id); }
  catch (e) { if (e instanceof QuotaExceededError) return NextResponse.json({ error: e.message }, { status: 429 }); throw e; }

  const body = new FormData();
  body.append("file", audio, `answer.${audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm"}`);
  body.append("model", MODEL());
  body.append("response_format", "json");
  body.append("temperature", "0");
  const t0 = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body, signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("[stt] groq failed", res?.status);
    return NextResponse.json({ error: res?.status === 429 ? "The free speech-to-text tier is busy. Try again in a moment, or type." : "Speech-to-text failed. You can keep answering by typing." }, { status: 502 });
  }
  const data = (await res.json().catch(() => ({}))) as { text?: string };
  await recordUsage(supabase, user.id, "stt", "groq", MODEL());
  return NextResponse.json({ text: (data.text ?? "").trim().slice(0, 5000), ms: Date.now() - t0 });
}
