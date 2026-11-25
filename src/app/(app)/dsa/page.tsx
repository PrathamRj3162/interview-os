import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleDot, Circle, BookOpen } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { PROBLEMS } from "@/lib/dsa/bank";
import { PATTERNS } from "@/lib/dsa/patterns";
import { problemStatuses, type SolveStatus } from "@/lib/dsa/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "DSA academy" };

const DIFF_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;
const STATUS_ICON: Record<SolveStatus, { Icon: typeof Circle; cls: string; label: string }> = {
  solved: { Icon: CheckCircle2, cls: "text-success", label: "Solved" },
  attempted: { Icon: CircleDot, cls: "text-warning", label: "Attempted" },
  new: { Icon: Circle, cls: "text-muted", label: "Not tried" },
};

export default async function DsaAcademyPage({ searchParams }: { searchParams: Promise<{ topic?: string; difficulty?: string; status?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const status = await problemStatuses(supabase);
  const allTopics = [...new Set(PROBLEMS.flatMap((p) => p.topics))].sort();
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const list = PROBLEMS.filter((p) =>
    (!sp.topic || p.topics.includes(sp.topic)) &&
    (!sp.difficulty || p.difficulty === sp.difficulty) &&
    (!sp.status || (status[p.slug] ?? "new") === sp.status) &&
    (!q || p.title.toLowerCase().includes(q)));
  const solved = Object.values(status).filter((s) => s === "solved").length;
  const href = (patch: Record<string, string | undefined>) => {
    const next = { topic: sp.topic, difficulty: sp.difficulty, status: sp.status, q: sp.q, ...patch };
    const qs = Object.entries(next).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
    return `/dsa${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DSA academy</h1>
        <p className="text-sm text-muted">{PROBLEMS.length} problems with hidden tests, {PATTERNS.length} pattern guides. Every problem opens as a live-coding round with the interviewer. Solved {solved}/{PROBLEMS.length}.</p>
      </div>

      <section aria-labelledby="patterns-h">
        <h2 id="patterns-h" className="mb-3 flex items-center gap-2 text-lg font-medium"><BookOpen className="size-4 text-accent" aria-hidden />Patterns</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PATTERNS.map((p) => {
            const probs = PROBLEMS.filter((x) => x.topics.some((t) => p.topics.includes(t)));
            const done = probs.filter((x) => status[x.slug] === "solved").length;
            return (
              <li key={p.slug}>
                <Link href={`/dsa/patterns/${p.slug}`} className="block h-full rounded-[var(--radius-lg)] focus-visible:outline-none">
                  <Card className="h-full p-4 transition-colors hover:border-accent/60">
                    <p className="font-medium">{p.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{p.summary}</p>
                    <div className="mt-3 h-1 rounded-full bg-surface-2" aria-hidden><div className="h-1 rounded-full bg-success" style={{ width: `${probs.length ? (done / probs.length) * 100 : 0}%` }} /></div>
                    <p className="mt-1 text-xs tabular-nums text-muted">{done}/{probs.length} solved</p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="problems-h">
        <h2 id="problems-h" className="mb-3 text-lg font-medium">Problems</h2>
        <form className="mb-3 flex flex-wrap items-center gap-2 text-sm" action="/dsa">
          {sp.topic && <input type="hidden" name="topic" value={sp.topic} />}
          {sp.difficulty && <input type="hidden" name="difficulty" value={sp.difficulty} />}
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <label className="sr-only" htmlFor="q">Search problems</label>
          <input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Search by title" className="h-9 w-56 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3" />
          {(["easy", "medium", "hard"] as const).map((d) => <Link key={d} href={href({ difficulty: sp.difficulty === d ? undefined : d })} aria-current={sp.difficulty === d ? "true" : undefined} className={cn("rounded-full border px-3 py-1 capitalize", sp.difficulty === d ? "border-accent bg-accent-soft" : "border-border")}>{d}</Link>)}
          {(["solved", "attempted", "new"] as const).map((st) => <Link key={st} href={href({ status: sp.status === st ? undefined : st })} aria-current={sp.status === st ? "true" : undefined} className={cn("rounded-full border px-3 py-1", sp.status === st ? "border-accent bg-accent-soft" : "border-border")}>{STATUS_ICON[st].label}</Link>)}
          {(sp.topic || sp.difficulty || sp.status || sp.q) && <Link href="/dsa" className="text-accent underline">Clear</Link>}
        </form>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {allTopics.map((t) => <Link key={t} href={href({ topic: sp.topic === t ? undefined : t })}><Badge tone={sp.topic === t ? "accent" : "neutral"}>{t}</Badge></Link>)}
        </div>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {list.map((p) => {
              const st = STATUS_ICON[status[p.slug] ?? "new"];
              return (
                <li key={p.slug}>
                  <Link href={`/dsa/${p.slug}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-surface-2">
                    <st.Icon className={cn("size-4 shrink-0", st.cls)} aria-label={st.label} />
                    <span className="min-w-0 flex-1 font-medium">{p.title}</span>
                    <span className="hidden text-xs text-muted sm:inline">{p.topics.slice(0, 3).join(" · ")}</span>
                    <Badge tone={DIFF_TONE[p.difficulty]} className="capitalize">{p.difficulty}</Badge>
                  </Link>
                </li>
              );
            })}
            {!list.length && <li className="px-4 py-6 text-sm text-muted">No problems match these filters.</li>}
          </ul>
        </Card>
      </section>
    </div>
  );
}
