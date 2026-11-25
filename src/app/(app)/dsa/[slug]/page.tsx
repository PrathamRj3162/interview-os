import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Swords } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ProblemPanel } from "@/components/dsa/panels";
import { requireUser } from "@/lib/supabase/server";
import { getProblem } from "@/lib/dsa/bank";
import { PATTERNS } from "@/lib/dsa/patterns";
import { STRESS } from "@/lib/dsa/stress";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProblem((await params).slug);
  return { title: p ? p.title : "Problem" };
}

const STATUS: Record<string, string> = { accepted: "Accepted", wrong_answer: "Wrong answer", runtime_error: "Runtime error", compile_error: "Compile error", time_limit: "Too slow / time limit", error: "Error" };

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problem = getProblem(slug);
  if (!problem) notFound();
  const { supabase } = await requireUser();
  const { data: subs } = await supabase.from("submissions").select("status, passed, total, language, created_at, interview_id").eq("problem_slug", slug).order("created_at", { ascending: false }).limit(20);
  const patterns = PATTERNS.filter((p) => p.topics.some((t) => problem.topics.includes(t)));
  const practice = `/interview/new?kind=dsa&problem=${slug}&mode=practice&difficulty=${problem.difficulty}`;
  const mock = `/interview/new?kind=dsa&problem=${slug}&mode=mock&difficulty=${problem.difficulty}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dsa" className="text-sm text-muted hover:text-text">← DSA academy</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{problem.title}</h1>
          <p className="mt-1 flex flex-wrap gap-1.5">{problem.topics.map((t) => <Link key={t} href={`/dsa?topic=${encodeURIComponent(t)}`}><Badge>{t}</Badge></Link>)}{slug in STRESS && <Badge tone="info">timed worst-case test</Badge>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={practice} className={buttonClasses("primary", "sm")}><Play className="size-4" aria-hidden />Practise (hints on)</Link>
          <Link href={mock} className={buttonClasses("secondary", "sm")}><Swords className="size-4" aria-hidden />Mock interview</Link>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="h-[34rem]"><ProblemPanel problem={problem} /></div>
        <div className="space-y-4">
          <Card>
            <h2 className="font-medium">Your submissions</h2>
            {subs?.length ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {subs.map((s, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className={s.status === "accepted" ? "text-success" : "text-danger"}>{STATUS[s.status] ?? s.status} <span className="text-muted">{s.passed}/{s.total}</span></span>
                    <span className="text-xs text-muted">{s.language} · {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{s.interview_id && <> · <Link href={`/interview/${s.interview_id}/report`} className="underline">report</Link></>}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted">No submissions yet.</p>}
          </Card>
          {patterns.length > 0 && (
            <Card>
              <h2 className="font-medium">Related patterns</h2>
              <ul className="mt-2 space-y-1 text-sm">{patterns.map((p) => <li key={p.slug}><Link href={`/dsa/patterns/${p.slug}`} className="text-accent underline-offset-2 hover:underline">{p.title}</Link></li>)}</ul>
            </Card>
          )}
          <p className="text-xs text-muted">Hints, the optimal approach and hidden tests stay hidden until you practise — the interviewer reveals the approach in your report.</p>
        </div>
      </div>
    </div>
  );
}
