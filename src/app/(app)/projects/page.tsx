import type { Metadata } from "next";
import Link from "next/link";
import { GitBranch, Mic } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { AddProjectForm, AnalyseButton, DeleteProjectButton } from "@/components/learn/projects-ui";

export const metadata: Metadata = { title: "Project deep-dive" };

export default async function ProjectsPage() {
  const { supabase } = await requireUser();
  const { data: projects } = await supabase.from("projects").select("id, title, description, technologies, repo_url, analysis, created_at").order("created_at", { ascending: false }).limit(50);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Project deep-dive</h1>
        <p className="text-sm text-muted">Interviewers spend a lot of time on your projects. Add them (projects from your resume appear automatically), link a public GitHub repo to get questions grounded in the actual code, then practise defending it with Rohan, the skeptical evaluator.</p>
      </div>
      <Card><h2 className="mb-3 font-medium">Add a project</h2><AddProjectForm /></Card>
      {projects?.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const a = p.analysis as { summary?: string; questions?: unknown[]; source?: string } | null;
            return (
              <li key={p.id}>
                <Card className="flex h-full flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 font-semibold hover:underline">{p.title}</Link>
                    <DeleteProjectButton id={p.id} />
                  </div>
                  {p.repo_url && <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted hover:text-text"><GitBranch className="size-3.5" aria-hidden />{p.repo_url.replace("https://github.com/", "")}</a>}
                  <p className="line-clamp-3 text-sm text-muted">{a?.summary ?? p.description ?? "No description."}</p>
                  {p.technologies.length > 0 && <div className="flex flex-wrap gap-1">{p.technologies.slice(0, 8).map((t: string) => <Badge key={t}>{t}</Badge>)}</div>}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    <Link href={`/interview/new?kind=project&persona=skeptic&project=${p.id}`} className={buttonClasses("primary", "sm")}><Mic className="size-4" aria-hidden />Practise a deep dive</Link>
                    {a?.questions ? <Link href={`/projects/${p.id}`} className={buttonClasses("secondary", "sm")}>{a.questions.length} likely questions</Link> : <AnalyseButton id={p.id} hasRepo={Boolean(p.repo_url)} />}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : <Card className="text-sm text-muted">No projects yet. Add one above, or upload your resume and its projects are extracted for you.</Card>}
    </div>
  );
}
