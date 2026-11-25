"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import { snapshotRepo, parseRepoUrl, RepoError } from "@/lib/projects/github";
import { analyseRepo, repoFacts, ruleQuestions } from "@/lib/projects/analyze";
import { AIUnavailableError, aiStatus } from "@/lib/ai";
import { assertQuota, recordUsage, QuotaExceededError } from "@/lib/ai/quota";

const projectSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().default(""),
  technologies: z.string().trim().max(500).optional().default(""),
  repo_url: z.string().trim().max(300).optional().default("").refine((u) => !u || parseRepoUrl(u), "Use a public GitHub URL like https://github.com/owner/repo"),
});

export async function addProject(_: unknown, fd: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = projectSchema.safeParse({ title: fd.get("title"), description: fd.get("description") ?? "", technologies: fd.get("technologies") ?? "", repo_url: fd.get("repo_url") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const p = parsed.data;
  const repo = p.repo_url ? p.repo_url.replace(/\.git$/, "").replace(/\/$/, "") : null;
  const { error } = await supabase.from("projects").insert({
    user_id: user.id, title: p.title, description: p.description || null,
    technologies: p.technologies.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20), repo_url: repo,
  });
  revalidatePath("/projects");
  return error ? { ok: false, message: "Couldn't save the project." } : { ok: true, message: "Project added." };
}

/**
 * Reads the public repo, then asks the AI for a summary and likely questions (counts toward the daily AI
 * limit). Without AI, saves deterministic facts and template questions. Results are written server-side.
 */
export async function analyseProject(id: string): Promise<{ ok: boolean; message: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Unknown project." };
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const { data: project } = await supabase.from("projects").select("id, title, description, technologies, repo_url, analysis").eq("id", id).maybeSingle();
  if (!project) return { ok: false, message: "Project not found." };
  if (!project.repo_url) return { ok: false, message: "Add a public GitHub URL to this project first." };
  const last = (project.analysis as { analysedAt?: string } | null)?.analysedAt;
  if (last && Date.now() - Date.parse(last) < 10 * 60_000) return { ok: false, message: "Analysed a few minutes ago — try again later." };

  let snap;
  try { snap = await snapshotRepo(project.repo_url); }
  catch (e) { return { ok: false, message: e instanceof RepoError ? e.message : "Couldn't read the repository." }; }

  let analysis;
  let note = "";
  try {
    if (!aiStatus().length) throw new AIUnavailableError();
    await assertQuota(supabase, user.id);
    analysis = await analyseRepo(snap, project);
    await recordUsage(supabase, user.id, "project_analysis", analysis.provider ?? "ai", analysis.model ?? "");
  } catch (e) {
    if (!(e instanceof QuotaExceededError || e instanceof AIUnavailableError || (e instanceof Error && e.message.startsWith("AI output")))) throw e;
    note = e instanceof QuotaExceededError ? " (daily AI limit reached — showing repository facts and template questions)" : " (AI unavailable — showing repository facts and template questions)";
    analysis = { summary: snap.description ?? `${project.title} — ${snap.fullName}`, architecture: "", facts: repoFacts(snap), questions: ruleQuestions(snap, project.title), verify: [], source: "rules" as const, analysedAt: new Date().toISOString() };
  }
  const { readme: _readme, ...snapshot } = snap; void _readme;
  const { error } = await createAdminClient().from("projects").update({ repo_snapshot: snapshot, analysis }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/projects"); revalidatePath(`/projects/${id}`);
  return error ? { ok: false, message: "Couldn't save the analysis." } : { ok: true, message: `Analysed ${snap.fullName}${note}.` };
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const { supabase } = await getCurrentUser();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/projects");
  return { ok: !error };
}
