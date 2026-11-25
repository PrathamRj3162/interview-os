import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { review } from "@/lib/learn/sm2";
import { planWeek, type PlannerInput } from "@/lib/learn/planner";
import { PATTERNS } from "@/lib/dsa/patterns";
import { PROBLEMS } from "@/lib/dsa/bank";
import { FUNDAMENTALS, QUESTION_BY_ID, pickQuestions } from "@/lib/learn/fundamentals";

describe("SM-2", () => {
  const now = new Date("2026-11-25T10:00:00Z");
  const fresh = { ease: 2.5, interval_days: 0, repetitions: 0 };
  it("good answers grow the interval 1 → 6 → × ease", () => {
    const a = review(fresh, "good", now);
    expect(a).toMatchObject({ interval_days: 1, repetitions: 1, ease: 2.5 });
    const b = review(a, "good", now);
    expect(b.interval_days).toBe(6);
    const c = review(b, "good", now);
    expect(c.interval_days).toBe(Math.round(6 * c.ease));
    expect(c.due_at).toBe(new Date(now.getTime() + c.interval_days * 86_400_000).toISOString());
  });
  it("again resets and comes back in 10 minutes; ease never drops below 1.3", () => {
    let s = { ease: 1.35, interval_days: 20, repetitions: 5 };
    const r = review(s, "again", now);
    expect(r).toMatchObject({ interval_days: 0, repetitions: 0 });
    expect(r.ease).toBe(1.3);
    expect(Date.parse(r.due_at) - now.getTime()).toBe(10 * 60_000);
    s = review({ ease: 2.5, interval_days: 6, repetitions: 2 }, "easy", now);
    expect(s.ease).toBe(2.6);
    expect(review({ ease: 2.5, interval_days: 6, repetitions: 2 }, "hard", now).ease).toBe(2.36);
  });
});

describe("weekly planner", () => {
  const base: PlannerInput = {
    start: "2026-11-25", dailyMinutes: 60, deadline: null,
    weakAreas: [{ name: "Complexity analysis", kind: "dsa", fix: "State time and space before coding.", reportId: "r1" }],
    unsolved: [{ slug: "three-sum", title: "3Sum" }],
    patterns: [{ slug: "graphs", title: "Graphs", solved: 0, total: 7 }, { slug: "hashing", title: "Hash maps", solved: 5, total: 5 }],
    fundamentals: [{ slug: "os", name: "Operating systems", pct: null }, { slug: "dbms", name: "DBMS", pct: 90 }],
    dueCards: 4, recentKinds: ["dsa"], existing: [],
  };
  it("respects the daily budget, adds daily revision and explains every task", () => {
    const t = planWeek(base);
    const perDay = new Map<string, number>();
    for (const x of t) perDay.set(x.due_date, (perDay.get(x.due_date) ?? 0) + x.minutes);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(60);
    expect(t.filter((x) => x.kind === "revision")).toHaveLength(7);
    expect(t.every((x) => x.reason.length > 0 && x.link.startsWith("/"))).toBe(true);
    expect(t.some((x) => x.title === 'Finish "3Sum"')).toBe(true);
    expect(t.some((x) => x.title.startsWith("Graphs"))).toBe(true);
    expect(t.some((x) => x.title.startsWith("Hash maps"))).toBe(true); // weakest first, but still planned
    expect(t.some((x) => x.title === "DBMS quiz")).toBe(false);          // 90% → no quiz
    expect(t.some((x) => x.title === "Operating systems quiz")).toBe(true);
  });
  it("is deterministic, skips existing tasks and stops at the deadline", () => {
    expect(planWeek(base)).toEqual(planWeek(structuredClone(base)));
    const t = planWeek({ ...base, existing: [{ due_date: "2026-11-25", title: "Review due flashcards" }] });
    expect(t.filter((x) => x.title === "Review due flashcards" && x.due_date === "2026-11-25")).toHaveLength(0);
    const short = planWeek({ ...base, deadline: "2026-11-27" });
    expect(short.every((x) => x.due_date <= "2026-11-27")).toBe(true);
  });
});

describe("learning content integrity", () => {
  it("every pattern links to real problem tags", () => {
    const tags = new Set(PROBLEMS.flatMap((p) => p.topics));
    for (const p of PATTERNS) {
      expect(p.topics.some((t) => tags.has(t)), p.slug).toBe(true);
      for (const t of p.topics) expect(tags.has(t), `${p.slug}: ${t}`).toBe(true);
    }
  });
  it("fundamentals bank: 4 topics × 15, unique ids, valid answers, explanations", () => {
    expect(FUNDAMENTALS).toHaveLength(4);
    const ids = FUNDAMENTALS.flatMap((t) => t.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of FUNDAMENTALS) {
      expect(t.questions).toHaveLength(15);
      for (const q of t.questions) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.why.length).toBeGreaterThan(20);
      }
    }
    expect(QUESTION_BY_ID.os1.topic).toBe("os");
    const pick = pickQuestions(FUNDAMENTALS[0]);
    expect(new Set(pick.map((q) => q.id)).size).toBe(10);
  });
});

import { parseRepoUrl } from "@/lib/projects/github";
import { notableDeps, ruleQuestions } from "@/lib/projects/analyze";
describe("project repo helpers", () => {
  it("accepts only public github.com repo URLs", () => {
    expect(parseRepoUrl("https://github.com/owner/repo")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseRepoUrl("https://github.com/owner/repo.git/")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseRepoUrl("http://github.com/owner/repo")).toBeNull();
    expect(parseRepoUrl("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner/repo/tree/main")).toBeNull();
  });
  it("ranks frameworks first, collapses scopes and drops tooling", () => {
    expect(notableDeps(["@types/node", "eslint", "zod", "@supabase/ssr", "@supabase/supabase-js", "react", "next"])).toEqual(["next", "react", "@supabase", "zod"]);
  });
  it("template questions mention missing tests and CI honestly", () => {
    const qs = ruleQuestions({ dependencies: ["express"], signals: { tests: false, ci: false, docker: false, license: false } } as never, "Shop").map((q) => q.question).join(" | ");
    expect(qs).toMatch(/Why did you choose express/);
    expect(qs).toMatch(/don't see automated tests/);
    expect(qs).toMatch(/deployed/);
  });
});
