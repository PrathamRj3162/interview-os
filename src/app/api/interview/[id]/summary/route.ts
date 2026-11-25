import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { generateObject, AIUnavailableError } from "@/lib/ai";
import { untrusted } from "@/lib/ai/json";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";
import { loadInterview, loadTurns } from "@/lib/interview/server";
import { pairTurns } from "@/lib/interview/analysis";
import { KINDS } from "@/lib/interview/config";

export const maxDuration = 30;
const schema = z.object({ text: z.string().trim().min(10).max(700) });

/**
 * Instant spoken feedback when the interview ends: three sentences on the live AI budget, spoken while the
 * full report is still being built. No scores or verdict here — those come only from the report's rules.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [iv, turns] = await Promise.all([loadInterview(supabase, id), loadTurns(supabase, id)]);
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  const pairs = pairTurns(turns);
  if (!pairs.length) return NextResponse.json({ error: "No answers to summarise." }, { status: 400 });
  try {
    await assertQuota(supabase, user.id);
    const transcript = pairs.slice(-12).map((p) => `Q: ${p.question}\nA: ${p.answer}`).join("\n\n");
    const r = await generateObject(schema, [
      { role: "system", content: `You just finished conducting a ${KINDS[iv.kind].name}. Speak directly to the candidate in exactly 3 short sentences: one specific thing that went well, the single most important thing to improve, and one concrete next step. Plain spoken English — no scores, no verdict, no markdown. Return JSON {"text": string}.` },
      { role: "user", content: untrusted("interview_transcript", transcript) },
    ], { temperature: 0.4, maxTokens: 300, live: true });
    await recordUsage(supabase, user.id, "interview_summary", r.provider, r.model);
    return NextResponse.json({ text: r.data.text });
  } catch (e) {
    const msg = e instanceof QuotaExceededError || e instanceof AIUnavailableError ? e.message : "Quick feedback isn't available right now — your full report is still on its way.";
    return NextResponse.json({ error: msg }, { status: e instanceof QuotaExceededError ? 429 : 503 });
  }
}
