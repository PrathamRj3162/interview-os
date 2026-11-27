/**
 * One schema for every piece of learning content (cases, primers, questions, drills…). Items live in the repo
 * with a default `status`; an admin can override the status of a specific version on /review. Only `live`
 * items are shown to users; admins also see `reviewed` items (marked "Preview").
 */
export type ContentStatus = "draft" | "reviewed" | "live";
export type ContentType = "design-case" | "primer" | "design-question" | "estimation-drill" | "mc-problem" | "lld-lesson";
export type ContentDifficulty = "starter" | "intermediate" | "advanced";

export type ContentMeta = {
  /** Stable id, `<type>:<slug>`. */
  id: string;
  /** Bump on every content change: the new version needs review again. */
  version: number;
  type: ContentType;
  difficulty?: ContentDifficulty;
  tags: string[];
  /** Status shipped in code; existing (pre-gate) content is "live". */
  status: ContentStatus;
  /** Why this item exists / where the idea comes from (never copied text). */
  rationale?: string;
};

export type ContentCheck = { name: string; ok: boolean; detail?: string };

export const contentId = (type: ContentType, slug: string) => `${type}:${slug}`;
export const REPORT_REASONS = { wrong: "Something is wrong", unclear: "It's unclear", typo: "Typo or formatting", copied: "Looks copied from elsewhere", other: "Something else" } as const;
export type ReportReason = keyof typeof REPORT_REASONS;
