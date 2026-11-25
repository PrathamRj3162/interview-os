import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Clock, Target, Sparkles, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { toggleTask } from "@/app/actions/tasks";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";
import { computeReadiness, daysUntil } from "@/lib/readiness";
import { aiStatus } from "@/lib/ai";
import { remainingQuota } from "@/lib/ai/quota";
import { ROLES, LANGUAGES, COMPANY_TRACKS } from "@/lib/validation/profile";
import { KINDS, type KindId } from "@/lib/interview/config";
import { getPrefs } from "@/lib/prefs";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: "Dashboard" };

function Metric({ label, value, empty }: { label: string; value: number | null; empty: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm text-muted">{label}</p>
      {value === null ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2" role="presentation">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${value}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [profile, { vibe }] = await Promise.all([getProfile(supabase, user.id), getPrefs()]);
  if (!profile?.onboarded_at) redirect("/onboarding");

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [subs, accepted, quizzes, interviews, quota, resumeRes, recentRes, tasksRes] = await Promise.all([
    supabase.from("submissions").select("id", { count: "exact", head: true }),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("quiz_attempts").select("score,total").limit(1000),
    supabase.from("mock_interviews").select("overall_score").eq("status", "completed").limit(1000),
    remainingQuota(supabase, user.id),
    supabase.from("resumes").select("id, file_name, resume_analyses(overall_score, ai_findings, created_at)").eq("is_active", true).limit(1).maybeSingle(),
    supabase.from("mock_interviews").select("id, kind, status, overall_score, started_at").order("started_at", { ascending: false }).limit(4),
    supabase.from("study_tasks").select("id, title, reason, link, done_at, due_date").lte("due_date", today).order("due_date").limit(30),
  ]);

  const quizRows = quizzes.data ?? [];
  const scored = (interviews.data ?? []).filter((r) => r.overall_score !== null);
  const readiness = computeReadiness({
    submissions: subs.count ?? 0,
    accepted: accepted.count ?? 0,
    quizAttempts: quizRows.length,
    quizScoreSum: quizRows.reduce((s, r) => s + r.score, 0),
    quizTotalSum: quizRows.reduce((s, r) => s + r.total, 0),
    interviewsCompleted: scored.length,
    interviewScoreAvg: scored.length ? scored.reduce((s, r) => s + Number(r.overall_score), 0) / scored.length : null,
  });
  const resume = resumeRes.data;
  const resumeAnalysis = resume ? [...(resume.resume_analyses ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] : null;
  const recent = recentRes.data ?? [];
  const tasks = (tasksRes.data ?? []).filter((t) => !t.done_at || t.done_at.slice(0, 10) === today).slice(0, 8);
  const openTasks = tasks.filter((t) => !t.done_at);
  const days = daysUntil(profile.deadline);
  const providers = aiStatus();
  const firstName = (profile.full_name ?? "").split(" ")[0] || "there";
  const hasActivity = (subs.count ?? 0) + quizRows.length + scored.length > 0;

  const next = !resume
    ? { text: "Upload your resume so every module can tailor questions to your real experience.", href: "/resume", cta: "Upload resume" }
    : !resumeAnalysis?.ai_findings
      ? { text: "Generate claim-by-claim interview questions from your resume.", href: `/resume/${resume.id}`, cta: "Analyse claims" }
      : recent.filter((r) => r.status === "completed").length === 0
        ? { text: "Take a resume-based mock interview — the interviewer will cross-question your weakest claims.", href: `/interview/new?kind=resume_screen&resume=${resume.id}`, cta: "Start interview" }
        : openTasks.length > 0
          ? { text: `Work through your ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}, then retake the round to measure improvement.`, href: openTasks[0].link ?? "/interview", cta: "Review feedback" }
          : { text: "Try a different round — DSA, system design or behavioral — to broaden your readiness.", href: "/interview/new", cta: "New interview" };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy(vibe, "dashboardGreeting", { name: firstName })}</h1>
        <p className="mt-1 text-muted">
          Preparing for {ROLES[profile.target_role as keyof typeof ROLES] ?? "an SDE role"} ·{" "}
          {COMPANY_TRACKS[profile.company_track as keyof typeof COMPANY_TRACKS] ?? ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-5 text-accent" aria-hidden />
          <div>
            <p className="text-sm text-muted">Deadline</p>
            <p className="font-medium">
              {days === null ? "Not set" : days < 0 ? "Passed" : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} left`}
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 text-accent" aria-hidden />
          <div>
            <p className="text-sm text-muted">Daily study time</p>
            <p className="font-medium">{profile.daily_hours} h</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <Target className="mt-0.5 size-5 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm text-muted">Target companies</p>
            <p className="truncate font-medium">{profile.target_companies.length ? profile.target_companies.join(", ") : "General"}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 text-accent" aria-hidden />
          <div>
            <p className="text-sm text-muted">AI requests today</p>
            <p className="font-medium tabular-nums">{providers.length ? `${quota.used} / ${quota.limit}` : "AI offline"}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Today&apos;s tasks</h2>
            <span className="text-xs text-muted">From your interview feedback</span>
          </div>
          {tasks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{copy(vibe, "noTasks")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-2.5">
                  <form action={toggleTask}>
                    <input type="hidden" name="task_id" value={t.id} />
                    <input type="hidden" name="done" value={t.done_at ? "0" : "1"} />
                    <button type="submit" aria-label={t.done_at ? "Mark as not done" : "Mark as done"} className="mt-0.5 text-muted hover:text-accent">
                      {t.done_at ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5" />}
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${t.done_at ? "text-muted line-through" : ""}`}>{t.title}</p>
                    {t.reason && <p className="text-xs text-muted">{t.reason}{t.due_date < today && !t.done_at ? " · overdue" : ""}</p>}
                  </div>
                  {t.link && <Link href={t.link} className="text-xs text-accent hover:underline">Open</Link>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-medium">Recommended next step</h2>
          <p className="mt-2 text-sm text-muted">{next.text}</p>
          <Link href={next.href} className={buttonClasses("primary", "sm", "mt-4")}>{next.cta} <ArrowRight className="size-4" aria-hidden /></Link>
        </Card>
      </div>

      <section aria-labelledby="readiness">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="readiness" className="font-medium">Readiness</h2>
          <span className="text-xs text-muted">Computed only from your own attempts</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Coding accuracy" value={readiness.codingAccuracy} empty="No submissions yet" />
          <Metric label="CS fundamentals" value={readiness.fundamentals} empty="No quizzes taken yet" />
          <Metric label="Mock interviews" value={readiness.mockInterview} empty="No interviews completed yet" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-medium">Resume</h2><Link href="/resume" className="text-xs text-accent hover:underline">Open</Link></div>
          {resume ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm">{resume.file_name}</p>
              {resumeAnalysis?.overall_score != null && <span className="font-mono text-lg tabular-nums">{resumeAnalysis.overall_score}<span className="text-sm text-muted">/100</span></span>}
            </div>
          ) : <p className="mt-3 text-sm text-muted">No resume uploaded yet.</p>}
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-medium">Recent interviews</h2><Link href="/interview" className="text-xs text-accent hover:underline">All</Link></div>
          {recent.length === 0 ? <p className="mt-3 text-sm text-muted">No interviews yet.</p> : (
            <ul className="mt-2 divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={r.status === "completed" ? `/interview/${r.id}/report` : `/interview/${r.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-accent">
                    <span className="truncate">{KINDS[r.kind as KindId]?.name ?? r.kind}</span>
                    <span className="shrink-0 font-mono tabular-nums text-muted">{r.overall_score != null ? `${Math.round(Number(r.overall_score))}/100` : r.status.replace("_", " ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-medium">Your profile</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Language</dt><dd>{LANGUAGES[profile.preferred_language as keyof typeof LANGUAGES]}</dd></div>
            <div><dt className="text-muted">DSA (self-rated)</dt><dd>{profile.dsa_level} / 5</dd></div>
            <div><dt className="text-muted">System design (self-rated)</dt><dd>{profile.system_design_level} / 5</dd></div>
          </dl>
          <p className="mt-4 text-xs text-muted">
            {hasActivity
              ? "Self-ratings are being replaced by measured performance as you practise."
              : "Self-ratings are used until you have practice data. They'll be replaced by measured performance."}
          </p>
        </Card>
        <Card>
          <h2 className="font-medium">AI status</h2>
          {providers.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {providers.map((p, i) => (
                <li key={`${p.id}:${p.model}`} className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    {p.label}
                    <span className="block truncate font-mono text-xs text-muted">{p.model}</span>
                  </span>
                  <Badge tone={i === 0 ? "success" : "neutral"}>{i === 0 ? "primary" : "fallback"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No AI provider is configured on this server. Resume rule checks and your saved reports still work.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
