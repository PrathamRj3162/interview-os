import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { loadGate } from "@/lib/content/gate";
import { PRIMERS, primerMeta } from "@/lib/learn/primers";

export const metadata: Metadata = { title: "System design building blocks" };

export default async function PrimersPage() {
  const { supabase } = await requireUser();
  const gate = await loadGate();
  const { data: done } = await supabase.from("user_progress").select("item_slug").eq("item_type", "lesson").like("item_slug", "primer:%").eq("status", "completed");
  const studied = new Set((done ?? []).map((d) => d.item_slug.slice("primer:".length)));
  const list = PRIMERS.filter((p) => gate.visible(primerMeta(p)));
  return (
    <div className="space-y-5">
      <div>
        <Link href="/system-design" className="text-sm text-muted hover:text-text">← System design lab</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Building blocks</h1>
        <p className="text-sm text-muted">One page per building block: when to use it, the trade-offs, a 30-second interview answer and three check questions.</p>
      </div>
      {list.length === 0 && <Card><p className="text-sm text-muted">The building-block primers are being reviewed and will appear here soon.</p></Card>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.slug}>
            <Link href={`/system-design/primers/${p.slug}`} className="block h-full rounded-[var(--radius-lg)]">
              <Card className="h-full p-4 transition-colors hover:border-accent/60">
                <p className="flex items-center gap-1.5 font-medium">{studied.has(p.slug) && <CheckCircle2 className="size-4 text-success" aria-label="Studied" />}{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{p.when[0]}</p>
                {gate.preview(primerMeta(p)) && <Badge className="mt-2">Preview</Badge>}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
