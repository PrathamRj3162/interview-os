import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { loadGate } from "@/lib/content/gate";
import { LLD_LESSON_BY_SLUG, lldLessonMeta } from "@/lib/learn/lld-lessons";
import { CASE_BY_SLUG, designMeta } from "@/lib/learn/design";
import { ReportButton } from "@/components/content/report-button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: LLD_LESSON_BY_SLUG[(await params).slug]?.title ?? "LLD lesson" };
}

const Code = ({ label, src }: { label?: string; src: string }) => (
  <div>{label && <p className="text-xs font-medium text-muted">{label}</p>}<pre className="mt-1 overflow-auto rounded-lg bg-bg p-3 font-mono text-xs leading-5">{src}</pre></div>
);

export default async function LldLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = LLD_LESSON_BY_SLUG[slug];
  if (!l) notFound();
  await requireUser();
  const gate = await loadGate();
  const meta = lldLessonMeta(l);
  if (!gate.visible(meta)) notFound();
  const cases = l.cases.map((s) => CASE_BY_SLUG[s]).filter((c) => c && gate.visible(designMeta(c)));
  return (
    <article className="space-y-5">
      <div>
        <Link href="/system-design/lld" className="text-sm text-muted hover:text-text">← LLD lab</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{l.title}</h1>
        <p className="mt-1 text-sm text-muted">{l.summary}</p>
        {gate.preview(meta) && <p className="mt-1"><Badge>Preview — not live</Badge></p>}
      </div>
      <Card className="p-4"><h2 className="font-medium">When an interviewer expects it</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{l.expect.map((x) => <li key={x}>{x}</li>)}</ul></Card>
      {l.sections.map((s) => (
        <Card key={s.heading} className="space-y-3 p-4" data-testid="lld-section">
          <h2 className="font-medium">{s.heading}</h2>
          {s.text.map((t) => <p key={t} className="text-sm">{t}</p>)}
          {s.before && s.after && <div className="grid gap-3 lg:grid-cols-2"><Code label="Before" src={s.before} /><Code label="After" src={s.after} /></div>}
          {s.code && <Code src={s.code} />}
        </Card>
      ))}
      <Card className="p-4"><h2 className="font-medium">Common traps</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{l.pitfalls.map((x) => <li key={x}>{x}</li>)}</ul></Card>
      {cases.length > 0 && <Card className="p-4"><h2 className="font-medium">Practise it in</h2><ul className="mt-2 flex flex-wrap gap-2 text-sm">{cases.map((c) => <li key={c!.slug}><Link className="underline hover:text-accent" href={`/system-design/${c!.slug}`}>{c!.title}</Link></li>)}</ul></Card>}
      <div className="flex justify-end"><ReportButton itemId={meta.id} version={meta.version} title={l.title} /></div>
    </article>
  );
}
