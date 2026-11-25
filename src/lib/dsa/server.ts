import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProblem } from "./bank";
import { SOLUTIONS } from "./solutions";
import { starterCode } from "./harness";
import { PHASES, type Phase } from "./phases";
import { LANGS, type Lang, type Problem, type RunOutcome } from "./types";

export type Workspace = { language: Lang; code: string; codeAtLastTurn?: string; updatedAt?: string };

export type EventRow = { id: number; type: string; payload: Record<string, unknown>; created_at: string };

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);
export const asPhase = (v: unknown): Phase => ((PHASES as readonly string[]).includes(v as string) ? (v as Phase) : "intro");

export function initialWorkspace(problem: Problem, language: string | null): Workspace {
  const lang = isLang(language) ? language : "python";
  return { language: lang, code: starterCode(problem, lang) };
}

export async function loadEvents(supabase: SupabaseClient, interviewId: string, sinceIso?: string): Promise<EventRow[]> {
  let q = supabase.from("interview_events").select("id, type, payload, created_at").eq("interview_id", interviewId).order("id");
  if (sinceIso) q = q.gt("created_at", sinceIso);
  const { data } = await q.limit(200);
  return (data ?? []) as EventRow[];
}

export async function logEvent(supabase: SupabaseClient, interviewId: string, userId: string, type: string, payload: Record<string, unknown> = {}) {
  const { error } = await supabase.from("interview_events").insert({ interview_id: interviewId, user_id: userId, type, payload });
  if (error) console.error("[dsa-event]", type, error.code);
}

export async function saveWorkspace(supabase: SupabaseClient, interviewId: string, ws: Workspace) {
  await supabase.from("mock_interviews").update({ workspace: { ...ws, code: ws.code.slice(0, 50_000), updatedAt: new Date().toISOString() } }).eq("id", interviewId);
}

/** A short, model-friendly summary of a run or submission (also what gets stored in the event log). */
export function summariseOutcome(o: RunOutcome, kind: "run" | "submit", language: Lang) {
  const firstBad = o.tests.find((t) => t.verdict !== "pass" && t.verdict !== "not_run" && t.input);
  return {
    kind, language, runner: o.runner, status: o.status, passed: o.passed, total: o.total, timeMs: o.timeMs,
    ...(o.compileOutput ? { compileOutput: o.compileOutput.slice(0, 600) } : {}),
    ...(firstBad ? { firstFailure: { input: firstBad.input?.slice(0, 300), expected: firstBad.expected?.slice(0, 200), actual: (firstBad.actual ?? firstBad.error)?.slice(0, 200), hidden: firstBad.hidden } } : {}),
  };
}

const JUDGE_DAILY_LIMIT = () => Number(process.env.JUDGE_DAILY_LIMIT ?? 80);

export class JudgeQuotaError extends Error {}

/** Per-user limits on calls to the shared free judge: a daily cap plus a short cooldown. */
export async function assertJudgeQuota(supabase: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [runs, subs, last] = await Promise.all([
    supabase.from("interview_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("type", "remote_run").gte("created_at", since),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
    supabase.from("interview_events").select("created_at").eq("user_id", userId).in("type", ["remote_run", "submit"]).order("created_at", { ascending: false }).limit(1),
  ]);
  const used = (runs.count ?? 0) + (subs.count ?? 0);
  if (used >= JUDGE_DAILY_LIMIT()) throw new JudgeQuotaError(`You've used today's ${JUDGE_DAILY_LIMIT()} judge runs (shared free service). Python and JavaScript "Run" still works in your browser.`);
  const lastAt = last.data?.[0]?.created_at;
  if (lastAt && Date.now() - new Date(lastAt).getTime() < 4000) throw new JudgeQuotaError("One run at a time — wait a few seconds.");
}

export function dsaContextFor(iv: { problem_slug: string | null }) {
  const problem = getProblem(iv.problem_slug);
  const solution = problem ? SOLUTIONS[problem.slug] : undefined;
  return problem && solution ? { problem, solution } : null;
}

/** Turn the raw event log into short facts for the interviewer prompt. */
export function describeEvents(events: EventRow[]): string[] {
  const facts: string[] = [];
  for (const e of events) {
    const p = e.payload ?? {};
    switch (e.type) {
      case "paste": facts.push(`Candidate pasted ${p.chars ?? "?"} characters into the editor.`); break;
      case "idle": facts.push(`Candidate was idle (no typing or speaking) for about ${Math.round(Number(p.seconds ?? 0) / 60)} minutes.`); break;
      case "language": facts.push(`Candidate switched language from ${p.from} to ${p.to}.`); break;
      case "reset": facts.push("Candidate reset the editor to the starter code."); break;
      case "hint": facts.push(`Candidate used hint ${p.level}/3.`); break;
      case "run": case "submit":
        facts.push(`${e.type === "submit" ? "SUBMITTED (hidden tests)" : "Ran sample tests"} in ${p.language}: ${p.status} — ${p.passed}/${p.total} passed${p.firstFailure ? `; first failure: ${JSON.stringify(p.firstFailure)}` : ""}${p.compileOutput ? `; compiler: ${String(p.compileOutput).slice(0, 300)}` : ""}.`);
        break;
    }
  }
  return facts.slice(-12);
}
