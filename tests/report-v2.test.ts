import { describe, expect, it } from "vitest";
import { computeVerdict, baseLevel, pickOneThing, toPercent, type VerdictCategory } from "@/lib/interview/verdict";
import { computeMetrics, locateQuote, validateCodeNotes, numberLines, median, fmtClock } from "@/lib/interview/metrics";
import { ANCHORS, CORE, HLD_ANCHORS, anchorsFor, designLevel, weightOf } from "@/lib/interview/rubric";
import { RUBRICS } from "@/lib/interview/config";
import { toView } from "@/lib/interview/report-view";

const cat = (id: string, score: number | null, core = false): VerdictCategory => ({ id, name: id, score, core, weight: core ? 2 : 1 });

describe("rubric anchors", () => {
  it("every category of every round has 4 written anchors, and core ids exist in that round", () => {
    for (const [kind, cats] of Object.entries(RUBRICS)) {
      for (const c of cats) {
        if (kind !== "hld") expect(ANCHORS[c.id], `${kind}.${c.id}`).toBeDefined();
        else expect(HLD_ANCHORS[c.id], `hld.${c.id}`).toBeDefined();
        expect(anchorsFor(c.id)).toHaveLength(4);
      }
      for (const id of CORE[kind as keyof typeof CORE]) expect(cats.map((c) => c.id), `${kind} core ${id}`).toContain(id);
    }
    expect(weightOf("dsa", "correctness")).toBe(2);
    expect(weightOf("hld", "deep_dive")).toBe(2);
  });
  it("HLD v2: two distinct anchor sets per category, chosen by difficulty", () => {
    for (const [id, sets] of Object.entries(HLD_ANCHORS)) {
      expect(sets.sde1, id).toHaveLength(4); expect(sets.sde2, id).toHaveLength(4);
      expect(sets.sde1.slice(1), id).not.toEqual(sets.sde2.slice(1));
      expect(anchorsFor(id, { kind: "hld", level: "sde2" })).toEqual(sets.sde2);
    }
    expect(designLevel("medium")).toBe("sde1");
    expect(designLevel("hard")).toBe("sde2");
    expect(designLevel("expert")).toBe("sde2");
    // Other rounds keep their single anchor set even for shared ids.
    expect(anchorsFor("requirements", { kind: "lld" })).toEqual(ANCHORS.requirements);
    expect(weightOf("dsa", "communication")).toBe(1);
  });
});

describe("verdict", () => {
  it("maps the mean to a base level at the published thresholds", () => {
    expect(baseLevel(3.5)).toBe("strong_hire");
    expect(baseLevel(3.49)).toBe("hire");
    expect(baseLevel(3.0)).toBe("hire");
    expect(baseLevel(2.5)).toBe("lean_hire");
    expect(baseLevel(2.0)).toBe("lean_no");
    expect(baseLevel(1.99)).toBe("no_hire");
    expect(toPercent(1)).toBe(0);
    expect(toPercent(4)).toBe(100);
  });

  it("weights core categories double", () => {
    // (4·2 + 2·1 + 2·1) / 4 = 3.0 → Hire; unweighted it would be 2.67
    const v = computeVerdict({ answers: 5, categories: [cat("approach", 4, true), cat("a", 2), cat("b", 2)] });
    expect(v.mean).toBe(3);
    expect(v.level).toBe("hire");
    expect(v.overall).toBe(67);
  });

  it("is deterministic", () => {
    const input = { answers: 4, categories: [cat("approach", 3, true), cat("a", 4), cat("b", 2)] };
    expect(computeVerdict(input)).toEqual(computeVerdict(structuredClone(input)));
  });

  it("caps: a core 1 → Lean No; any 1 → Lean Hire; Strong Hire needs no score below 3", () => {
    expect(computeVerdict({ answers: 5, categories: [cat("approach", 1, true), cat("c", 4, true), cat("a", 4), cat("b", 4), cat("d", 4)] }).level).toBe("lean_no");
    const anyOne = computeVerdict({ answers: 5, categories: [cat("approach", 4, true), cat("a", 4), cat("b", 4), cat("c", 1)] });
    expect(anyOne.level).toBe("lean_hire");
    expect(anyOne.caps.join(" ")).toMatch(/"c" scored 1/);
    expect(computeVerdict({ answers: 5, categories: [cat("approach", 4, true), cat("x", 4, true), cat("a", 4), cat("b", 2)] }).level).toBe("hire");
  });

  it("coding caps: never verified → Lean No; examples only → Lean Hire; too slow → Lean Hire; accepted → no cap", () => {
    const cats = [cat("approach", 4, true), cat("correctness", 4, true), cat("a", 4)];
    expect(computeVerdict({ answers: 5, categories: cats, coding: { best: null, examplesPassed: false } }).level).toBe("lean_no");
    expect(computeVerdict({ answers: 5, categories: cats, coding: { best: null, examplesPassed: true } }).level).toBe("lean_hire");
    const slow = computeVerdict({ answers: 5, categories: cats, coding: { best: { status: "time_limit", passed: 9, total: 10, regularAllPassed: true }, examplesPassed: true } });
    expect(slow.level).toBe("lean_hire");
    expect(slow.caps[0]).toMatch(/too slow/);
    expect(computeVerdict({ answers: 5, categories: cats, coding: { best: { status: "accepted", passed: 10, total: 10, regularAllPassed: true }, examplesPassed: true } }).level).toBe("strong_hire");
  });

  it("hint caps: 2 → Hire, 3 → Lean Hire", () => {
    const cats = [cat("approach", 4, true), cat("a", 4)];
    expect(computeVerdict({ answers: 5, categories: cats, hintsUsed: 2 }).level).toBe("hire");
    expect(computeVerdict({ answers: 5, categories: cats, hintsUsed: 3 }).level).toBe("lean_hire");
  });

  it("refuses to guess without enough evidence", () => {
    expect(computeVerdict({ answers: 2, categories: [cat("approach", 4, true)] }).level).toBeNull();
    expect(computeVerdict({ answers: 5, categories: [cat("approach", 4, true), cat("a", null), cat("b", null)] }).level).toBeNull();
    const noCore = computeVerdict({ answers: 5, categories: [cat("approach", null, true), cat("a", 4), cat("b", 4)] });
    expect(noCore.level).toBeNull();
    expect(noCore.steps[0]).toMatch(/core/);
  });

  it("picks the ONE thing: lowest score, then core first, then rubric order", () => {
    expect(pickOneThing([cat("a", 3), cat("b", 2), cat("c", 2, true)])?.id).toBe("c");
    expect(pickOneThing([cat("a", 2), cat("b", 2)])?.id).toBe("a");
    expect(pickOneThing([cat("a", null)])).toBeNull();
  });
});

describe("metrics", () => {
  const t0 = "2026-01-01T10:00:00.000Z";
  const at = (s: number) => new Date(Date.parse(t0) + s * 1000).toISOString();
  it("computes reply times, talk share and coding timeline from timestamps", () => {
    const m = computeMetrics({
      startedAt: t0, endedAt: at(1800),
      turns: [
        { role: "interviewer", content: "one two three four", created_at: at(0) },
        { role: "candidate", content: "a b c d e f g h i j k l", created_at: at(30) },
        { role: "interviewer", content: "[Hint 1/3] look again", created_at: at(40) },
        { role: "candidate", content: "ok?", created_at: at(500) },
        { role: "interviewer", content: "five six", created_at: at(600) },
        { role: "candidate", content: "x y z", created_at: at(610) },
      ],
      events: [{ type: "run", payload: {}, created_at: at(300) }, { type: "run", payload: {}, created_at: at(900) }, { type: "language", payload: {}, created_at: at(950) }, { type: "run", payload: {}, created_at: at(1300) }],
      submissions: [{ status: "wrong_answer", passed: 3, total: 10, created_at: at(1000) }, { status: "accepted", passed: 10, total: 10, created_at: at(1200) }],
    });
    expect(m.durationMin).toBe(30);
    expect(m.medianReplySec).toBe(20); // 30 s and 10 s; the reply after a hint isn't counted
    expect(m.questionsAsked).toBe(1);
    expect(m.talkShare).toBe(62); // candidate 16 words vs interviewer 10
    expect(m.coding).toMatchObject({ firstRunMin: 5, firstSubmitMin: 16.7, acceptedMin: 20, runs: 3, submissions: 2, runsBeforeAccepted: 2, languageSwitches: 1 });
  });
  it("median and clock helpers", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(fmtClock(605)).toBe("10:05");
  });
});

describe("timestamped quotes", () => {
  const start = "2026-01-01T10:00:00.000Z";
  const turns = [
    { content: "First I would sort the array, then use two pointers.", created_at: "2026-01-01T10:02:05.000Z" },
    { content: "The time is O(n log n).", created_at: "2026-01-01T10:07:00.000Z" },
  ];
  it("finds the message a quote came from, ignoring punctuation and case", () => {
    expect(locateQuote("then use two pointers", turns, start)).toEqual({ found: true, at: 125 });
    expect(locateQuote("THE TIME IS O(n log n)", turns, start)).toEqual({ found: true, at: 420 });
  });
  it("accepts quotes spanning messages without a timestamp, rejects fabricated or short ones", () => {
    expect(locateQuote("two pointers. The time is", turns, start)).toEqual({ found: true, at: null });
    expect(locateQuote("I would use a heap", turns, start).found).toBe(false);
    expect(locateQuote("two pointers", turns, start).found).toBe(false);
  });
});

describe("code annotations", () => {
  const code = "def f(nums):\n    seen = {}\n    for i, x in enumerate(nums):\n        if x in seen:\n            return True\n        seen[x] = i\n    return False";
  it("keeps notes whose quote is on the cited (or nearest matching) line, drops fabricated ones", () => {
    const r = validateCodeNotes(code, [
      { line: 4, quote: "if x in seen:", kind: "good", note: "Constant-time lookup." },
      { line: 2, quote: "return False", kind: "edge_case", note: "Empty input returns False — fine." }, // real line is 7
      { line: 3, quote: "while True:", kind: "bug", note: "Not in the code." },
      { line: 4, quote: "if x in seen", kind: "style", note: "Duplicate line." },
      { line: 5, quote: "return True", kind: "weird-kind", note: "Unknown kind falls back to style." },
    ]);
    expect(r.notes.map((n) => [n.line, n.kind])).toEqual([[4, "good"], [5, "style"], [7, "edge_case"]]);
    expect(r.dropped).toBe(2);
  });
  it("numbers lines for the evaluator", () => {
    expect(numberLines("a\nb").split("\n")).toEqual(["  1| a", "  2| b"]);
  });
});

describe("report view", () => {
  it("shows v1 reports on their own 1–5 scale without inventing a verdict", () => {
    const v = toView({ version: 1, summary: "s", overall: 50, categories: [{ id: "a", name: "A", desc: "", score: 3, evidence: ["quote here please"], comment: "" }] });
    expect(v.scale).toBe(5);
    expect(v.verdict).toBeNull();
    expect(v.categories[0].evidence).toEqual([{ text: "quote here please", at: null }]);
  });
});

import { suggestDifficulty, harder } from "@/lib/interview/suggest";
describe("suggested difficulty", () => {
  const h = (difficulty: string, verdict: string | null, endedAt: string, kind = "dsa") => ({ kind, difficulty, verdict, endedAt });
  it("moves up after Hire, down after No Hire, stays after Lean Hire", () => {
    expect(suggestDifficulty([], "dsa").difficulty).toBe("medium");
    expect(suggestDifficulty([h("medium", "hire", "2026-11-02"), h("easy", "no_hire", "2026-11-01")], "dsa")).toMatchObject({ difficulty: "hard" });
    expect(suggestDifficulty([h("hard", "no_hire", "2026-11-02")], "dsa").difficulty).toBe("medium");
    expect(suggestDifficulty([h("hard", "lean_hire", "2026-11-02")], "dsa").difficulty).toBe("hard");
    expect(suggestDifficulty([h("expert", "strong_hire", "2026-11-02")], "dsa").difficulty).toBe("expert");
    expect(suggestDifficulty([h("beginner", "no_hire", "2026-11-02")], "dsa").difficulty).toBe("beginner");
  });
  it("two Lean No in a row at the same level steps down; other rounds are ignored", () => {
    expect(suggestDifficulty([h("medium", "lean_no", "2026-11-03"), h("medium", "lean_no", "2026-11-02")], "dsa").difficulty).toBe("easy");
    expect(suggestDifficulty([h("medium", "lean_no", "2026-11-03"), h("medium", "hire", "2026-11-02")], "dsa").difficulty).toBe("medium");
    expect(suggestDifficulty([h("hard", "hire", "2026-11-03", "hr")], "dsa").difficulty).toBe("medium");
    expect(harder("hard")).toBe("expert");
  });
});
