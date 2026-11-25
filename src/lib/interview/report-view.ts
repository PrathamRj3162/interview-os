/**
 * One shape for the report page, whichever version produced the report. Version 1 reports (before the
 * verdict existed) used a 1–5 scale and plain-string evidence; they are shown as they were, without a
 * verdict, rather than being re-scored after the fact.
 */
import type { InterviewReport, ReportCategory } from "./engine";
import type { Anchors } from "./rubric";

export type ViewCategory = Omit<ReportCategory, "anchors" | "anchor" | "fix" | "core" | "weight" | "source"> &
  Partial<Pick<ReportCategory, "fix" | "core" | "weight" | "source">> & { anchors?: Anchors; anchor?: string | null };

export type ViewReport = Omit<InterviewReport, "version" | "scale" | "verdict" | "oneThing" | "drills" | "metrics" | "categories"> & {
  version: 1 | 2;
  scale: 4 | 5;
  verdict: InterviewReport["verdict"] | null;
  oneThing: InterviewReport["oneThing"];
  drills: InterviewReport["drills"];
  metrics: InterviewReport["metrics"] | null;
  categories: ViewCategory[];
};

type V1Category = { id: string; name: string; desc: string; score: number | null; evidence: string[]; comment: string };

export function toView(raw: unknown): ViewReport {
  const r = raw as Record<string, unknown>;
  if (r.version === 2) return { ...(raw as InterviewReport), version: 2 };
  const v1 = raw as Omit<InterviewReport, "categories"> & { categories: V1Category[] };
  return {
    ...v1,
    version: 1,
    scale: 5,
    verdict: null,
    oneThing: null,
    drills: [],
    metrics: null,
    categories: v1.categories.map((c) => ({ ...c, evidence: (c.evidence ?? []).map((text) => ({ text, at: null })) })),
  };
}
