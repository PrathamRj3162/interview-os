import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { COMPANY_STYLES, COMPANY_DISCLAIMER } from "@/lib/interview/companies";
import { PROBLEMS } from "@/lib/dsa/bank";

export const metadata: Metadata = { title: "Company styles" };

const SEGMENTS = ["Big tech", "Product (India)", "Fintech", "Enterprise", "Services"] as const;

/** Topic map for 25 companies — style practice that shapes the interviewer and the problems you get. */
export default async function CompaniesPage() {
  await requireUser();
  const topicCount = (t: string) => PROBLEMS.filter((p) => p.topics.includes(t)).length;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company styles</h1>
        <p className="mt-1 text-sm text-muted">Practise in the style a company is commonly reported to interview in: the interviewer adapts its focus and behavioural themes, and DSA rounds favour those topics.</p>
      </div>
      <Card className="flex gap-3 border-warning/40 text-sm" data-testid="company-disclaimer">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <p><span className="font-medium">{COMPANY_DISCLAIMER}</span> Summaries are written by Interview OS from public candidate write-ups and careers pages. Questions are generated fresh and are never claimed to come from the company.</p>
      </Card>
      {SEGMENTS.map((seg) => (
        <section key={seg} aria-labelledby={`seg-${seg}`}>
          <h2 id={`seg-${seg}`} className="mb-3 text-lg font-medium">{seg}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {COMPANY_STYLES.filter((c) => c.segment === seg).map((c) => (
              <li key={c.name}>
                <Card className="flex h-full flex-col gap-3">
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-muted">{c.loop}</p>
                  <div className="text-sm"><span className="text-xs font-medium text-muted">Emphasise: </span>{c.focus.join(" · ")}</div>
                  <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-medium text-muted">DSA topics:</span>{c.dsaTopics.map((t) => <Badge key={t} tone="accent">{t} <span className="ml-1 opacity-70">{topicCount(t)}</span></Badge>)}</div>
                  <div className="text-sm"><span className="text-xs font-medium text-muted">Behavioural themes: </span>{c.values.join(" · ")}</div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Link href={`/interview/new?kind=company&company=${encodeURIComponent(c.name)}`} className={buttonClasses("primary", "sm")}>Company-style loop</Link>
                    <Link href={`/interview/new?kind=dsa&company=${encodeURIComponent(c.name)}`} className={buttonClasses("secondary", "sm")}>DSA in this style</Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
