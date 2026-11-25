"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";
import { extractResumeText, ResumeFileError, MAX_RESUME_BYTES, PDF_MIME, DOCX_MIME } from "@/lib/resume/extract";
import { analyzeResume } from "@/lib/resume/rules";
import { analyzeResumeWithAI } from "@/lib/services/resume-ai";
import { AIUnavailableError } from "@/lib/ai";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";
import type { ActionState } from "./types";

export async function uploadResume(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const file = fd.get("resume");
  if (!(file instanceof File) || file.size === 0) return { message: "Choose a PDF or DOCX file to upload." };
  if (file.size > MAX_RESUME_BYTES) return { message: "The file is larger than 5 MB." };

  const buf = new Uint8Array(await file.arrayBuffer());
  let extracted;
  try {
    extracted = await extractResumeText(buf);
  } catch (e) {
    return { message: e instanceof ResumeFileError ? e.message : "We couldn't process that file." };
  }

  const profile = await getProfile(supabase, user.id);
  const rules = analyzeResume(extracted.text, profile?.target_role ?? null);
  const id = crypto.randomUUID();
  const path = `${user.id}/${id}.${extracted.kind}`;
  const mime = extracted.kind === "pdf" ? PDF_MIME : DOCX_MIME;

  const up = await supabase.storage.from("resumes").upload(path, buf, { contentType: mime, upsert: false });
  if (up.error) return { message: "Upload failed. Please try again." };

  const safeName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || `resume.${extracted.kind}`;
  const ins = await supabase.from("resumes").insert({
    id, user_id: user.id, file_path: path, file_name: safeName, mime_type: mime,
    size_bytes: buf.byteLength, raw_text: extracted.text, is_active: true,
  });
  if (ins.error) {
    await supabase.storage.from("resumes").remove([path]);
    return { message: "Could not save the resume. Please try again." };
  }
  await supabase.from("resumes").update({ is_active: false }).eq("user_id", user.id).neq("id", id);
  await supabase.from("resume_analyses").insert({
    resume_id: id, user_id: user.id, rule_scores: rules, overall_score: rules.score,
  });

  revalidatePath("/resume");
  revalidatePath("/dashboard");
  redirect(`/resume/${id}`);
}

export async function runAiResumeAnalysis(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const resumeId = String(fd.get("resume_id") ?? "");
  const profile = await getProfile(supabase, user.id);

  // Consent can be given inline; it's stored on the profile and revocable in Settings.
  if (!profile?.ai_resume_consent) {
    if (fd.get("consent") !== "on") return { message: "Please confirm you agree to send your resume text to the AI provider." };
    await supabase.from("profiles").update({ ai_resume_consent: true }).eq("id", user.id);
  }

  const { data: resume } = await supabase.from("resumes").select("id, raw_text").eq("id", resumeId).maybeSingle();
  if (!resume?.raw_text) return { message: "Resume not found." };

  try {
    await assertQuota(supabase, user.id);
    const ai = await analyzeResumeWithAI(resume.raw_text, profile?.target_role ?? null, profile?.experience_level ?? null);
    await recordUsage(supabase, user.id, "resume_analysis", ai.provider, ai.model);

    const { data: latest } = await supabase.from("resume_analyses").select("id")
      .eq("resume_id", resumeId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    await supabase.from("resume_analyses").update({
      ai_findings: { ...ai.result, dropped: ai.dropped }, provider: ai.provider, model: ai.model,
    }).eq("id", latest!.id);
    await supabase.from("resumes").update({ parsed: ai.result.profile }).eq("id", resumeId);

    // Replace claim set for this resume
    await supabase.from("resume_claims").delete().eq("resume_id", resumeId);
    if (ai.result.claims.length) {
      await supabase.from("resume_claims").insert(ai.result.claims.map((c) => ({
        resume_id: resumeId, user_id: user.id, claim: c.claim, section: c.section, risk: c.risk,
        questions: { concern: c.concern, items: c.questions },
      })));
    }
    // Seed project records from the resume (skips ones already created by name)
    const { data: existing } = await supabase.from("projects").select("title").eq("user_id", user.id);
    const have = new Set((existing ?? []).map((p) => p.title.toLowerCase()));
    const newProjects = ai.result.profile.projects.filter((p) => !have.has(p.name.toLowerCase()));
    if (newProjects.length) {
      await supabase.from("projects").insert(newProjects.map((p) => ({
        user_id: user.id, resume_id: resumeId, title: p.name.slice(0, 200),
        description: [p.summary, ...p.bullets].filter(Boolean).join("\n"), technologies: p.technologies,
      })));
    }
  } catch (e) {
    if (e instanceof QuotaExceededError || e instanceof AIUnavailableError) return { message: e.message };
    console.error("[resume-ai] failed:", e instanceof Error ? e.message : e);
    return { message: "The AI analysis didn't complete (the provider returned an unusable response). Please try again." };
  }

  revalidatePath(`/resume/${resumeId}`);
  return { ok: true, message: "AI analysis complete." };
}

export async function deleteResume(fd: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(fd.get("resume_id") ?? "");
  const { data: r } = await supabase.from("resumes").select("file_path").eq("id", id).maybeSingle();
  if (r) {
    await supabase.storage.from("resumes").remove([r.file_path]);
    await supabase.from("resumes").delete().eq("id", id).eq("user_id", user.id);
  }
  revalidatePath("/resume");
  redirect("/resume");
}
