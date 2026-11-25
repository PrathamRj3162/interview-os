/**
 * Deterministic readiness metrics. A metric is `null` until the user has real evidence for it —
 * we never show a fabricated score.
 */
export type ActivityCounts = {
  submissions: number;
  accepted: number;
  quizAttempts: number;
  quizScoreSum: number;
  quizTotalSum: number;
  interviewsCompleted: number;
  interviewScoreAvg: number | null;
};

export type Readiness = {
  codingAccuracy: number | null; // % of submissions accepted
  fundamentals: number | null;   // % of quiz questions answered correctly
  mockInterview: number | null;  // average completed interview score (0-100)
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

export function computeReadiness(a: ActivityCounts): Readiness {
  return {
    codingAccuracy: pct(a.accepted, a.submissions),
    fundamentals: pct(a.quizScoreSum, a.quizTotalSum),
    mockInterview: a.interviewsCompleted > 0 && a.interviewScoreAvg !== null ? Math.round(a.interviewScoreAvg) : null,
  };
}

export function daysUntil(deadline: string | null, now = new Date()): number | null {
  if (!deadline) return null;
  const end = new Date(deadline + "T00:00:00");
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
