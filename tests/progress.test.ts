import { describe, expect, it } from "vitest";
import { computeProgress, xpForLevel, levelFromXp, rankForLevel, tierFloorXp, dayKey, RANK_COUNT, type ProgressInput } from "@/lib/progress/xp";
import { computeAchievements, computeBests, weeklyRecap, dailyXp } from "@/lib/progress/achievements";

const T = (d: string, h = 12) => `${d}T${String(h).padStart(2, "0")}:00:00+05:30`;
const base = (over: Partial<ProgressInput> = {}): ProgressInput => ({ interviews: [], submissions: [], tasks: [], now: new Date(T("2026-11-20")), ...over });

describe("levels and ranks", () => {
  it("level k needs 150·k^1.6 XP", () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(1)).toBe(150);
    expect(xpForLevel(10)).toBe(Math.round(150 * Math.pow(10, 1.6)));
    expect(levelFromXp(149)).toBe(0);
    expect(levelFromXp(150)).toBe(1);
    expect(levelFromXp(xpForLevel(7) - 1)).toBe(6);
  });
  it("maps levels to 21 ranks, Intern III → Principal I", () => {
    expect(rankForLevel(0).label).toBe("Intern III");
    expect(rankForLevel(3).label).toBe("Intern II");
    expect(rankForLevel(8).label).toBe("Intern I");
    expect(rankForLevel(9).label).toBe("Junior III");
    expect(rankForLevel(18).label).toBe("SDE-1 III");
    expect(rankForLevel(60).label).toBe("Principal I");
    expect(rankForLevel(500).index).toBe(RANK_COUNT - 1);
    expect(tierFloorXp(13)).toBe(xpForLevel(9)); // Junior starts at level 9
  });
});

describe("XP formula", () => {
  it("interview = score × difficulty multiplier, needs 3 answers", () => {
    const p = computeProgress(base({ interviews: [
      { id: "a", kind: "dsa", difficulty: "hard", overall: 70, answers: 5, endedAt: T("2026-11-20") },
      { id: "b", kind: "hr", difficulty: "easy", overall: 90, answers: 2, endedAt: T("2026-11-20") },
    ] }));
    expect(p.bySource.interview).toBe(91); // 70 × 1.3; the 2-answer one earns nothing
  });
  it("problems: first accepted only, hint halving, first-try bonus", () => {
    const p = computeProgress(base({ submissions: [
      { slug: "two-sum", difficulty: "easy", status: "accepted", hintsUsed: 0, createdAt: T("2026-11-20", 10), language: "python" }, // 20 + 10
      { slug: "two-sum", difficulty: "easy", status: "accepted", hintsUsed: 0, createdAt: T("2026-11-20", 11), language: "cpp" },    // repeat: 0
      { slug: "three-sum", difficulty: "medium", status: "wrong_answer", hintsUsed: 2, createdAt: T("2026-11-20", 12), language: "python" },
      { slug: "three-sum", difficulty: "medium", status: "accepted", hintsUsed: 2, createdAt: T("2026-11-20", 13), language: "python" }, // 40 × 0.5
      { slug: "trapping-rain-water", difficulty: "hard", status: "accepted", hintsUsed: 1, createdAt: T("2026-11-20", 14), language: "java" }, // 80 + 10
    ] }));
    expect(p.bySource.problem).toBe(30 + 20 + 90);
  });
  it("tasks: +10 each, capped at 30 per day", () => {
    const p = computeProgress(base({ tasks: [1, 2, 3, 4, 5].map((h) => ({ doneAt: T("2026-11-19", h + 8) })).concat([{ doneAt: T("2026-11-20") }]) }));
    expect(p.bySource.task).toBe(30 + 10);
  });
  it("streak bonus: +5 × min(streak, 10) per active day; current and longest", () => {
    const days = Array.from({ length: 12 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
    const p = computeProgress(base({ tasks: days.map((d) => ({ doneAt: T(d) })), now: new Date(T("2026-11-12")) }));
    // days 1..10 → 5+10+…+50 = 275; days 11, 12 → 50 each
    expect(p.bySource.streak).toBe(275 + 100);
    expect(p.streak).toMatchObject({ current: 12, longest: 12, activeToday: true });
    const later = computeProgress(base({ tasks: days.map((d) => ({ doneAt: T(d) })), now: new Date(T("2026-11-14")) }));
    expect(later.streak.current).toBe(0);
  });
  it("is deterministic and uses the user's calendar day (IST by default)", () => {
    const i = base({ tasks: [{ doneAt: "2026-11-19T20:00:00Z" }] }); // 01:30 IST on the 20th
    expect(computeProgress(i)).toEqual(computeProgress(structuredClone(i)));
    expect(dayKey("2026-11-19T20:00:00Z")).toBe("2026-11-20");
  });
});

describe("decay", () => {
  const lots = Array.from({ length: 40 }, (_, k) => ({ id: String(k), kind: "dsa", difficulty: "expert", overall: 100, answers: 5, endedAt: T("2026-10-01") }));
  it("no decay within 7 inactive days; 1%/day after; never below the tier floor", () => {
    expect(computeProgress(base({ interviews: lots, now: new Date(T("2026-10-08")) })).decay).toBe(0);
    const p = computeProgress(base({ interviews: lots, now: new Date(T("2026-10-18")) }));
    expect(p.inactiveDays).toBe(17);
    expect(p.xp).toBe(Math.max(tierFloorXp(levelFromXp(p.rawXp)), Math.round(p.rawXp * Math.pow(0.99, 10))));
    const far = computeProgress(base({ interviews: lots, now: new Date(T("2028-01-01")) }));
    expect(far.rank.tier.id).toBe("junior"); // 40 × 160 XP = 6400 → level 10, Junior III
    expect(far.xp).toBe(tierFloorXp(levelFromXp(far.rawXp)));
    expect(far.xp).toBe(xpForLevel(9));
    expect(far.rank.tier.id).toBe(rankForLevel(levelFromXp(far.rawXp)).tier.id);
  });
});

describe("achievements, bests, recap", () => {
  const input = base({
    interviews: [
      { id: "1", kind: "dsa", difficulty: "medium", overall: 50, answers: 4, endedAt: T("2026-11-10"), verdict: "lean_no" },
      { id: "2", kind: "dsa", difficulty: "medium", overall: 70, answers: 4, endedAt: T("2026-11-18"), verdict: "hire" },
    ],
    submissions: [
      { slug: "reverse-linked-list", difficulty: "easy", status: "accepted", hintsUsed: 0, createdAt: T("2026-11-18", 9), language: "python", solveSeconds: 600 },
      { slug: "max-depth-binary-tree", difficulty: "easy", status: "accepted", hintsUsed: 0, createdAt: T("2026-11-19", 9), language: "cpp", solveSeconds: 300 },
      { slug: "three-sum", difficulty: "medium", status: "accepted", hintsUsed: 0, createdAt: T("2026-11-19", 10), language: "java", solveSeconds: 1500 },
    ],
  });
  const progress = computeProgress(input);
  const ctx = { ...input, progress };
  const a = Object.fromEntries(computeAchievements(ctx).map((x) => [x.id, x]));
  it("earns achievements with the moment they happened", () => {
    expect(a["first-interview"].earnedAt).toBe(T("2026-11-10"));
    expect(a["hireable"].earnedAt).toBe(T("2026-11-18"));
    expect(a["comeback"].earnedAt).toBe(T("2026-11-18")); // +20 in the same round
    expect(a["node-whisperer"].earnedAt).toBe(T("2026-11-19", 9));
    expect(a["polyglot"].earnedAt).toBe(T("2026-11-19", 10));
    expect(a["no-training-wheels"].earnedAt).toBe(T("2026-11-19", 10));
    expect(a["bar-raised"].earnedAt).toBeNull();
    expect(a["solver-10"].progress).toEqual({ have: 3, need: 10 });
  });
  it("bests and weekly recap", () => {
    const b = computeBests(ctx);
    expect(b.solved).toBe(3);
    expect(b.fastestSolve.find((f) => f.difficulty === "easy")?.seconds).toBe(300);
    expect(b.bestScoreByKind[0]).toMatchObject({ kind: "dsa", overall: 70 });
    const r = weeklyRecap(ctx, input.now);
    expect(r.thisWeek.solved).toBe(3);
    expect(r.lastWeek.interviews).toBe(1);
    const d = dailyXp(progress, input.now, 30);
    expect(d).toHaveLength(30);
    expect(d.at(-1)?.date).toBe("2026-11-20");
    expect(d.reduce((s, x) => s + x.xp, 0)).toBe(progress.rawXp);
  });
});
