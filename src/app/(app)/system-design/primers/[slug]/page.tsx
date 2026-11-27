import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { loadGate } from "@/lib/content/gate";
import { PRIMER_BY_SLUG, primerMeta, primerQuestions } from "@/lib/learn/primers";
import { CASE_BY_SLUG, designMeta } from "@/lib/learn/design";
import { PrimerCheck } from "@/components/learn/primer-check";
import { ReportButton } from "@/components/content/report-button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: PRIMER_BY_SLUG[(await params).slug]?.title ?? "Building block" };
}

export default async function PrimerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PRIMER_BY_SLUG[slug];
  if (!p) notFound();
  await requireUser();
  const gate = await loadGate();
  const meta = primerMeta(p);
  if (!gate.visible(meta)) notFound();
  const cases = p.cases.map((s) => CASE_BY_SLUG[s]).filter((c) => c && gate.visible(designMeta(c)));
  return (
    <article className="space-y-5">
      <div>
        <Link href="/system-design/primers" className="text-sm text-muted hover:text-text">← Building blocks</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.title}</h1>
        {gate.preview(meta) && <p className="mt-1"><Badge>Preview — not live</Badge></p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4"><h2 className="font-medium">When to use it</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{p.when.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        <Card className="p-4"><h2 className="font-medium">Trade-offs</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{p.tradeoffs.map((x) => <li key={x}>{x}</li>)}</ul></Card>
      </div>
      <Card className="p-4" data-testid="answer30">
        <h2 className="font-medium">Your 30-second answer</h2>
        <p className="mt-2 text-sm leading-6">{p.answer30}</p>
      </Card>
      <section aria-labelledby="check-h" className="space-y-2">
        <h2 id="check-h" className="text-lg font-medium">Check yourself</h2>
        <PrimerCheck slug={p.slug} questions={primerQuestions(p)} />
      </section>
      {cases.length > 0 && (
        <Card className="p-4">
          <h2 className="font-medium">Cases that use it</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">{cases.map((c) => <li key={c!.slug}><Link className="underline hover:text-accent" href={`/system-design/${c!.slug}`}>{c!.title}</Link></li>)}</ul>
        </Card>
      )}
      <div className="flex justify-end"><ReportButton itemId={meta.id} version={meta.version} title={p.title} /></div>
    </article>
  );
}
