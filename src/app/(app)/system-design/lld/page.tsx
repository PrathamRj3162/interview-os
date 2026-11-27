import type { Metadata } from "next";
import Link from "next/link";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { loadGate } from "@/lib/content/gate";
import { LLD_LESSONS, lldLessonMeta } from "@/lib/learn/lld-lessons";

export const metadata: Metadata = { title: "LLD lab" };

const GROUPS = [["principles", "Principles"], ["patterns", "Design patterns"], ["concurrency", "Concurrency"]] as const;

export default async function LldLabPage() {
  await requireUser();
  const gate = await loadGate();
  const visible = LLD_LESSONS.filter((l) => gate.visible(lldLessonMeta(l)));
  return (
    <div className="space-y-6">
      <div>
        <Link href="/system-design" className="text-sm text-muted hover:text-text">← System design lab</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">LLD lab</h1>
        <p className="text-sm text-muted">SOLID with before-and-after Java, ten patterns with when an interviewer expects them, and the concurrency you&apos;ll be asked about in booking-style problems.</p>
      </div>
      {visible.length === 0 && <Card><p className="text-sm text-muted">The LLD lessons are being reviewed and will appear here soon.</p></Card>}
      {GROUPS.map(([g, title]) => {
        const items = visible.filter((l) => l.group === g);
        return items.length > 0 && (
          <section key={g} className="space-y-2">
            <h2 className="text-lg font-medium">{title}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((l) => (
                <li key={l.slug}><Link href={`/system-design/lld/${l.slug}`} className="block h-full rounded-[var(--radius-lg)]"><Card className="h-full p-4 transition-colors hover:border-accent/60">
                  <p className="font-medium">{l.title}</p><p className="mt-1 line-clamp-2 text-xs text-muted">{l.summary}</p>
                  {gate.preview(lldLessonMeta(l)) && <Badge className="mt-2">Preview</Badge>}
                </Card></Link></li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
