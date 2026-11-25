import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { UploadForm } from "@/components/resume/upload-form";
import { requireUser } from "@/lib/supabase/server";
import { getPrefs } from "@/lib/prefs";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: "Resume intelligence" };

export default async function ResumePage() {
  const { supabase } = await requireUser();
  const { vibe } = await getPrefs();
  const { data: resumes } = await supabase
    .from("resumes")
    .select("id, file_name, created_at, is_active, resume_analyses(overall_score, ai_findings, created_at)")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resume intelligence</h1>
        <p className="mt-1 text-muted">Find out what an interviewer will ask about every line of your resume — and whether you can defend it.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><UploadForm /></div>
        <Card className="lg:col-span-2">
          <h2 className="font-medium">What you get</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>• A transparent readability score — every point explained</li>
            <li>• Skills you list but never demonstrate</li>
            <li>• Missing keywords for your target role</li>
            <li>• With AI: claim-by-claim interview questions, risk flags and bullet rewrites that never invent facts</li>
            <li>• Your claims feed the project deep-dive and mock interviews</li>
          </ul>
        </Card>
      </div>

      <section aria-labelledby="history-h">
        <h2 id="history-h" className="mb-3 font-medium">Your resumes</h2>
        {!resumes?.length ? (
          <Card className="text-center text-sm text-muted">{copy(vibe, "noResumes")}</Card>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {resumes.map((r) => {
              const a = [...(r.resume_analyses ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
              return (
                <li key={r.id}>
                  <Link href={`/resume/${r.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
                    <FileText className="size-5 shrink-0 text-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.file_name}</p>
                      <p className="text-xs text-muted">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    {r.is_active && <Badge tone="accent">Active</Badge>}
                    {a?.ai_findings && <Badge tone="success">AI analysed</Badge>}
                    {a?.overall_score != null && <span className="font-mono text-sm tabular-nums">{a.overall_score}/100</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
