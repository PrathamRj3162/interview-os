import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai", () => ({ generateObject: vi.fn() }));
import { keepVerbatim } from "@/lib/services/resume-ai";

const RESUME = "PROJECTS\n• Trained a DenseNet121 transfer-learning model on 5,800 chest X-rays reaching 92% recall\n• Built a chat app";

describe("keepVerbatim", () => {
  it("keeps quotes present in the resume, tolerating punctuation/case", () => {
    const out = keepVerbatim(["trained a densenet121 transfer learning model on 5,800 chest x-rays reaching 92% recall"], (s) => s, RESUME);
    expect(out).toHaveLength(1);
  });
  it("drops invented claims", () => {
    expect(keepVerbatim(["Led a team of 12 engineers at Google to ship Gmail"], (s) => s, RESUME)).toHaveLength(0);
    expect(keepVerbatim(["Built"], (s) => s, RESUME)).toHaveLength(0);
  });
});

import { resumeAiSchema } from "@/lib/services/resume-ai";
describe("resumeAiSchema leniency", () => {
  it("normalises section/risk labels instead of rejecting the analysis", () => {
    const r = resumeAiSchema.parse({
      profile: {},
      claims: [{ claim: "Built a Redis caching layer", section: "Work Experience", risk: "High", concern: "c", questions: ["a", "b", "c"] },
               { claim: "Won a hackathon prize", section: "Awards & Honors", risk: "MEDIUM-HIGH", concern: "c", questions: ["a", "b", "c"] }],
    });
    expect(r.claims.map((c) => [c.section, c.risk])).toEqual([["experience", "high"], ["achievements", "medium"]]);
  });
});
