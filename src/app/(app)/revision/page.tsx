import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { ReviewSession, AddCardForm, ImportFromReports, DeleteCardButton } from "@/components/learn/review";

export const metadata: Metadata = { title: "Revision" };

export default async function RevisionPage() {
  const { supabase } = await requireUser();
  const now = new Date().toISOString();
  const [{ data: due }, { data: all }] = await Promise.all([
    supabase.from("flashcards").select("id, front, back, topic").lte("due_at", now).order("due_at").limit(50),
    supabase.from("flashcards").select("id, front, topic, due_at, interval_days, repetitions").order("due_at").limit(300),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revision</h1>
        <p className="text-sm text-muted">Spaced repetition (SM-2): cards you know come back less often, cards you miss come back soon. Quiz misses are added automatically; you can import concepts your interview reports flagged, or write your own.</p>
      </div>
      <section aria-labelledby="due-h">
        <h2 id="due-h" className="mb-3 text-lg font-medium">Due now <span className="text-sm font-normal text-muted">{due?.length ?? 0}</span></h2>
        <ReviewSession cards={due ?? []} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-medium">Add a card</h2><AddCardForm /></Card>
        <Card className="space-y-3"><h2 className="font-medium">From your interviews</h2><p className="text-sm text-muted">Each concept a report marked as missed becomes an &ldquo;Explain: …&rdquo; card, with what a strong answer covered when available.</p><ImportFromReports /></Card>
      </section>
      <section aria-labelledby="deck-h">
        <h2 id="deck-h" className="mb-3 text-lg font-medium">Your deck <span className="text-sm font-normal text-muted">{all?.length ?? 0}</span></h2>
        {all?.length ? (
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {all.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{c.front}</span>
                  <span className="hidden text-xs text-muted sm:inline">{c.topic}</span>
                  <span className="w-28 text-right text-xs text-muted">{c.due_at <= now ? "due now" : `due ${new Date(c.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}</span>
                  <DeleteCardButton id={c.id} />
                </li>
              ))}
            </ul>
          </Card>
        ) : <Card className="text-sm text-muted">No cards yet. Take a <Link href="/fundamentals" className="text-accent underline">fundamentals quiz</Link> or import from your reports.</Card>}
      </section>
    </div>
  );
}
