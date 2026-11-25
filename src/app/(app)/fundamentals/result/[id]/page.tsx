import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { QUESTION_BY_ID, TOPIC_BY_SLUG } from "@/lib/learn/fundamentals";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quiz result" };

export default async function QuizResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireUser();
  const { data: a } = await supabase.from("quiz_attempts").select("topic, score, total, answers, created_at").eq("id", id).maybeSingle();
  if (!a) notFound();
  const topic = TOPIC_BY_SLUG[a.topic];
  const answers = (a.answers as { id: string; chosen: number | null; correct: boolean }[]).filter((x) => QUESTION_BY_ID[x.id]);
  const missed = answers.filter((x) => !x.correct).length;
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/fundamentals/${a.topic}`} className="text-sm text-muted hover:text-text">← {topic?.name ?? "Fundamentals"}</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{topic?.name} quiz — {a.score}/{a.total}</h1>
        <p className="text-sm text-muted">{missed ? `${missed} miss${missed === 1 ? "" : "es"} added to your revision deck.` : "Perfect score."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/fundamentals/${a.topic}/quiz`} className={buttonClasses("primary", "sm")}>Another quiz</Link>
        {missed > 0 && <Link href="/revision" className={buttonClasses("secondary", "sm")}>Review your cards</Link>}
      </div>
      <ol className="space-y-3">
        {answers.map((x, i) => {
          const q = QUESTION_BY_ID[x.id];
          return (
            <li key={x.id}>
              <Card className={cn(x.correct ? "border-success/30" : "border-danger/40")}>
                <p className="flex gap-2 font-medium">{x.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Correct" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Wrong" />}<span><span className="mr-1 text-muted">{i + 1}.</span>{q.q}</span></p>
                {!x.correct && <p className="mt-2 text-sm text-danger">Your answer: {x.chosen == null ? "no answer" : q.options[x.chosen] ?? "—"}</p>}
                <p className="mt-1 text-sm text-success">Correct: {q.options[q.answer]}</p>
                <p className="mt-1 text-sm text-muted">{q.why}</p>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
