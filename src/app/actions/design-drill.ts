"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { generateObject } from "@/lib/ai";
import { AIUnavailableError } from "@/lib/ai/errors";
import { untrusted } from "@/lib/ai/json";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";
import { loadGate } from "@/lib/content/gate";
import { DESIGN_QUESTION_BY_SLUG, designQuestionMeta, verifyKeyPoints } from "@/lib/learn/design-questions";

const input = z.object({ items: z.array(z.object({ slug: z.string().max(80), answer: z.string().max(3000) })).min(1).max(5) });
const aiSchema = z.object({
  results: z.array(z.object({ index: z.coerce.number().int(), covered: z.array(z.object({ id: z.string().max(60), quote: z.string().max(400) })).catch([]).default([]) })).catch([]).default([]),
});

export type DrillResult = { slug: string; q: string; answer: string; covered: { id: string; point: string; quote: string }[]; missed: { id: string; point: string }[] };

/**
 * Grades a design-fundamentals drill. The AI may only mark a key point covered by quoting the answer; quotes are
 * checked in code and the score is computed in code. Missed key points become revision cards.
 */
export async function gradeDesignDrill(raw: z.input<typeof input>): Promise<{ ok: boolean; message?: string; results?: DrillResult[]; score?: number; total?: number; dropped?: number }> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Something was wrong with the answers. Reload and try again." };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const gate = await loadGate();
  const items = parsed.data.items.map((it) => ({ ...it, question: DESIGN_QUESTION_BY_SLUG[it.slug] })).filter((it) => it.question && gate.visible(designQuestionMeta(it.question)));
  if (!items.length) return { ok: false, message: "These questions aren't available." };

  const answered = items.filter((it) => it.answer.trim().split(/\s+/).length >= 3);
  let claims: z.infer<typeof aiSchema>["results"] = [];
  if (answered.length) {
    try {
      await assertQuota(supabase, user.id);
      const blocks = answered.map((it, i) => `Q${i}: ${it.question!.q}\nKEY POINTS:\n${it.question!.keyPoints.map((p) => `- ${p.id}: ${p.point}`).join("\n")}\n${untrusted(`answer_${i}`, it.answer)}`).join("\n\n");
      const r = await generateObject(aiSchema, [
        { role: "system", content: [
          "You grade short answers to system design fundamentals questions against listed KEY POINTS.",
          "For each question index, list ONLY the key points the answer actually covers, each with ONE short exact quote (3–25 words) copied from that answer. Never infer, never credit something the answer doesn't say, and omit points that aren't covered.",
          'Return JSON {"results": [{"index": number, "covered": [{"id": key point id, "quote": exact quote}]}]}.',
        ].join("\n") },
        { role: "user", content: blocks },
      ], { temperature: 0.1, maxTokens: 2000 });
      claims = r.data.results;
      await recordUsage(supabase, user.id, "design_drill", r.provider, r.model);
    } catch (e) {
      if (e instanceof QuotaExceededError || e instanceof AIUnavailableError) return { ok: false, message: e.message };
      return { ok: false, message: "Grading failed (the AI provider returned an unusable reply). Your answers are still on the page — try again." };
    }
  }

  let dropped = 0;
  const results: DrillResult[] = items.map((it) => {
    const i = answered.indexOf(it);
    const v = verifyKeyPoints(it.question!, it.answer, i >= 0 ? claims.find((c) => c.index === i)?.covered ?? [] : []);
    dropped += v.dropped;
    return { slug: it.slug, q: it.question!.q, answer: it.answer, covered: v.covered, missed: v.missed };
  });
  const score = results.reduce((a, r) => a + r.covered.length, 0);
  const total = results.reduce((a, r) => a + r.covered.length + r.missed.length, 0);

  await supabase.from("quiz_attempts").insert({ user_id: user.id, quiz_slug: "design-fundamentals", topic: "design", score, total, answers: results.map((r) => ({ slug: r.slug, covered: r.covered.map((c) => c.id), missed: r.missed.map((m) => m.id) })) });
  const { data: existing } = await supabase.from("flashcards").select("back").eq("topic", "System design").limit(1000);
  const have = new Set((existing ?? []).map((x) => x.back));
  const cards = results.flatMap((r) => r.missed.map((m) => ({ user_id: user.id, front: r.q, back: m.point, topic: "System design" }))).filter((c) => !have.has(c.back));
  if (cards.length) await supabase.from("flashcards").insert(cards);
  return { ok: true, results, score, total, dropped };
}
