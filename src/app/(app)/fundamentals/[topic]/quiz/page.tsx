import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { TOPIC_BY_SLUG, pickQuestions } from "@/lib/learn/fundamentals";
import { gradeQuiz } from "@/app/actions/learn";

export const metadata: Metadata = { title: "Quiz" };

/** Ten random questions; the options are sent without the answer key and graded on the server. */
export default async function QuizPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const t = TOPIC_BY_SLUG[topic];
  if (!t) notFound();
  await requireUser();
  const picked = pickQuestions(t);
  return (
    <form action={gradeQuiz} className="space-y-6">
      <div>
        <Link href={`/fundamentals/${topic}`} className="text-sm text-muted hover:text-text">← {t.name}</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.name} quiz</h1>
        <p className="text-sm text-muted">{picked.length} questions. Unanswered questions count as wrong. Misses become revision cards.</p>
      </div>
      <input type="hidden" name="topic" value={topic} />
      <input type="hidden" name="ids" value={JSON.stringify(picked.map((q) => q.id))} />
      <ol className="space-y-4">
        {picked.map((q, i) => (
          <li key={q.id}>
            <Card>
              <fieldset>
                <legend className="font-medium"><span className="mr-2 text-muted">{i + 1}.</span>{q.q}</legend>
                <div className="mt-3 grid gap-2">
                  {q.options.map((o, k) => (
                    <label key={k} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                      <input type="radio" name={`a_${q.id}`} value={k} className="mt-0.5 accent-[var(--accent)]" />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </Card>
          </li>
        ))}
      </ol>
      <Button type="submit">Submit answers</Button>
    </form>
  );
}
