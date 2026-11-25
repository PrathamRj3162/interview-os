import Link from "next/link";
import { FileText, Code2, BookOpen, Network, FolderGit2, Mic, CalendarCheck, BarChart3, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/marketing/site-header";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";

const MODULES = [
  { icon: FileText, title: "Resume intelligence", body: "Transparent ATS-readability checks, claim-by-claim interview questions and weak-spot detection — without inventing achievements." },
  { icon: Code2, title: "DSA academy", body: "32 topics from complexity to DP, pattern-first lessons, progressive hints and an in-browser editor with real test runs." },
  { icon: BookOpen, title: "CS fundamentals", body: "OS, DBMS, networks, OOP and language internals, with deterministic quizzes that work even when AI is offline." },
  { icon: Network, title: "System design lab", body: "LLD and HLD walkthroughs: requirements, estimates, APIs, data models, diagrams, bottlenecks and trade-offs." },
  { icon: FolderGit2, title: "Project deep-dive", body: "A skeptical senior engineer cross-questions the projects on your resume and in your public GitHub repo." },
  { icon: Mic, title: "Mock interviews", body: "Ten interviewer personalities, five difficulty levels, coding rounds and optional voice — then an evidence-backed report." },
  { icon: CalendarCheck, title: "Adaptive study plan", body: "Daily tasks fitted to your hours and deadline, re-prioritised from your actual weak topics." },
  { icon: BarChart3, title: "Analytics & revision", body: "Rubric-based scores, a mistake notebook, flashcards with spaced repetition and interview history." },
];

const STEPS = [
  ["Create a free account", "Tell us your target role, companies, deadline and daily hours."],
  ["Add your resume", "We extract your skills and projects and find the claims an interviewer will probe."],
  ["Practise every round", "DSA, fundamentals, system design, project defence and behavioural — in one place."],
  ["Interview, review, repeat", "Mock interviews produce a report that feeds straight back into your plan."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main>
        {deleted && (
          <p role="status" className="bg-success/10 py-2 text-center text-sm text-success">
            Your account and all associated data have been deleted.
          </p>
        )}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16">
          <Badge tone="accent">Free · no card · no subscription</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Prepare for every round of your SDE interview — starting from your own resume.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            One platform for resume defence, DSA, CS fundamentals, system design, project deep-dives and realistic mock
            interviews, with a study plan that adapts to how you actually perform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClasses("primary", "lg")}>Start preparing — free</Link>
            <Link href="#how" className={buttonClasses("secondary", "lg")}>How it works</Link>
          </div>
        </section>

        <section aria-labelledby="modules-h" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="modules-h" className="text-2xl font-semibold tracking-tight">Everything an SDE interview tests</h2>
          <p className="mt-2 text-muted">Modules are released in phases. Signed-in users see which ones are live.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-surface p-5">
                <Icon className="size-5 text-accent" aria-hidden />
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" aria-labelledby="how-h" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16">
          <h2 id="how-h" className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, b], i) => (
              <li key={t}>
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <h3 className="mt-1 font-medium">{t}</h3>
                <p className="mt-1 text-sm text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 rounded-2xl border border-border bg-surface p-8 md:grid-cols-2">
            <div>
              <ShieldCheck className="size-6 text-accent" aria-hidden />
              <h2 className="mt-3 text-xl font-semibold">Your data stays yours</h2>
              <p className="mt-2 text-sm text-muted">
                Resumes are stored privately and are sent to an AI provider only after you opt in. You can delete your
                account and every file at any time. Voice audio is processed in your browser and never stored.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Honest about AI</h2>
              <p className="mt-2 text-sm text-muted">
                AI feedback is a practice aid, not a hiring prediction. Every score comes with its rubric and the evidence
                from your answers. Core learning content works even when AI is unavailable.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
