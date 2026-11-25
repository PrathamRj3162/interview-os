import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { createAdminClient, requireUser } from "@/lib/supabase/server";
import { isAdminEmail, loadGate } from "@/lib/content/gate";
import { allContent } from "@/lib/content/registry";
import { ReviewControls } from "@/components/content/review-controls";

export const metadata: Metadata = { title: "Content review", robots: { index: false } };

/** Admin-only review gate: every content item, its automated checks, open reports and a status switch. */
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { user } = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  const { filter = "attention" } = await searchParams;
  const gate = await loadGate();
  const { data: reports } = await createAdminClient().from("content_reports").select("item_id, version, reason, note, created_at").is("resolved_at", null).order("created_at", { ascending: false }).limit(500);
  const byItem = new Map<string, { reason: string; note: string | null }[]>();
  for (const r of reports ?? []) { const k = `${r.item_id}@${r.version}`; byItem.set(k, [...(byItem.get(k) ?? []), r]); }

  const items = allContent().map((i) => ({ ...i, status: gate.statusOf(i.meta), reports: byItem.get(`${i.meta.id}@${i.meta.version}`) ?? [], hidden: gate.hidden(i.meta) }));
  const needs = (i: (typeof items)[number]) => i.status !== "live" || i.reports.length > 0 || i.checks.some((c) => !c.ok);
  const shown = filter === "all" ? items : items.filter(needs);
  const counts = { draft: 0, reviewed: 0, live: 0 } as Record<string, number>;
  items.forEach((i) => counts[i.status]++);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content review</h1>
        <p className="text-sm text-muted">Only <b>live</b> items are shown to users. <b>Reviewed</b> items are visible to admins as a preview. Items with failing checks can&apos;t go live. Editing an item bumps its version, which needs review again.</p>
        <p className="mt-2 flex flex-wrap gap-2 text-sm">
          <Badge>{counts.draft} draft</Badge><Badge>{counts.reviewed} reviewed</Badge><Badge>{counts.live} live</Badge>
          <Link href="/review?filter=attention" className={filter !== "all" ? "font-medium text-accent" : "text-muted"}>Needs attention</Link>
          <Link href="/review?filter=all" className={filter === "all" ? "font-medium text-accent" : "text-muted"}>All {items.length}</Link>
        </p>
      </div>
      {shown.length === 0 && <Card><p className="text-sm text-muted">Nothing needs attention.</p></Card>}
      <ul className="space-y-3">
        {shown.map((i) => (
          <li key={i.meta.id} data-testid="review-item">
            <Card className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={i.href} className="font-medium hover:text-accent">{i.title}</Link>
                <Badge>{i.meta.type}</Badge><Badge>v{i.meta.version}</Badge><Badge data-testid="review-status">{i.status}</Badge>
                {i.hidden && <Badge className="border-danger text-danger">hidden by reports</Badge>}
              </div>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {i.checks.map((c) => (
                  <li key={c.name} className="flex items-start gap-1.5">
                    {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="pass" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="fail" />}
                    <span>{c.name}{c.detail && <span className="text-muted"> — {c.detail}</span>}</span>
                  </li>
                ))}
              </ul>
              {i.reports.length > 0 && (
                <details className="text-sm"><summary className="cursor-pointer">{i.reports.length} open report{i.reports.length > 1 ? "s" : ""}</summary>
                  <ul className="mt-1 list-disc pl-5 text-muted">{i.reports.map((r, k) => <li key={k}>{r.reason}{r.note ? `: ${r.note}` : ""}</li>)}</ul>
                </details>
              )}
              <ReviewControls itemId={i.meta.id} version={i.meta.version} status={i.status} canGoLive={i.checks.every((c) => c.ok)} hasReports={i.reports.length > 0} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
