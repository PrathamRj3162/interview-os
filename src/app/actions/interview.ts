"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { CASE_BY_SLUG } from "@/lib/learn/design";
import { requireUser, getCurrentUser } from "@/lib/supabase/server";
import { PERSONAS, KINDS, DIFFICULTIES, DURATIONS } from "@/lib/interview/config";
import { LANGUAGES, COMPANIES } from "@/lib/validation/profile";
import { PROBLEMS, PROBLEM_BY_SLUG, DIFFICULTY_POOL } from "@/lib/dsa/bank";
import { initialWorkspace } from "@/lib/dsa/server";
import { COMPANY_BY_NAME } from "@/lib/interview/companies";
import { fieldErrorsFrom, type ActionState } from "./types";

const keys = <T extends object>(o: T) => Object.keys(o) as [string, ...string[]];

const schema = z.object({
  kind: z.enum(keys(KINDS)),
  persona: z.enum(keys(PERSONAS)),
  difficulty: z.enum(keys(DIFFICULTIES)),
  duration_min: z.coerce.number().refine((n) => (DURATIONS as readonly number[]).includes(n), "Pick a duration"),
  mode: z.enum(["mock", "practice"]),
  input_mode: z.enum(["text", "voice"]),
  language: z.enum(keys(LANGUAGES)).nullable(),
  company: z.enum(COMPANIES).nullable(),
  resume_id: z.uuid().nullable(),
  problem_slug: z.string().refine((s) => s in PROBLEM_BY_SLUG, "Unknown problem").nullable(),
  /** Focus for this interview, e.g. a system design lab topic. */
  topic: z.string().trim().max(200).nullable(),
  /** System design lab case this round is about (links the round to its checklist and curveballs). */
  design_case: z.string().refine((s) => s in CASE_BY_SLUG, "Unknown case").nullable(),
  project_id: z.uuid().nullable(),
});

export async function createInterview(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const blank = (v: FormDataEntryValue | null) => (v === null || v === "" || v === "none" ? null : String(v));
  const parsed = schema.safeParse({
    kind: fd.get("kind"), persona: fd.get("persona"), difficulty: fd.get("difficulty"),
    duration_min: fd.get("duration_min"), mode: fd.get("mode"), input_mode: fd.get("input_mode"),
    language: blank(fd.get("language")), company: blank(fd.get("company")), resume_id: blank(fd.get("resume_id")),
    problem_slug: blank(fd.get("problem_slug")),
    topic: blank(fd.get("topic")), project_id: blank(fd.get("project_id")), design_case: blank(fd.get("design_case")),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), message: "Please check the highlighted options." };

  // Only allow the user's own resume (RLS would also block reads of someone else's).
  if (parsed.data.resume_id) {
    const { data } = await supabase.from("resumes").select("id").eq("id", parsed.data.resume_id).maybeSingle();
    if (!data) return { message: "That resume wasn't found." };
  }

  if (parsed.data.project_id) {
    const { data } = await supabase.from("projects").select("id").eq("id", parsed.data.project_id).maybeSingle();
    if (!data) return { message: "That project wasn't found." };
  }
  const { problem_slug: chosen, ...fields } = parsed.data;
  const row: Record<string, unknown> = { ...fields, user_id: user.id };
  // A case only applies to design rounds of the same kind; the HLD round starts in its first phase.
  if (fields.design_case && CASE_BY_SLUG[fields.design_case].kind !== fields.kind) row.design_case = null;
  if (fields.kind === "hld") row.phase = "requirements";

  // The DSA round gets one problem from the bank: the chosen one, or a random fresh one at this difficulty.
  if (parsed.data.kind === "dsa") {
    let slug = chosen;
    if (!slug) {
      const { data: done } = await supabase.from("submissions").select("problem_slug").eq("user_id", user.id).eq("status", "accepted").limit(500);
      const solved = new Set((done ?? []).map((d) => d.problem_slug));
      let pool = PROBLEMS.filter((p) => DIFFICULTY_POOL[parsed.data.difficulty].includes(p.difficulty));
      // Company style practice: favour that company's commonly reported topics when any match.
      const focus = parsed.data.company ? COMPANY_BY_NAME[parsed.data.company]?.dsaTopics ?? [] : [];
      const styled = pool.filter((p) => p.topics.some((t) => focus.includes(t)));
      if (styled.length) pool = styled;
      const fresh = pool.filter((p) => !solved.has(p.slug));
      const from = fresh.length ? fresh : pool;
      slug = from[Math.floor(Math.random() * from.length)].slug;
    }
    let language = parsed.data.language;
    if (!language) {
      const { data: prof } = await supabase.from("profiles").select("preferred_language").eq("id", user.id).maybeSingle();
      language = prof?.preferred_language ?? "python";
    }
    Object.assign(row, { problem_slug: slug, phase: "intro", language, workspace: initialWorkspace(PROBLEM_BY_SLUG[slug!], language) });
  }

  const { data, error } = await supabase.from("mock_interviews").insert(row).select("id").single();
  if (error) {
    console.error("[create-interview]", error.code);
    return { message: error.code === "42703" || error.code === "23514"
      ? "The database needs its latest migration (0004). Ask the maintainer to apply it."
      : "Could not start the interview. Please try again." };
  }
  redirect(`/interview/${data.id}`);
}

const ratingSchema = z.object({
  id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  note: z.string().trim().max(500).optional().default(""),
});

/** Candidate's emoji rating of an interview (their own row only — RLS + column grant). */
export async function rateInterview(input: { id: string; rating: number; note?: string }): Promise<{ ok: boolean; message?: string }> {
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid rating." };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const { data, error } = await supabase.from("mock_interviews")
    .update({ user_rating: parsed.data.rating, rating_note: parsed.data.note || null })
    .eq("id", parsed.data.id).eq("user_id", user.id).select("id");
  if (error || !data?.length) return { ok: false, message: "Couldn't save your rating." };
  return { ok: true };
}
