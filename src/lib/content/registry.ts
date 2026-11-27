import type { ContentCheck, ContentMeta } from "./types";
import { DESIGN_CASES, designMeta } from "@/lib/learn/design";
import { DESIGN_DIAGRAMS } from "@/lib/learn/design-diagrams";
import { PRIMERS, primerMeta, type Primer } from "@/lib/learn/primers";
import { ESTIMATION_META, makeDrill } from "@/lib/learn/estimation";
import { MC_PROBLEMS } from "@/lib/mc/problems";
import { LLD_LESSONS, lldLessonMeta } from "@/lib/learn/lld-lessons";
import { MC_TEST_INPUTS } from "@/lib/mc/test-inputs";
import { mcMeta } from "@/lib/mc/meta";
import MC_EXPECTED from "@/lib/mc/expected.json";
import { DESIGN_QUESTIONS, designQuestionMeta } from "@/lib/learn/design-questions";

/**
 * Every reviewable content item with the automated checks CI also runs. /review shows these, so a reviewer
 * sees the same facts the tests enforce. New content types register here.
 */
export type RegistryItem = { meta: ContentMeta; title: string; href: string; checks: ContentCheck[] };

const has = (name: string, ok: boolean, detail?: string): ContentCheck => ({ name, ok, detail: ok ? undefined : detail });

function designCaseChecks(c: (typeof DESIGN_CASES)[number]): ContentCheck[] {
  const d = DESIGN_DIAGRAMS[c.slug];
  const ids = new Set(d?.nodes.map((n) => n.id) ?? []);
  return [
    has("Prompt written", c.prompt.length >= 30, "Prompt is too short"),
    has("Requirements", c.functional.length >= 2 && c.nonFunctional.length >= 2, "Needs ≥2 functional and ≥2 non-functional"),
    has("Components and deep dives", c.components.length >= 3 && c.deepDives.length >= 2, "Needs ≥3 components, ≥2 deep dives"),
    has("Trade-offs and follow-ups", c.tradeoffs.length >= 1 && c.followUps.length >= 2, "Needs ≥1 trade-off, ≥2 follow-ups"),
    has("Reference diagram", Boolean(d) && d!.edges.every((e) => ids.has(e.from) && ids.has(e.to)), "Missing diagram or an edge points at an unknown node"),
    has("Level variants", Boolean(c.variants?.sde1 && c.variants?.sde2), "Needs SDE-1 and SDE-2 versions"),
    has("Must-cover checklist", (c.checklist?.length ?? 0) >= 5 && new Set(c.checklist!.map((x) => x.id)).size === c.checklist!.length && c.checklist!.every((x) => x.weight >= 1 && x.weight <= 3), "Needs ≥5 items with unique ids and weights 1–3"),
    has("Three curveballs", c.curveballs?.length === 3, "Needs exactly 3 curveballs"),
    has("Five common mistakes", c.mistakes?.length === 5, "Needs exactly 5 common mistakes"),
  ];
}

function estimationChecks(): ContentCheck[] {
  let ok = true;
  for (let s = 1; s <= 200 && ok; s++) { const d = makeDrill(s); ok = d.questions.every((q) => Number.isFinite(d.answers[q.key]) && d.answers[q.key] > 0 && d.steps[q.key].length > 20); }
  return [has("Templates produce valid drills (200 seeds)", ok, "A template produced an invalid answer")];
}

function mcChecks(p: (typeof MC_PROBLEMS)[number]): ContentCheck[] {
  const tests = MC_TEST_INPUTS[p.slug] ?? [];
  const exp = (MC_EXPECTED as Record<string, { sample: string; tests: Record<string, string> } | undefined>)[p.slug];
  return [
    has("Statement, I/O contract, core and bonus", p.statement.length > 0 && p.io.length >= 2 && p.core.length >= 2 && p.bonus.length >= 1, "Incomplete statement"),
    has("Minute-60 extension", p.extension.io.length >= 1 && p.extension.text.length >= 1, "Missing extension"),
    has("Hidden tests (≥3 core, ≥1 extension)", tests.filter((t) => !t.ext).length >= 3 && tests.some((t) => t.ext), "Not enough tests"),
    has("Reference outputs generated (sample matches the statement)", Boolean(exp) && exp!.sample === p.sample.output.replace(/\s+$/gm, "").trim() && tests.every((t) => typeof exp!.tests[t.name] === "string"), "Run scripts/mc-expected.mts"),
  ];
}

function primerChecks(p: Primer): ContentCheck[] {
  const words = p.answer30.split(/\s+/).length;
  return [
    has("When to use and trade-offs", p.when.length >= 2 && p.tradeoffs.length >= 2, "Needs ≥2 of each"),
    has("30-second answer", words >= 30 && words <= 110, `Should be 30–110 words (has ${words})`),
    has("Three check questions", p.checks.length === 3 && p.checks.every((c) => c.options.length === 4 && new Set(c.options).size === 4 && c.answer >= 0 && c.answer < 4 && c.why.length > 15), "Needs 3 questions with 4 distinct options, a valid answer and an explanation"),
    has("Linked cases exist", p.cases.length >= 1 && p.cases.every((s) => DESIGN_CASES.some((c) => c.slug === s)), "Every linked case must exist"),
  ];
}

export function allContent(): RegistryItem[] {
  return [
    ...DESIGN_QUESTIONS.map((x) => ({ meta: designQuestionMeta(x), title: x.q, href: "/system-design/drill", checks: [
      has("4–6 key points with unique ids", x.keyPoints.length >= 4 && x.keyPoints.length <= 6 && new Set(x.keyPoints.map((p) => p.id)).size === x.keyPoints.length, "Needs 4–6 key points with unique ids"),
      has("Question is a scenario", x.q.length >= 40 && x.q.trim().endsWith("?"), "Should be a full scenario question"),
    ] })),
    ...MC_PROBLEMS.map((p) => ({ meta: mcMeta(p), title: `Machine coding: ${p.title}`, href: `/interview/new?kind=machine_coding&mc=${p.slug}`, checks: mcChecks(p) })),
    ...LLD_LESSONS.map((l) => ({ meta: lldLessonMeta(l), title: `LLD: ${l.title}`, href: `/system-design/lld/${l.slug}`, checks: [
      has("When an interviewer expects it", l.expect.length >= 2, "Needs ≥2 situations"),
      has("Content with code", l.sections.length >= 1 && l.sections.some((s) => s.code || (s.before && s.after)) || l.group === "principles", "Needs at least one code sketch"),
      has("Traps", l.pitfalls.length >= 2, "Needs ≥2 traps"),
      has("Linked cases exist", l.cases.length >= 1 && l.cases.every((s) => DESIGN_CASES.some((c) => c.slug === s)), `Unknown case in: ${l.cases.join(", ")}`),
    ] })),
    { meta: ESTIMATION_META, title: "Estimation trainer (drill templates)", href: "/system-design/estimation", checks: estimationChecks() },
    ...PRIMERS.map((p) => ({ meta: primerMeta(p), title: p.title, href: `/system-design/primers/${p.slug}`, checks: primerChecks(p) })),
    ...DESIGN_CASES.map((c) => ({ meta: designMeta(c), title: c.title, href: `/system-design/${c.slug}`, checks: designCaseChecks(c) })),
  ];
}

export const CONTENT_BY_ID = (): Map<string, RegistryItem> => new Map(allContent().map((i) => [i.meta.id, i]));
