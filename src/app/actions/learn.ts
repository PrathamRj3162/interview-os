"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QUESTION_BY_ID, TOPIC_BY_SLUG, QUIZ_SIZE } from "@/lib/learn/fundamentals";
import { review, type Grade } from "@/lib/learn/sm2";
import { PRIMER_BY_SLUG } from "@/lib/learn/primers";

const progressSchema = z.object({
  itemType: z.enum(["lesson", "hld", "lld"]),
  slug: z.string().regex(/^[a-z0-9:_-]{2,80}$/),
  topic: z.string().trim().max(120).optional(),
  done: z.boolean(),
});

/** Mark a lesson / design case as read (or unread). Own rows only (RLS). */
export async function markProgress(input: z.input<typeof progressSchema>): Promise<{ ok: boolean }> {
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const { itemType, slug, topic, done } = parsed.data;
  const { error } = await supabase.from("user_progress").upsert({
    user_id: user.id, item_type: itemType, item_slug: slug, topic: topic ?? null,
    status: done ? "completed" : "started", updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,item_type,item_slug" });
  revalidatePath("/", "layout");
  return { ok: !error };
}

const attemptSchema = z.object({ kind: z.enum(["hld", "lld"]), slug: z.string().regex(/^[a-z0-9-]{2,80}$/) });

/** "I've attempted it": unlocks a design case's reference answer (self-reported). Never downgrades "studied". */
export async function markAttempted(input: z.input<typeof attemptSchema>): Promise<{ ok: boolean }> {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("user_progress").upsert(
    { user_id: user.id, item_type: parsed.data.kind, item_slug: parsed.data.slug, status: "started", updated_at: new Date().toISOString() },
    { onConflict: "user_id,item_type,item_slug", ignoreDuplicates: true },
  );
  revalidatePath(`/system-design/${parsed.data.slug}`);
  return { ok: !error };
}

const primerSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,80}$/), answers: z.array(z.number().int().min(-1).max(9)).max(10) });

/** Grades a primer's check questions on the server (the key never reaches the browser). All correct = studied. */
export async function gradePrimer(input: z.input<typeof primerSchema>): Promise<{ ok: boolean; results: { correct: boolean; answer: string; why: string }[] }> {
  const parsed = primerSchema.safeParse(input);
  const p = parsed.success ? PRIMER_BY_SLUG[parsed.data.slug] : undefined;
  if (!parsed.success || !p) return { ok: false, results: [] };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, results: [] };
  const results = p.checks.map((c, i) => ({ correct: parsed.data.answers[i] === c.answer, answer: c.options[c.answer], why: c.why }));
  if (results.every((r) => r.correct)) {
    await supabase.from("user_progress").upsert({ user_id: user.id, item_type: "lesson", item_slug: `primer:${p.slug}`, topic: p.title, status: "completed", updated_at: new Date().toISOString() }, { onConflict: "user_id,item_type,item_slug" });
    revalidatePath("/system-design/primers");
  }
  return { ok: true, results };
}

// ───────────── CS fundamentals quizzes ─────────────


/** Grades a quiz on the server, stores the attempt, and turns every miss into a revision flashcard. */
export async function gradeQuiz(fd: FormData): Promise<void> {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");
  const topic = String(fd.get("topic") ?? "");
  if (!TOPIC_BY_SLUG[topic]) redirect("/fundamentals");
  let ids: string[] = [];
  try { ids = JSON.parse(String(fd.get("ids") ?? "[]")); } catch { /* fall through */ }
  ids = [...new Set(ids)].filter((id) => QUESTION_BY_ID[id]?.topic === topic).slice(0, QUIZ_SIZE);
  if (!ids.length) redirect(`/fundamentals/${topic}`);
  const answers = ids.map((id) => {
    const raw = fd.get(`a_${id}`);
    const chosen = raw === null ? null : Number(raw);
    return { id, chosen: Number.isInteger(chosen) ? chosen : null, correct: chosen === QUESTION_BY_ID[id].answer };
  });
  const score = answers.filter((a) => a.correct).length;
  const { data, error } = await supabase.from("quiz_attempts")
    .insert({ user_id: user.id, quiz_slug: `${topic}-quiz`, topic, score, total: answers.length, answers }).select("id").single();
  if (error || !data) redirect(`/fundamentals/${topic}?error=save`);

  const missed = answers.filter((a) => !a.correct).map((a) => QUESTION_BY_ID[a.id]);
  if (missed.length) {
    const { data: existing } = await supabase.from("flashcards").select("front").in("front", missed.map((q) => q.q));
    const have = new Set((existing ?? []).map((c) => c.front));
    const fresh = missed.filter((q) => !have.has(q.q));
    if (fresh.length) await supabase.from("flashcards").insert(fresh.map((q) => ({ user_id: user.id, front: q.q, back: `${q.options[q.answer]}\n\n${q.why}`, topic: TOPIC_BY_SLUG[topic].name })));
  }
  revalidatePath("/fundamentals");
  redirect(`/fundamentals/result/${data.id}`);
}

// ───────────── Revision (SM-2 flashcards) ─────────────


const reviewSchema = z.object({ id: z.uuid(), grade: z.enum(["again", "hard", "good", "easy"]) });

export async function reviewCard(input: { id: string; grade: Grade }): Promise<{ ok: boolean; due_at?: string }> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const { data: card } = await supabase.from("flashcards").select("ease, interval_days, repetitions").eq("id", parsed.data.id).maybeSingle();
  if (!card) return { ok: false };
  const next = review({ ease: Number(card.ease), interval_days: card.interval_days, repetitions: card.repetitions }, parsed.data.grade);
  const { error } = await supabase.from("flashcards").update(next).eq("id", parsed.data.id);
  return { ok: !error, due_at: next.due_at };
}

const cardSchema = z.object({ front: z.string().trim().min(3).max(2000), back: z.string().trim().min(1).max(5000), topic: z.string().trim().max(120).optional() });

export async function addCard(_: unknown, fd: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = cardSchema.safeParse({ front: fd.get("front"), back: fd.get("back"), topic: fd.get("topic") || undefined });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the card." };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const { error } = await supabase.from("flashcards").insert({ user_id: user.id, ...parsed.data, topic: parsed.data.topic ?? "Custom" });
  revalidatePath("/revision");
  return error ? { ok: false, message: "Couldn't save the card." } : { ok: true, message: "Card added — it's due now." };
}

export async function deleteCard(id: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const { supabase } = await getCurrentUser();
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  revalidatePath("/revision");
  return { ok: !error };
}

/** Turn concepts your interview reports said you missed into cards (skips ones you already have). */
export async function cardsFromReports(): Promise<{ ok: boolean; added: number }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, added: 0 };
  const { data: rows } = await supabase.from("mock_interviews").select("id, kind, missed:report->missed_concepts, questions:report->questions").eq("status", "completed").order("started_at", { ascending: false }).limit(30);
  const cards = new Map<string, string>();
  for (const r of rows ?? []) {
    const qs = (Array.isArray(r.questions) ? r.questions : []) as { question?: string; strong_answer?: string; missing?: string[] }[];
    for (const c of (Array.isArray(r.missed) ? r.missed : []) as string[]) {
      if (typeof c !== "string" || cards.has(c)) continue;
      const related = qs.find((q) => (q.missing ?? []).some((m) => m.toLowerCase().includes(c.toLowerCase())) || (q.strong_answer ?? "").toLowerCase().includes(c.toLowerCase()));
      cards.set(c, related?.strong_answer ? `From your interview: ${related.strong_answer}`.slice(0, 1500) : `Explain ${c} in two or three sentences, with an example and a trade-off. (Flagged as missed in a ${r.kind} interview — check your report.)`);
    }
  }
  const fronts = [...cards.keys()].map((c) => `Explain: ${c}`.slice(0, 2000));
  if (!fronts.length) return { ok: true, added: 0 };
  const { data: existing } = await supabase.from("flashcards").select("front").in("front", fronts);
  const have = new Set((existing ?? []).map((c) => c.front));
  const fresh = [...cards.entries()].filter(([c]) => !have.has(`Explain: ${c}`.slice(0, 2000))).slice(0, 50);
  if (fresh.length) await supabase.from("flashcards").insert(fresh.map(([c, back]) => ({ user_id: user.id, front: `Explain: ${c}`.slice(0, 2000), back, topic: "From interviews" })));
  revalidatePath("/revision");
  return { ok: true, added: fresh.length };
}
