import { describe, expect, it } from "vitest";
import { pairTurns, communicationStats, overallScore, quoteInTranscript } from "@/lib/interview/analysis";

describe("pairTurns", () => {
  it("pairs questions with following answers, skipping hints and unanswered questions", () => {
    const pairs = pairTurns([
      { role: "interviewer", content: "Why Redis?" },
      { role: "candidate", content: "Low latency." },
      { role: "candidate", content: "And TTL support.", code: "x" },
      { role: "interviewer", content: "[Hint] think about eviction" },
      { role: "interviewer", content: "What about stampedes?" },
      { role: "interviewer", content: "Closing question?" },
    ]);
    expect(pairs).toEqual([{ index: 0, question: "Why Redis?", answer: "Low latency.\nAnd TTL support.", code: "x" }]);
  });
});

describe("communicationStats", () => {
  it("counts fillers without false positives inside words", () => {
    const s = communicationStats(["Um so basically I used a hashmap, like, you know", "The likelihood is low"]);
    const map = Object.fromEntries(s.fillers.map((f) => [f.word, f.count]));
    expect(map.um).toBe(1);
    expect(map.basically).toBe(1);
    expect(map["you know"]).toBe(1);
    expect(map.like).toBe(1); // "likelihood" not counted
    expect(s.answers).toBe(2);
  });
});

describe("overallScore", () => {
  it("maps 1–5 to 0–100 and ignores unscored categories", () => {
    expect(overallScore([{ score: 5 }, { score: 3 }, { score: null }])).toBe(75);
    expect(overallScore([{ score: null }])).toBeNull();
    expect(overallScore([{ score: 1 }])).toBe(0);
  });
});

describe("quoteInTranscript", () => {
  it("accepts real quotes and rejects fabricated or too-short ones", () => {
    const t = "I picked Redis because it gives sub-millisecond reads.";
    expect(quoteInTranscript("picked redis because it gives", t)).toBe(true);
    expect(quoteInTranscript("I used Kafka for streaming", t)).toBe(false);
    expect(quoteInTranscript("Redis", t)).toBe(false);
  });
});

import { vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai", () => ({ generateObject: vi.fn() }));
describe("evaluator schema leniency", async () => {
  const { evaluateInterview } = await import("@/lib/interview/engine");
  const { generateObject } = await import("@/lib/ai");
  it("accepts strings where lists/objects are expected and still verifies evidence", async () => {
    vi.mocked(generateObject).mockImplementation(async (schema) => ({
      provider: "gemini" as const, model: "m",
      data: (schema as import("zod").ZodType).parse({
        summary: "ok",
        categories: [{ id: "architecture", score: "4", evidence: "I used DenseNet121 with transfer learning; invented quote never said", comment: "good" }],
        questions: [{ index: 0, correct: "Chose transfer learning", incomplete: "", incorrect: null, missing: "- validation\n- calibration", study: "k-fold" }],
        priorities: ["Learn k-fold cross-validation", { topic: "Calibration", action: "Read about reliability diagrams", kind: "Lesson" }],
      }),
    }));
    const r = await evaluateInterview(
      { id: "x", kind: "project", difficulty: "medium", persona: "skeptic", mode: "mock", company: null, language: null, duration_min: 10, started_at: new Date().toISOString() },
      [{ role: "interviewer", content: "Why DenseNet?" }, { role: "candidate", content: "I used DenseNet121 with transfer learning because of feature reuse." }],
    );
    const arch = r.categories.find((c) => c.id === "architecture")!;
    expect(arch.score).toBe(4);
    expect(arch.evidence).toEqual(["I used DenseNet121 with transfer learning"]);
    expect(r.evidence_dropped).toBe(1);
    expect(r.questions[0].missing).toEqual(["validation", "calibration"]);
    expect(r.priorities.map((p) => p.topic)).toEqual(["Learn k-fold cross-validation", "Calibration"]);
    expect(r.priorities[1].kind).toBe("lesson");
    expect(r.overall).toBe(75);
  });
});
