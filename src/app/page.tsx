import Link from "next/link";
import Image from "next/image";
import { FileText, Code2, Mic, ClipboardCheck, CalendarCheck, ShieldCheck, Network, BookOpen } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/marketing/site-header";
import { HeroSkyline } from "@/components/marketing/hero-skyline";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { getPrefs } from "@/lib/prefs";
import { copy } from "@/lib/copy";

const STEPS = [
  ["Drop your resume", "We find every claim an interviewer will poke at — and score how readable it is, with the maths shown."],
  ["Take a mock round", "Voice or text. The interviewer follows up on what you actually said, not a fixed script."],
  ["Fix what the report found", "Evidence-backed feedback turns into today's tasks. Retake the round and watch the trend."],
];

const FEATURES = [
  { icon: FileText, title: "Resume intelligence", body: "Transparent score, claim-by-claim questions, weak-spot detection. Rewrites never invent numbers." },
  { icon: Mic, title: "Adaptive mock interviews", body: "Nine interviewer styles, ten round types, five difficulty levels. Practice mode gives hints; mock mode doesn't." },
  { icon: ClipboardCheck, title: "Evidence-based reports", body: "Every score cites your own words. Quotes that can't be found in your transcript are thrown out." },
  { icon: CalendarCheck, title: "Plan that adapts", body: "Weaknesses from each report become dated tasks on your dashboard." },
  { icon: Code2, title: "DSA live coding", body: "Problem bank, editor and real test runs in your browser — coming next.", soon: true },
  { icon: Network, title: "System design lab", body: "LLD and HLD walkthroughs with diagrams and trade-off drills.", soon: true },
  { icon: BookOpen, title: "CS fundamentals", body: "OS, DBMS, networks and OOP with deterministic quizzes.", soon: true },
  { icon: ShieldCheck, title: "Private by default", body: "RLS on every table, private resume storage, AI only with consent, one-click deletion." },
];

const FAQ = [
  ["Is it actually free?", "Yes. No subscription, no card. AI features run on free provider tiers with a fair daily limit; everything else is unlimited."],
  ["Does it use my voice recordings?", "No audio is stored. Voice mode uses your browser's speech recognition; only the text transcript is saved."],
  ["Are the company questions real?", "No. Company tracks are style practice based on publicly known interview formats — never presented as actual questions asked there."],
  ["Is the score a hiring prediction?", "No. Scores are practice indicators with a published rubric and quoted evidence from your answers."],
  ["Can I delete my data?", "Anytime, from Settings. It removes your account, resumes, interviews and every file."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const { vibe } = await getPrefs();
  return (
    <>
      <SiteHeader />
      <main>
        {deleted && <p role="status" className="bg-success/10 py-2 text-center text-sm text-success">Your account and all associated data have been deleted.</p>}

        <section className="relative isolate overflow-hidden border-b border-border">
          <HeroSkyline />
          <div className="relative mx-auto flex min-h-[min(46rem,92vh)] max-w-6xl flex-col items-center justify-center px-4 py-24 text-center">
            <Badge tone="primary" className="mb-6">Free · no card · no subscription</Badge>
            <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.1] tracking-wide sm:text-6xl">
              Practise the interview <span className="text-primary">before</span> the interview.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-text/85">
              Resume-aware SDE prep: an interviewer that grills your real projects, adaptive mock rounds, and reports that show exactly what to fix.
            </p>
            <Link href="/signup" className={buttonClasses("primary", "lg", "mt-10")}>{copy(vibe, "heroCta")}</Link>
          </div>
        </section>

        <section aria-labelledby="how-h" className="mx-auto max-w-6xl px-4 py-20">
          <h2 id="how-h" className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <h3 className="mt-2 font-medium">{t}</h3>
                <p className="mt-1.5 text-sm text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="feat-h" className="mx-auto max-w-6xl px-4 pb-20">
          <h2 id="feat-h" className="text-2xl font-semibold tracking-tight">Everything an SDE loop tests</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body, soon }) => (
              <div key={title} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
                <div className="flex items-center justify-between"><Icon className="size-5 text-accent" aria-hidden />{soon && <Badge>Soon</Badge>}</div>
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="preview-h" className="mx-auto max-w-6xl px-4 pb-20">
          <h2 id="preview-h" className="sr-only">Product preview</h2>
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border-strong bg-surface p-2 shadow-[0_0_80px_-20px_rgb(167_139_250/0.35)]">
            <Image src="/preview-dashboard.png" alt="The Interview OS dashboard: today's tasks, recommended next step, readiness and recent interviews" width={1440} height={900} className="h-auto w-full rounded-[var(--radius-lg)]" sizes="(min-width: 1152px) 1136px, 100vw" />
          </div>
        </section>

        <section aria-labelledby="faq-h" className="mx-auto max-w-3xl px-4 pb-24">
          <h2 id="faq-h" className="text-2xl font-semibold tracking-tight">FAQ</h2>
          <div className="mt-6 divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}<span aria-hidden className="text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
