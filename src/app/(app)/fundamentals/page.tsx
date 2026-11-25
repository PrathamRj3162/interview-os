import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { FUNDAMENTALS } from "@/lib/learn/fundamentals";

export const metadata: Metadata = { title: "CS fundamentals" };

export default async function FundamentalsPage() {
  const { supabase } = await requireUser();
  const { data: attempts } = await supabase.from("quiz_attempts").select("topic, score, total, created_at").order("created_at", { ascending: false }).limit(500);
  const stats = (slug: string) => {
    const a = (attempts ?? []).filter((x) => x.topic === slug);
    const score = a.reduce((s, x) => s + x.score, 0), total = a.reduce((s, x) => s + x.total, 0);
    return { attempts: a.length, pct: total ? Math.round((score / total) * 100) : null, last: a[0] };
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CS fundamentals</h1>
        <p className="text-sm text-muted">Short graded quizzes on the four areas SDE interviews probe most. Every miss becomes a revision card, and your accuracy feeds the dashboard&apos;s readiness.</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {FUNDAMENTALS.map((t) => {
          const s = stats(t.slug);
          return (
            <li key={t.slug}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-semibold">{t.name}</h2><p className="text-sm text-muted">{t.blurb}</p></div>
                  {s.pct != null && <span className="font-mono text-lg tabular-nums" title="Accuracy across all your attempts">{s.pct}%</span>}
                </div>
                <p className="text-xs text-muted">{t.questions.length} questions · {s.attempts ? `${s.attempts} attempt${s.attempts === 1 ? "" : "s"}, last ${s.last!.score}/${s.last!.total}` : "not attempted yet"}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/fundamentals/${t.slug}/quiz`} className={buttonClasses("primary", "sm")}>Take a 10-question quiz</Link>
                  <Link href={`/fundamentals/${t.slug}`} className={buttonClasses("secondary", "sm")}>Key ideas & history</Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      <Card className="text-sm">Want to be asked out loud? <Link href="/interview/new?kind=fundamentals" className="text-accent underline">Start a CS fundamentals interview</Link> — the interviewer moves between these areas and probes deeper where you&apos;re strong.</Card>
    </div>
  );
}
