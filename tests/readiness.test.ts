import { describe, expect, it } from "vitest";
import { computeReadiness, daysUntil } from "@/lib/readiness";

describe("computeReadiness", () => {
  it("returns null (not zero) when there is no evidence", () => {
    expect(computeReadiness({ submissions: 0, accepted: 0, quizAttempts: 0, quizScoreSum: 0, quizTotalSum: 0, interviewsCompleted: 0, interviewScoreAvg: null }))
      .toEqual({ codingAccuracy: null, fundamentals: null, mockInterview: null });
  });
  it("computes percentages from real counts", () => {
    expect(computeReadiness({ submissions: 4, accepted: 3, quizAttempts: 2, quizScoreSum: 7, quizTotalSum: 10, interviewsCompleted: 1, interviewScoreAvg: 61.6 }))
      .toEqual({ codingAccuracy: 75, fundamentals: 70, mockInterview: 62 });
  });
});

describe("daysUntil", () => {
  it("counts calendar days", () => {
    const now = new Date(2026, 10, 25, 22, 0);
    expect(daysUntil("2026-11-25", now)).toBe(0);
    expect(daysUntil("2026-12-05", now)).toBe(10);
    expect(daysUntil(null, now)).toBeNull();
  });
});
