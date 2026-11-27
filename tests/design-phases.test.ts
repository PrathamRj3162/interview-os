import { describe, expect, it } from "vitest";
import { designPlan, nextDesignPhase, pickCurveball, DEFAULT_CURVEBALLS, DESIGN_PHASES } from "@/lib/interview/design-phases";

const step = (o: Partial<Parameters<typeof nextDesignPhase>[0]>) => nextDesignPhase({ current: "requirements", elapsedMin: 0, durationMin: 45, aiAdvance: false, candidateTurns: 1, ...o });

describe("design phase machine", () => {
  it("45-minute plan follows 5/5/5/10/15/5 and scales with duration", () => {
    const p = designPlan(45);
    expect(p.map((w) => [w.phase, Math.round(w.start), Math.round(w.end)])).toEqual([
      ["requirements", 0, 5], ["estimates", 5, 10], ["api", 10, 15], ["high_level", 15, 25], ["deep_dive", 25, 40], ["curveball", 40, 45], ["wrap", 45, 45],
    ]);
    const p60 = designPlan(60);
    expect(p60.find((w) => w.phase === "deep_dive")!.end - p60.find((w) => w.phase === "deep_dive")!.start).toBeCloseTo(20);
  });
  it("stays put inside the window unless the interviewer advances", () => {
    expect(step({ elapsedMin: 3 }).phase).toBe("requirements");
    expect(step({ elapsedMin: 3, aiAdvance: true })).toMatchObject({ phase: "estimates", reason: "interviewer moved on", overrun: false });
  });
  it("an early advance needs a candidate answer", () => {
    expect(step({ elapsedMin: 1, aiAdvance: true, candidateTurns: 0 }).phase).toBe("requirements");
  });
  it("time pushes forward, skipping phases if needed, and flags the overrun", () => {
    expect(step({ elapsedMin: 6 })).toMatchObject({ phase: "estimates", reason: "time", overrun: true });
    expect(step({ elapsedMin: 26 })).toMatchObject({ phase: "deep_dive", overrun: true });
    expect(step({ current: "deep_dive", elapsedMin: 41 })).toMatchObject({ phase: "curveball", reason: "time" });
  });
  it("never moves backwards, and wraps up near the end", () => {
    expect(step({ current: "deep_dive", elapsedMin: 2 }).phase).toBe("deep_dive");
    expect(step({ current: "api", elapsedMin: 43.5 })).toMatchObject({ phase: "wrap", reason: "time almost up" });
    expect(step({ current: "wrap", elapsedMin: 10, aiAdvance: true }).phase).toBe("wrap");
  });
  it("reports minutes left in the phase", () => {
    expect(step({ elapsedMin: 2 }).phaseMinutesLeft).toBeCloseTo(3);
  });
  it("curveball pick is deterministic and from the list", () => {
    expect(pickCurveball("abc")).toBe(pickCurveball("abc"));
    expect(DEFAULT_CURVEBALLS).toContain(pickCurveball("xyz"));
    expect(new Set(["a", "b", "c", "d", "e", "f", "g"].map((s) => pickCurveball(s))).size).toBeGreaterThan(1);
  });
  it("phase list matches the DB constraint", () => {
    expect(DESIGN_PHASES).toEqual(["requirements", "estimates", "api", "high_level", "deep_dive", "curveball", "wrap"]);
  });
});
