import { contentId, type ContentMeta } from "@/lib/content/types";
import type { McProblem } from "./types";

/** Machine coding rounds: 110 = 90 min build + 20 min review; 60 = a shorter practice round. */
export const MC_DURATIONS = [60, 110] as const;
export const mcMeta = (p: McProblem): ContentMeta => ({ id: contentId("mc-problem", p.slug), version: p.version ?? 1, type: "mc-problem", difficulty: p.level === "Starter" ? "starter" : p.level === "Intermediate" ? "intermediate" : "advanced", tags: ["machine-coding"], status: p.status ?? "draft" });
