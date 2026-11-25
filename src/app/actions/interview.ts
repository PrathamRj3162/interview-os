"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { PERSONAS, KINDS, DIFFICULTIES, DURATIONS } from "@/lib/interview/config";
import { LANGUAGES, COMPANIES } from "@/lib/validation/profile";
import { PROBLEMS, PROBLEM_BY_SLUG, DIFFICULTY_POOL } from "@/lib/dsa/bank";
import { initialWorkspace } from "@/lib/dsa/server";
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
});

export async function createInterview(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const blank = (v: FormDataEntryValue | null) => (v === null || v === "" || v === "none" ? null : String(v));
  const parsed = schema.safeParse({
    kind: fd.get("kind"), persona: fd.get("persona"), difficulty: fd.get("difficulty"),
    duration_min: fd.get("duration_min"), mode: fd.get("mode"), input_mode: fd.get("input_mode"),
    language: blank(fd.get("language")), company: blank(fd.get("company")), resume_id: blank(fd.get("resume_id")),
    problem_slug: blank(fd.get("problem_slug")),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), message: "Please check the highlighted options." };

  // Only allow the user's own resume (RLS would also block reads of someone else's).
  if (parsed.data.resume_id) {
    const { data } = await supabase.from("resumes").select("id").eq("id", parsed.data.resume_id).maybeSingle();
    if (!data) return { message: "That resume wasn't found." };
  }

  const { problem_slug: chosen, ...fields } = parsed.data;
  const row: Record<string, unknown> = { ...fields, user_id: user.id };

  // The DSA round gets one problem from the bank: the chosen one, or a random fresh one at this difficulty.
  if (parsed.data.kind === "dsa") {
    let slug = chosen;
    if (!slug) {
      const { data: done } = await supabase.from("submissions").select("problem_slug").eq("user_id", user.id).eq("status", "accepted").limit(500);
      const solved = new Set((done ?? []).map((d) => d.problem_slug));
      const pool = PROBLEMS.filter((p) => DIFFICULTY_POOL[parsed.data.difficulty].includes(p.difficulty));
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
