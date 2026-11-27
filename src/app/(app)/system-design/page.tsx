import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { DESIGN_CASES, HLD_FRAMEWORK, LLD_FRAMEWORK, designMeta } from "@/lib/learn/design";
import { loadGate } from "@/lib/content/gate";

export const metadata: Metadata = { title: "System design lab" };

export default async function SystemDesignPage() {
  const { supabase } = await requireUser();
  const gate = await loadGate();
  const { data: done } = await supabase.from("user_progress").select("item_slug").in("item_type", ["hld", "lld"]).eq("status", "completed");
  const studied = new Set((done ?? []).map((d) => d.item_slug));
  const section = (kind: "hld" | "lld", title: string, steps: string[]) => (
    <section aria-labelledby={`${kind}-h`} className="space-y-3">
      <h2 id={`${kind}-h`} className="text-lg font-medium">{title}</h2>
      <Card>
        <p className="text-sm font-medium">The framework interviewers expect</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </Card>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DESIGN_CASES.filter((c) => c.kind === kind && gate.visible(designMeta(c))).map((c) => (
          <li key={c.slug}>
            <Link href={`/system-design/${c.slug}`} className="block h-full rounded-[var(--radius-lg)]">
              <Card className="h-full p-4 transition-colors hover:border-accent/60">
                <p className="flex items-center gap-1.5 font-medium">{studied.has(c.slug) && <CheckCircle2 className="size-4 text-success" aria-label="Studied" />}{c.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{c.prompt}</p>
                <Badge className="mt-2">{c.level}</Badge>{gate.preview(designMeta(c)) && <Badge className="ml-1 mt-2">Preview</Badge>}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System design lab</h1>
        <p className="text-sm text-muted">Case studies with a reference design you can reveal step by step after trying it yourself — then practise the same case out loud with the architect interviewer.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3" data-testid="lab-tools">
        <Link href="/system-design/primers" className="block rounded-[var(--radius-lg)]"><Card className="h-full p-4 transition-colors hover:border-accent/60"><p className="font-medium">Building blocks</p><p className="mt-1 text-xs text-muted">Caching, sharding, queues, consistency and more — each with a 30-second interview answer and a quick check.</p></Card></Link>
        <Link href="/system-design/drill" className="block rounded-[var(--radius-lg)]"><Card className="h-full p-4 transition-colors hover:border-accent/60"><p className="font-medium">Design fundamentals drill</p><p className="mt-1 text-xs text-muted">Five scenario questions in 15 minutes (&ldquo;the page is slow at peak — what do you check?&rdquo;), graded on key points.</p></Card></Link>
        <Link href="/system-design/estimation" className="block rounded-[var(--radius-lg)]"><Card className="h-full p-4 transition-colors hover:border-accent/60"><p className="font-medium">Estimation trainer</p><p className="mt-1 text-xs text-muted">Back-of-the-envelope drills (QPS, peak, storage, bandwidth) graded instantly, with worked steps.</p></Card></Link>
      </div>
      {section("hld", "High-level design", HLD_FRAMEWORK)}
      {section("lld", "Low-level design", LLD_FRAMEWORK)}
    </div>
  );
}
