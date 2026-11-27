import { describe, expect, it } from "vitest";
import { makeDrill, parseEstimate, gradeEstimate } from "@/lib/learn/estimation";

describe("estimation trainer", () => {
  it("every template yields valid, positive, finite answers and steps over 1,000 seeds", () => {
    const stories = new Set<string>();
    const products = new Set<string>();
    for (let seed = 1; seed <= 1000; seed++) {
      const d = makeDrill(seed);
      for (const q of d.questions) {
        expect(Number.isFinite(d.answers[q.key]) && d.answers[q.key] > 0, `${seed} ${q.key}`).toBe(true);
        expect(d.steps[q.key].length).toBeGreaterThan(20);
      }
      expect(d.answers.peakReadQps).toBeCloseTo(d.answers.readQps * d.peakFactor);
      stories.add(d.story); products.add(d.product);
    }
    expect(products.size).toBe(8); // every template is reachable
    expect(stories.size).toBeGreaterThan(990); // effectively unique drills
  });
  it("is deterministic per seed", () => {
    expect(makeDrill(42)).toEqual(makeDrill(42));
  });
  it("answers follow from the givens", () => {
    const d = makeDrill(7);
    const writesDay = d.given.dau * d.given.writesPerUser;
    expect(d.answers.writeQps).toBeCloseTo(writesDay / 86400);
    expect(d.answers.storageTbYear).toBeCloseTo((writesDay * d.given.sizeBytes * 365) / 1e12);
  });
  it("parses common ways of writing numbers", () => {
    expect(parseEstimate("4k")).toBe(4000);
    expect(parseEstimate("4,000")).toBe(4000);
    expect(parseEstimate("2.5M")).toBe(2_500_000);
    expect(parseEstimate("4e3")).toBe(4000);
    expect(parseEstimate(" 0.3 ")).toBe(0.3);
    expect(parseEstimate("lots")).toBeNull();
    expect(parseEstimate("")).toBeNull();
  });
  it("grades with a 25% band and an order-of-magnitude band", () => {
    expect(gradeEstimate(1100, 1000)).toBe("good");
    expect(gradeEstimate(800, 1000)).toBe("good");
    expect(gradeEstimate(2500, 1000)).toBe("close");
    expect(gradeEstimate(400, 1000)).toBe("close");
    expect(gradeEstimate(10_000, 1000)).toBe("off");
    expect(gradeEstimate(0, 1000)).toBe("off");
  });
});
