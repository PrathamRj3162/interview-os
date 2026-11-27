import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { loadGate } from "@/lib/content/gate";
import { DESIGN_QUESTIONS, designQuestionMeta, pickDesignQuestions } from "@/lib/learn/design-questions";
import { DesignDrill } from "@/components/learn/design-drill";

export const metadata: Metadata = { title: "Design fundamentals drill" };

/** 15 minutes, 5 scenario questions; graded on key points (the key points stay on the server until grading). */
export default async function DesignDrillPage() {
  await requireUser();
  const gate = await loadGate();
  const pool = DESIGN_QUESTIONS.filter((q) => gate.visible(designQuestionMeta(q)));
  const picked = pickDesignQuestions(pool, 5).map((q) => ({ slug: q.slug, q: q.q }));
  return (
    <div className="space-y-5">
      <div>
        <Link href="/system-design" className="text-sm text-muted hover:text-text">← System design lab</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Design fundamentals drill</h1>
        <p className="text-sm text-muted">Five short scenario questions in 15 minutes, like the design Q&A in many fresher loops. Answer in a few sentences each. You&apos;re graded on the key points an interviewer listens for: a point counts only if your own words cover it. Missed points become revision cards.</p>
      </div>
      {picked.length < 5 ? <Card><p className="text-sm text-muted">The scenario questions are being reviewed and will be available soon.</p></Card> : <DesignDrill questions={picked} />}
    </div>
  );
}
