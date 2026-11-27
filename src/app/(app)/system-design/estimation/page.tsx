import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { loadGate } from "@/lib/content/gate";
import { ESTIMATION_META, REFERENCE_CARD } from "@/lib/learn/estimation";
import { EstimationTrainer } from "@/components/learn/estimation-trainer";
import { ReportButton } from "@/components/content/report-button";

export const metadata: Metadata = { title: "Estimation trainer" };

export default async function EstimationPage() {
  await requireUser();
  const gate = await loadGate();
  if (!gate.visible(ESTIMATION_META)) notFound();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/system-design" className="text-sm text-muted hover:text-text">← System design lab</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Estimation trainer</h1>
        <p className="text-sm text-muted">Back-of-the-envelope maths like the estimates step of a design round. Within 25% counts as right; within 3× is the right order of magnitude. Every answer shows the working.</p>
        {gate.preview(ESTIMATION_META) && <p className="mt-1"><Badge>Preview — not live</Badge></p>}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <EstimationTrainer />
        <Card className="space-y-4 p-4 text-sm" data-testid="reference-card">
          <div><p className="font-medium">Rules of thumb</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">{REFERENCE_CARD.rules.map((r) => <li key={r}>{r}</li>)}</ul></div>
          <div><p className="font-medium">Latency numbers (orders of magnitude)</p><table className="mt-1 w-full text-xs"><tbody>{REFERENCE_CARD.latency.map(([k, v]) => <tr key={k} className="border-b border-border/60"><td className="py-1 pr-2 text-muted">{k}</td><td className="py-1 text-right font-mono">{v}</td></tr>)}</tbody></table></div>
          <div><p className="font-medium">Powers of two</p><table className="mt-1 w-full text-xs"><tbody>{REFERENCE_CARD.powers.map(([k, v]) => <tr key={k}><td className="py-0.5 pr-2 font-mono">{k}</td><td className="py-0.5 text-muted">{v}</td></tr>)}</tbody></table></div>
        </Card>
      </div>
      <div className="flex justify-end"><ReportButton itemId={ESTIMATION_META.id} version={ESTIMATION_META.version} title="Estimation trainer" /></div>
    </div>
  );
}
