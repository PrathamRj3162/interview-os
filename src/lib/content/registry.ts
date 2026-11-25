import type { ContentCheck, ContentMeta } from "./types";
import { DESIGN_CASES, designMeta } from "@/lib/learn/design";
import { DESIGN_DIAGRAMS } from "@/lib/learn/design-diagrams";

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
  ];
}

export function allContent(): RegistryItem[] {
  return [
    ...DESIGN_CASES.map((c) => ({ meta: designMeta(c), title: c.title, href: `/system-design/${c.slug}`, checks: designCaseChecks(c) })),
  ];
}

export const CONTENT_BY_ID = (): Map<string, RegistryItem> => new Map(allContent().map((i) => [i.meta.id, i]));
