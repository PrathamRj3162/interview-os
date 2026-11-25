"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { PERSONAS, KINDS, DIFFICULTIES, DURATIONS } from "@/lib/interview/config";
import { LANGUAGES, COMPANIES } from "@/lib/validation/profile";
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
});

export async function createInterview(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const blank = (v: FormDataEntryValue | null) => (v === null || v === "" || v === "none" ? null : String(v));
  const parsed = schema.safeParse({
    kind: fd.get("kind"), persona: fd.get("persona"), difficulty: fd.get("difficulty"),
    duration_min: fd.get("duration_min"), mode: fd.get("mode"), input_mode: fd.get("input_mode"),
    language: blank(fd.get("language")), company: blank(fd.get("company")), resume_id: blank(fd.get("resume_id")),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), message: "Please check the highlighted options." };

  // Only allow the user's own resume (RLS would also block reads of someone else's).
  if (parsed.data.resume_id) {
    const { data } = await supabase.from("resumes").select("id").eq("id", parsed.data.resume_id).maybeSingle();
    if (!data) return { message: "That resume wasn't found." };
  }

  const { data, error } = await supabase.from("mock_interviews").insert({ ...parsed.data, user_id: user.id }).select("id").single();
  if (error) {
    console.error("[create-interview]", error.code);
    return { message: error.code === "42703" || error.code === "23514"
      ? "The database needs its latest migration (0003). Ask the maintainer to apply it."
      : "Could not start the interview. Please try again." };
  }
  redirect(`/interview/${data.id}`);
}
