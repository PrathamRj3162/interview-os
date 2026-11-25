import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, CircleDot, Circle } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { PROBLEMS } from "@/lib/dsa/bank";
import { PATTERN_BY_SLUG } from "@/lib/dsa/patterns";
import { problemStatuses } from "@/lib/dsa/status";
import { MarkReadButton } from "@/components/learn/mark-read";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: PATTERN_BY_SLUG[(await params).slug]?.title ?? "Pattern" };
}

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

export default async function PatternPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PATTERN_BY_SLUG[slug];
  if (!p) notFound();
  const { supabase, user } = await requireUser();
  const [status, { data: read }] = await Promise.all([
    problemStatuses(supabase),
    supabase.from("user_progress").select("status").eq("user_id", user.id).eq("item_type", "lesson").eq("item_slug", `dsa:${slug}`).maybeSingle(),
  ]);
  const problems = PROBLEMS.filter((x) => x.topics.some((t) => p.topics.includes(t))).sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
  return (
    <article className="space-y-6">
      <div>
        <Link href="/dsa" className="text-sm text-muted hover:text-text">← DSA academy</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.title}</h1>
        <p className="mt-1 text-muted">{p.summary}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">Reach for it when</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{p.when.map((w) => <li key={w}>{w}</li>)}</ul>
          <h2 className="mt-4 font-medium">Complexity</h2>
          <p className="mt-1 text-sm">{p.complexity}</p>
        </Card>
        <Card>
          <h2 className="font-medium">Template (Python-style pseudocode)</h2>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs leading-5">{p.template}</pre>
        </Card>
      </div>
      <Card>
        <h2 className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-warning" aria-hidden />Common mistakes</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{p.pitfalls.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>
      <section aria-labelledby="practice-h">
        <h2 id="practice-h" className="mb-3 text-lg font-medium">Practise this pattern ({problems.filter((x) => status[x.slug] === "solved").length}/{problems.length} solved)</h2>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {problems.map((x) => {
              const st = status[x.slug] ?? "new";
              const Icon = st === "solved" ? CheckCircle2 : st === "attempted" ? CircleDot : Circle;
              return (
                <li key={x.slug}>
                  <Link href={`/dsa/${x.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <Icon className={st === "solved" ? "size-4 text-success" : st === "attempted" ? "size-4 text-warning" : "size-4 text-muted"} aria-label={st} />
                    <span className="flex-1">{x.title}</span>
                    <Badge tone={x.difficulty === "easy" ? "success" : x.difficulty === "medium" ? "warning" : "danger"} className="capitalize">{x.difficulty}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
      <MarkReadButton itemType="lesson" slug={`dsa:${slug}`} topic={p.title} done={read?.status === "completed"} />
    </article>
  );
}
