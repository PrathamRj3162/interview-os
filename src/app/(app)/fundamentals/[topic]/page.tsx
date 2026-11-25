import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { TOPIC_BY_SLUG } from "@/lib/learn/fundamentals";

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  return { title: TOPIC_BY_SLUG[(await params).topic]?.name ?? "Fundamentals" };
}

export default async function TopicPage({ params, searchParams }: { params: Promise<{ topic: string }>; searchParams: Promise<{ error?: string }> }) {
  const { topic } = await params;
  const t = TOPIC_BY_SLUG[topic];
  if (!t) notFound();
  const { supabase } = await requireUser();
  const { data: attempts } = await supabase.from("quiz_attempts").select("id, score, total, created_at").eq("topic", topic).order("created_at", { ascending: false }).limit(20);
  const err = (await searchParams).error;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/fundamentals" className="text-sm text-muted hover:text-text">← CS fundamentals</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.name}</h1>
        <p className="text-sm text-muted">{t.blurb}</p>
      </div>
      {err && <Card role="alert" className="border-danger/40 text-sm text-danger">Your quiz couldn&apos;t be saved. Please try again.</Card>}
      <Card>
        <h2 className="font-medium">Key ideas interviewers expect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{t.keyIdeas.map((k) => <li key={k}>{k}</li>)}</ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/fundamentals/${t.slug}/quiz`} className={buttonClasses("primary", "sm")}>Take a 10-question quiz</Link>
          <Link href="/interview/new?kind=fundamentals" className={buttonClasses("secondary", "sm")}>Practise out loud</Link>
        </div>
      </Card>
      <Card>
        <h2 className="font-medium">Your attempts</h2>
        {attempts?.length ? (
          <ul className="mt-2 space-y-1.5 text-sm">
            {attempts.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <Link href={`/fundamentals/result/${a.id}`} className="underline-offset-2 hover:underline">{new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Link>
                <span className="font-mono tabular-nums">{a.score}/{a.total}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">No attempts yet.</p>}
      </Card>
    </div>
  );
}
