import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai", () => ({ generateObject: vi.fn(), AIUnavailableError: class extends Error {} }));

describe("chunked evaluation fallback", async () => {
  const { evaluateInterview } = await import("@/lib/interview/engine");
  const { generateObject } = await import("@/lib/ai");
  it("retries in small calls when the full evaluation fails; a failed category stays unscored", async () => {
    const quote = "I would use a hash map keyed by value";
    vi.mocked(generateObject).mockImplementation(async (schema, messages, opts) => {
      const system = (messages as { content: string }[])[0].content;
      if ((opts as { maxTokens?: number })?.maxTokens === 9000) throw new Error("AI output failed validation: truncated");
      const only = /Score ONLY these categories: ([\w, ]+)\./.exec(system)?.[1]?.split(", ");
      if (only?.includes("complexity")) throw new Error("provider busy"); // this group fails
      const raw = only
        ? { categories: only.map((id) => ({ id, score: 3, evidence: [quote], comment: "ok", fix: `fix ${id}` })) }
        : system.includes("Return JSON with keys: summary")
          ? { summary: "Chunked summary.", strengths: ["a"], weaknesses: ["b"], mistakes: [], missed_concepts: ["c"], drills: [{ title: "d1", how: "x" }], communication_comment: "fine" }
          : system.includes('{"questions"') ? { questions: [{ index: 0, correct: ["x"] }] } : { code_notes: [] };
      return { data: (schema as import("zod").ZodType).parse(raw), provider: "gemini", model: "m" };
    });
    const stages: string[] = [];
    const turns = [
      { role: "interviewer" as const, content: "How would you solve two sum?" }, { role: "candidate" as const, content: `${quote} and check the complement first.` },
      { role: "interviewer" as const, content: "Complexity?" }, { role: "candidate" as const, content: "Linear time, linear space." },
      { role: "interviewer" as const, content: "Edge cases?" }, { role: "candidate" as const, content: "Duplicates and negative numbers." },
    ];
    const r = await evaluateInterview(
      { id: "x", kind: "dsa", difficulty: "medium", persona: "dsa", mode: "mock", company: null, language: "python", duration_min: 20, started_at: new Date().toISOString() },
      turns, { metrics: { durationMin: 5, talkShare: 50, medianReplySec: 10, questionsAsked: 0 }, onStage: (s) => stages.push(s) },
    );
    expect(r.summary).toBe("Chunked summary.");
    expect(r.model).toMatch(/in parts/);
    const byId = Object.fromEntries(r.categories.map((c) => [c.id, c.score]));
    expect(byId.understanding).toBe(3);
    expect(byId.complexity).toBeNull(); // its call failed → unscored, never guessed
    expect(stages[0]).toMatch(/smaller pieces/);
    expect(stages.some((s) => /Scored \d+\/7 rubric categories/.test(s))).toBe(true);
    expect(r.questions[0].correct).toEqual(["x"]);
  });
});
