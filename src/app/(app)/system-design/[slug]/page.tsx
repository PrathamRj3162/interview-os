import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mic } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { CASE_BY_SLUG, designMeta } from "@/lib/learn/design";
import { loadGate } from "@/lib/content/gate";
import { ReportButton } from "@/components/content/report-button";
import { MarkReadButton } from "@/components/learn/mark-read";
import { DESIGN_DIAGRAMS } from "@/lib/learn/design-diagrams";
import { DesignDiagram } from "@/components/learn/design-diagram";
import { Sketchpad } from "@/components/learn/sketchpad";
import { AttemptButton } from "@/components/learn/attempt-button";
import { Lock } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: CASE_BY_SLUG[(await params).slug]?.title ?? "Design case" };
}

function Section({ title, items, open }: { title: string; items?: string[]; open?: boolean }) {
  if (!items?.length) return null;
  return (
    <details open={open} className="rounded-[var(--radius-lg)] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-3 font-medium">{title}</summary>
      <ul className="list-disc space-y-1 border-t border-border px-5 py-3 pl-10 text-sm">{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </details>
  );
}

export default async function DesignCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = CASE_BY_SLUG[slug];
  if (!c) notFound();
  const { supabase, user } = await requireUser();
  const gate = await loadGate();
  const meta = designMeta(c);
  if (!gate.visible(meta)) notFound();
  const { data: p } = await supabase.from("user_progress").select("status").eq("user_id", user.id).eq("item_type", c.kind).eq("item_slug", slug).maybeSingle();
  // The reference answer stays hidden until you've attempted the case: finished a round on it, or said so yourself.
  const attempted = Boolean(p);
  const practice = `/interview/new?kind=${c.kind}&persona=architect&case=${slug}&topic=${encodeURIComponent(`Design: ${c.title} — ${c.prompt}`)}`;
  return (
    <article className="space-y-5">
      <div>
        <Link href="/system-design" className="text-sm text-muted hover:text-text">← System design lab</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="mt-1 flex gap-1.5"><Badge>{c.kind === "hld" ? "High-level" : "Low-level"}</Badge><Badge>{c.level}</Badge>{gate.preview(meta) && <Badge>Preview — not live</Badge>}</p>
      </div>
      <Card>
        <p className="text-lg">{c.prompt}</p>
        <p className="mt-2 text-sm text-muted">Try it first: spend 10 minutes on requirements and a rough design, then reveal the sections below one at a time and compare.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={practice} className={buttonClasses("primary", "sm")} data-testid="practise-design"><Mic className="size-4" aria-hidden />Practise this with Nisha</Link>
          <MarkReadButton itemType={c.kind} slug={slug} topic={c.title} done={p?.status === "completed"} />
        </div>
      </Card>
      <details className="rounded-[var(--radius-lg)] border border-border bg-surface">
        <summary className="cursor-pointer px-5 py-3 font-medium">Sketch your design first</summary>
        <div className="border-t border-border px-5 py-4"><Sketchpad storageKey={`sketch:${slug}`} /></div>
      </details>
      <Section title="Functional requirements" items={c.functional} />
      <Section title="Non-functional requirements" items={c.nonFunctional} />
      {c.variants && (
        <div className="grid gap-3 md:grid-cols-2" data-testid="variants">
          <Card className="p-4"><p className="text-xs font-medium text-muted">SDE-1 version</p><p className="mt-1 text-sm">{c.variants.sde1}</p></Card>
          <Card className="p-4"><p className="text-xs font-medium text-muted">SDE-2+ version</p><p className="mt-1 text-sm">{c.variants.sde2}</p></Card>
        </div>
      )}
      {!attempted ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4" data-testid="reference-locked">
          <p className="flex items-center gap-2 text-sm"><Lock className="size-4 text-muted" aria-hidden />The reference answer, diagram, checklist and common mistakes unlock after you attempt this case: finish a practice round on it, or design it yourself first.</p>
          <AttemptButton kind={c.kind} slug={slug} />
        </Card>
      ) : (<>
      <Section title="Back-of-the-envelope estimates" items={c.estimates} />
      <Section title={c.kind === "hld" ? "API" : "Key methods"} items={c.api} />
      <Section title={c.kind === "hld" ? "Data model" : "Entities"} items={c.data} />
      <Section title={c.kind === "hld" ? "High-level components" : "Classes, patterns and relationships"} items={c.components} />
      {DESIGN_DIAGRAMS[slug] && (
        <details className="rounded-[var(--radius-lg)] border border-border bg-surface">
          <summary className="cursor-pointer px-5 py-3 font-medium">{c.kind === "hld" ? "Reference architecture diagram" : "Reference class diagram"}</summary>
          <div className="border-t border-border p-4"><DesignDiagram diagram={DESIGN_DIAGRAMS[slug]} title={c.title} /></div>
        </details>
      )}
      <Section title="Deep dives" items={c.deepDives} />
      <Section title="Trade-offs" items={c.tradeoffs} />
      <Section title="Follow-ups an interviewer may ask" items={c.followUps} />
      <Section title="Common mistakes" items={c.mistakes} />
      <Section title="What interviewers check (the must-cover list)" items={c.checklist?.map((x) => `${x.item} (weight ${x.weight})`)} />
      </>)}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">A reference answer written for Interview OS — other designs can be just as good if the trade-offs are argued well.</p>
        <ReportButton itemId={meta.id} version={meta.version} title={c.title} />
      </div>
    </article>
  );
}
