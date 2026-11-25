"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import { snapshotRepo, parseRepoUrl, RepoError, RateLimitError, type RepoSnapshot } from "@/lib/projects/github";
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

const snapshotSchema = z.object({
  fetchedAt: z.string().max(40), fullName: z.string().max(200), description: z.string().max(1000).nullable(), stars: z.number().int().min(0),
  defaultBranch: z.string().max(200), pushedAt: z.string().max(40).nullable(),
  languages: z.array(z.object({ name: z.string().max(60), pct: z.number().min(0).max(100) })).max(20),
  topDirs: z.array(z.string().max(200)).max(40), fileCount: z.number().int().min(0).max(1_000_000),
  signals: z.object({ tests: z.boolean(), ci: z.boolean(), docker: z.boolean(), license: z.boolean() }),
  dependencies: z.array(z.string().max(200)).max(100), filesRead: z.array(z.string().max(300)).max(10),
  readme: z.string().max(8000), via: z.enum(["server", "cache", "browser"]).optional(),
});

type ProjectRow = { id: string; title: string; description: string | null; technologies: string[]; repo_url: string | null; analysis: unknown };
type Result = { ok: boolean; message: string; rateLimited?: boolean };

async function loadProject(id: string) {
  if (!z.uuid().safeParse(id).success) return { error: "Unknown project." } as const;
  const { supabase, user } = await getCurrentUser();
  if (!user) return { error: "Not signed in." } as const;
  const { data: project } = await supabase.from("projects").select("id, title, description, technologies, repo_url, analysis").eq("id", id).maybeSingle();
  if (!project) return { error: "Project not found." } as const;
  if (!project.repo_url) return { error: "Add a public GitHub URL to this project first." } as const;
  const last = (project.analysis as { analysedAt?: string } | null)?.analysedAt;
  if (last && Date.now() - Date.parse(last) < 10 * 60_000) return { error: "Analysed a few minutes ago — try again later." } as const;
  return { supabase, user, project: project as ProjectRow };
}

/** Any user's snapshot of the same public repo from the last 24 hours (public data, so it can be shared). */
async function cachedSnapshot(repoUrl: string): Promise<RepoSnapshot | null> {
  const { data } = await createAdminClient().from("projects").select("repo_snapshot").ilike("repo_url", repoUrl).not("repo_snapshot", "is", null).limit(20);
  const fresh = (data ?? []).map((r) => r.repo_snapshot as RepoSnapshot).filter((s) => s?.readme !== undefined && Date.now() - Date.parse(s.fetchedAt) < 24 * 3600_000)
    .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))[0];
  return fresh ? { ...fresh, via: "cache" } : null;
}

async function runAnalysis(ctx: Exclude<Awaited<ReturnType<typeof loadProject>>, { error: string }>, snap: RepoSnapshot): Promise<Result> {
  const { supabase, user, project } = ctx;
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
  const { error } = await createAdminClient().from("projects").update({ repo_snapshot: snap, analysis }).eq("id", project.id).eq("user_id", user.id);
  revalidatePath("/projects"); revalidatePath(`/projects/${project.id}`);
  const how = snap.via === "cache" ? " using a copy read in the last 24 hours" : snap.via === "browser" ? " (read from your browser)" : "";
  return error ? { ok: false, message: "Couldn't save the analysis." } : { ok: true, message: `Analysed ${snap.fullName}${how}${note}.` };
}

/**
 * Reads the public repo (a fresh shared copy if one exists, otherwise from the server), then asks the AI for a
 * summary and likely questions (counts toward the daily AI limit). Without AI, saves deterministic facts and
 * template questions. If the server's GitHub quota is used up, returns rateLimited so the page can read the
 * repo from the user's browser instead and call analyseProjectWithSnapshot.
 */
export async function analyseProject(id: string): Promise<Result> {
  const ctx = await loadProject(id);
  if ("error" in ctx) return { ok: false, message: ctx.error! };
  let snap = await cachedSnapshot(ctx.project.repo_url!);
  if (!snap) {
    try { snap = await snapshotRepo(ctx.project.repo_url!); }
    catch (e) {
      if (e instanceof RateLimitError) return { ok: false, rateLimited: true, message: `${e.message} Reading it from your browser instead…` };
      return { ok: false, message: e instanceof RepoError ? e.message : "Couldn't read the repository." };
    }
  }
  return runAnalysis(ctx, snap);
}

/** Fallback: the browser read the public repo itself. The snapshot is validated and must match this project's repo. */
export async function analyseProjectWithSnapshot(id: string, raw: unknown): Promise<Result> {
  const ctx = await loadProject(id);
  if ("error" in ctx) return { ok: false, message: ctx.error! };
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "The repository data from your browser wasn't valid." };
  const want = parseRepoUrl(ctx.project.repo_url!);
  if (!want || parsed.data.fullName.toLowerCase() !== `${want.owner}/${want.repo}`.toLowerCase()) return { ok: false, message: "That data is for a different repository." };
  return runAnalysis(ctx, { ...parsed.data, via: "browser" });
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const { supabase } = await getCurrentUser();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/projects");
  return { ok: !error };
}
