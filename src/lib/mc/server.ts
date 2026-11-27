import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { MC_BY_SLUG, mcStarter } from "./problems";
import { MC_TEST_INPUTS } from "./test-inputs";
import expectedJson from "./expected.json";
import { MC_LANGS, type McFiles, type McLang, type McProblem } from "./types";

const EXPECTED = expectedJson as Record<string, { sample: string; tests: Record<string, string> }>;

export type McWorkspace = { language: McLang; files: McFiles; savedAt?: string; filesAtLastTurn?: McFiles };
export type McTest = { name: string; input: string; expected: string; ext: boolean };
export type McPlan = { buildMin: number; reviewMin: number; revealAtMin: number };

export const isMcLang = (v: unknown): v is McLang => typeof v === "string" && (MC_LANGS as string[]).includes(v);

/** 110 minutes = 90 build + 20 review; shorter practice rounds keep the same proportions. Extension at 2/3 of the build. */
export function mcPlan(durationMin: number): McPlan {
  const reviewMin = durationMin >= 100 ? 20 : Math.max(5, Math.round(durationMin * 0.2));
  const buildMin = durationMin - reviewMin;
  return { buildMin, reviewMin, revealAtMin: Math.round((buildMin * 2) / 3) };
}

export function mcTests(slug: string): McTest[] {
  const exp = EXPECTED[slug];
  return (MC_TEST_INPUTS[slug] ?? []).map((t) => ({ name: t.name, input: t.input, expected: exp?.tests[t.name] ?? "", ext: Boolean(t.ext) }));
}

export function mcContextFor(iv: { mc_problem?: string | null; duration_min: number }): { problem: McProblem; plan: McPlan } | null {
  const problem = iv.mc_problem ? MC_BY_SLUG[iv.mc_problem] : undefined;
  return problem ? { problem, plan: mcPlan(iv.duration_min) } : null;
}

export function initialMcWorkspace(language: string | null): McWorkspace {
  const lang = isMcLang(language) ? language : "java";
  return { language: lang, files: mcStarter(lang) };
}

export type McProgress = { phase: "build" | "review" | "wrap"; elapsedMin: number; revealed: boolean; plan: McPlan };

/**
 * Moves the round on by the clock, on the server: at the reveal time the files saved so far are snapshotted
 * (server-only column) and the extension is shown; at the end of the build time the phase becomes "review".
 */
export async function advanceMc(supabase: SupabaseClient, iv: { id: string; user_id: string; started_at: string; duration_min: number; phase: string | null; workspace: unknown; mc_snapshot?: unknown; mc_problem?: string | null }): Promise<McProgress> {
  const plan = mcPlan(iv.duration_min);
  const elapsedMin = (Date.now() - Date.parse(iv.started_at)) / 60_000;
  let revealed = Boolean(iv.mc_snapshot);
  let phase = (iv.phase === "review" || iv.phase === "wrap" ? iv.phase : "build") as McProgress["phase"];
  if (!revealed && elapsedMin >= plan.revealAtMin) {
    const ws = iv.workspace as McWorkspace | null;
    const admin = createAdminClient();
    // Only the first request after the reveal time writes the snapshot (is("mc_snapshot", null) makes it a no-op otherwise).
    await admin.from("mock_interviews").update({ mc_snapshot: { files: ws?.files ?? {}, at: new Date().toISOString(), atMin: Math.round(elapsedMin) } }).eq("id", iv.id).is("mc_snapshot", null);
    await admin.from("interview_events").insert({ interview_id: iv.id, user_id: iv.user_id, type: "extension", payload: { atMin: Math.round(elapsedMin) } });
    revealed = true;
    iv.mc_snapshot = true;
  }
  if (phase === "build" && elapsedMin >= plan.buildMin) {
    await supabase.from("mock_interviews").update({ phase: "review" }).eq("id", iv.id);
    phase = "review";
    iv.phase = "review";
  }
  return { phase, elapsedMin, revealed, plan };
}

/** All files as one text block for the interviewer/evaluator, capped. */
export function filesAsText(files: McFiles, cap = 24_000): string {
  let out = "";
  for (const [name, src] of Object.entries(files)) {
    const block = `// ===== ${name} =====\n${src}\n`;
    if (out.length + block.length > cap) { out += `// ===== ${name} (truncated) =====\n${src.slice(0, Math.max(0, cap - out.length - 60))}\n`; break; }
    out += block;
  }
  return out;
}
