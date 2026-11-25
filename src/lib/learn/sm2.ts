/**
 * SM-2 spaced repetition (the SuperMemo-2 algorithm). Grades: Again = 1, Hard = 3, Good = 4, Easy = 5.
 * "Again" resets the card and shows it again in 10 minutes; passing grades grow the interval 1 → 6 → interval × ease.
 */
export type CardState = { ease: number; interval_days: number; repetitions: number };
export const GRADES = { again: 1, hard: 3, good: 4, easy: 5 } as const;
export type Grade = keyof typeof GRADES;

export function review(card: CardState, grade: Grade, now = new Date()): CardState & { due_at: string } {
  const q = GRADES[grade];
  const ease = Math.max(1.3, Math.round((card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))) * 100) / 100);
  if (q < 3) return { ease, interval_days: 0, repetitions: 0, due_at: new Date(now.getTime() + 10 * 60_000).toISOString() };
  const interval = card.repetitions === 0 ? 1 : card.repetitions === 1 ? 6 : Math.round(card.interval_days * ease);
  return { ease, interval_days: interval, repetitions: card.repetitions + 1, due_at: new Date(now.getTime() + interval * 86_400_000).toISOString() };
}
