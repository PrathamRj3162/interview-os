import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Trash2, Mic } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { AiAnalysisForm } from "@/components/resume/ai-form";
import { deleteResume } from "@/app/actions/resume";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";
import { aiStatus } from "@/lib/ai";
import type { RuleReport } from "@/lib/resume/rules";
import type { ResumeAi } from "@/lib/services/resume-ai";

export const metadata: Metadata = { title: "Resume report" };

const riskTone = { high: "warning", medium: "accent", low: "neutral" } as const;

export default async function ResumeReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: resume }, { data: analyses }, profile] = await Promise.all([
    supabase.from("resumes").select("id, file_name, raw_text, created_at").eq("id", id).maybeSingle(),
    supabase.from("resume_analyses").select("rule_scores, ai_findings, provider, model, created_at").eq("resume_id", id).order("created_at", { ascending: false }).limit(1),
    getProfile(supabase, user.id),
  ]);
  if (!resume) notFound();
  const analysis = analyses?.[0];
  const rules = analysis?.rule_scores as RuleReport | undefined;
  const ai = analysis?.ai_findings as (ResumeAi & { dropped?: { claims: number; rewrites: number } }) | null;
  const providers = aiStatus();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/resume" className="text-sm text-muted hover:text-text">← All resumes</Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{resume.file_name}</h1>
          <p className="text-sm text-muted">Uploaded {new Date(resume.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/resume/${id}/file`} className={buttonClasses("secondary", "sm")}><Download className="size-4" aria-hidden /> Original</a>
          <form action={deleteResume}>
            <input type="hidden" name="resume_id" value={id} />
            <Button type="submit" variant="ghost" size="sm" aria-label="Delete this resume and its analysis"><Trash2 className="size-4" aria-hidden /> Delete</Button>
          </form>
        </div>
      </div>

      {rules && (
        <section aria-labelledby="score-h" className="grid gap-6 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted" id="score-h">Readability &amp; quality score</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums">{rules.score}<span className="text-xl text-muted">/100</span></p>
            <p className="mt-3 text-xs text-muted">Sum of the rule checks on the right. A practice heuristic — it does not predict any company&apos;s ATS outcome.</p>
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="font-medium">How the score was calculated</h2>
            <ul className="mt-3 divide-y divide-border">
              {rules.checks.map((c) => (
                <li key={c.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className="font-mono text-sm tabular-nums">{c.earned}/{c.weight}</span>
                  </div>
                  <p className="text-sm text-muted">{c.detail}</p>
                  {c.tip && c.earned < c.weight && <p className="mt-0.5 text-xs text-accent">{c.tip}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {rules && (
        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="font-medium">Skills detected</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rules.stats.skillsFound.length ? rules.stats.skillsFound.map((s) => (
                <Badge key={s} tone={rules.stats.unsupportedSkills.includes(s) ? "warning" : "neutral"}>{s}</Badge>
              )) : <p className="text-sm text-muted">No common technical skills recognised.</p>}
            </div>
            {rules.stats.unsupportedSkills.length > 0 && (
              <p className="mt-3 text-xs text-warning">Highlighted skills are listed but not used in any project or experience entry — expect questions on them.</p>
            )}
          </Card>
          <Card>
            <h2 className="font-medium">Keywords for your target role</h2>
            {rules.stats.missingKeywords.length ? (
              <>
                <p className="mt-2 text-sm text-muted">Not found in your resume:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{rules.stats.missingKeywords.map((k) => <Badge key={k}>{k}</Badge>)}</div>
                <p className="mt-3 text-xs text-muted">Add only what you can genuinely discuss in an interview.</p>
              </>
            ) : <p className="mt-2 text-sm text-muted">All core keywords present.</p>}
          </Card>
        </section>
      )}

      <section aria-labelledby="ai-h" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ai-h" className="text-lg font-medium">Interview questions from your claims</h2>
          {analysis?.provider && <span className="text-xs text-muted">Generated by {analysis.provider} · {analysis.model}</span>}
        </div>

        {!ai ? (
          <Card>
            <p className="mb-4 text-sm text-muted">
              AI reads each claim on your resume and generates the questions a skeptical interviewer would ask, flags
              claims that are hard to defend, and suggests stronger bullet points without inventing facts.
            </p>
            <AiAnalysisForm resumeId={id} hasConsent={Boolean(profile?.ai_resume_consent)} providerLabel={providers[0]?.label ?? null} />
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Link href={`/interview/new?kind=resume_screen&resume=${id}`} className={buttonClasses("primary", "sm")}><Mic className="size-4" aria-hidden /> Practise these in a mock interview</Link>
            </div>
            {ai.claims.length === 0 ? (
              <Card className="text-sm text-muted">The AI didn&apos;t return any claims that could be matched word-for-word to your resume. Try re-running the analysis.</Card>
            ) : (
              <ol className="space-y-3">
                {ai.claims.map((c, i) => (
                  <li key={i}>
                    <details className="group rounded-xl border border-border bg-surface p-4 open:shadow-sm">
                      <summary className="flex cursor-pointer list-none items-start gap-3">
                        <Badge tone={riskTone[c.risk]} className="mt-0.5 shrink-0">{c.risk} risk</Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">&ldquo;{c.claim}&rdquo;</span>
                          <span className="mt-1 block text-sm text-muted">{c.concern}</span>
                        </span>
                        <span className="text-xs text-muted group-open:hidden">{c.questions.length} questions</span>
                      </summary>
                      <ol className="mt-3 list-decimal space-y-1.5 pl-10 text-sm">
                        {c.questions.map((q, j) => <li key={j}>{q}</li>)}
                      </ol>
                    </details>
                  </li>
                ))}
              </ol>
            )}
            {ai.dropped && ai.dropped.claims > 0 && (
              <p className="text-xs text-muted">{ai.dropped.claims} AI-suggested claim(s) were discarded because they didn&apos;t match your resume text word-for-word.</p>
            )}

            {ai.rewrites.length > 0 && (
              <Card>
                <h3 className="font-medium">Stronger bullet points</h3>
                <p className="mt-1 text-xs text-muted">Placeholders like [X%] mark where a real number you can defend would help. Never fill them with guesses.</p>
                <ul className="mt-4 space-y-4">
                  {ai.rewrites.map((r, i) => (
                    <li key={i} className="grid gap-2 text-sm md:grid-cols-2">
                      <p className="rounded-lg bg-surface-2 p-3 text-muted line-through decoration-muted/40">{r.original}</p>
                      <div className="rounded-lg border border-accent/30 bg-accent-soft p-3">
                        <p>{r.improved}</p>
                        <p className="mt-1 text-xs text-muted">{r.why}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {ai.recruiter_concerns.length > 0 && (
                <Card>
                  <h3 className="font-medium">What a recruiter might question</h3>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{ai.recruiter_concerns.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </Card>
              )}
              {ai.profile.projects.length > 0 && (
                <Card>
                  <h3 className="font-medium">Projects extracted</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {ai.profile.projects.map((p, i) => (
                      <li key={i}><span className="font-medium">{p.name}</span>{p.technologies.length > 0 && <span className="text-muted"> · {p.technologies.join(", ")}</span>}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {ai.prep_questions.length > 0 && (
              <Card>
                <h3 className="font-medium">Standard questions, tailored to you</h3>
                <dl className="mt-3 space-y-4 text-sm">
                  {ai.prep_questions.map((q, i) => (
                    <div key={i}><dt className="font-medium">{q.question}</dt><dd className="mt-1 whitespace-pre-line text-muted">{q.guidance}</dd></div>
                  ))}
                </dl>
              </Card>
            )}
            <AiAnalysisForm resumeId={id} hasConsent providerLabel={providers[0]?.label ?? null} rerun />
          </>
        )}
      </section>

      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">Extracted text (what parsers see)</summary>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted">{resume.raw_text}</pre>
      </details>
    </div>
  );
}
