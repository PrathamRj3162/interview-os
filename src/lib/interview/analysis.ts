/** Deterministic transcript analysis (no AI): Q/A pairing, filler words, answer length, scoring maths. */

export type Turn = { role: "interviewer" | "candidate"; content: string; code?: string | null; board?: string | null };

export type QAPair = { index: number; question: string; answer: string; code: string | null; board?: string | null };

export const isHint = (t: Turn) => t.role === "interviewer" && t.content.startsWith("[Hint]");

/** Groups each interviewer message with the candidate messages that follow it. */
export function pairTurns(turns: Turn[]): QAPair[] {
  const pairs: QAPair[] = [];
  let current: QAPair | null = null;
  for (const t of turns) {
    if (t.role === "interviewer") {
      if (isHint(t)) continue;
      if (current) pairs.push(current);
      current = { index: pairs.length, question: t.content, answer: "", code: null };
    } else if (current) {
      current.answer = (current.answer ? current.answer + "\n" : "") + t.content;
      if (t.code) current.code = t.code;
      if (t.board) current.board = t.board;
    }
  }
  if (current) pairs.push(current);
  return pairs.filter((p) => p.answer.trim().length > 0).map((p, i) => ({ ...p, index: i }));
}

const FILLERS = ["um", "uh", "erm", "hmm", "like", "basically", "actually", "you know", "kind of", "sort of", "i mean", "literally", "so yeah"];

export function communicationStats(answers: string[]) {
  const text = answers.join(" ").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const fillers = FILLERS.map((f) => ({
    word: f,
    count: (text.match(new RegExp(`(^|[^a-z])${f.replace(" ", "\\s+")}(?=$|[^a-z])`, "g")) ?? []).length,
  })).filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  const fillerTotal = fillers.reduce((s, f) => s + f.count, 0);
  return {
    answers: answers.length,
    words,
    avgWordsPerAnswer: answers.length ? Math.round(words / answers.length) : 0,
    fillerPer100Words: words ? Math.round((fillerTotal / words) * 1000) / 10 : 0,
    fillers: fillers.slice(0, 6),
  };
}

/** Overall = mean of scored categories mapped from 1–5 to 0–100. Unscored (no evidence) categories are excluded. */
export function overallScore(categories: { score: number | null }[]): number | null {
  const scored = categories.map((c) => c.score).filter((s): s is number => typeof s === "number");
  if (scored.length === 0) return null;
  const mean = scored.reduce((a, b) => a + b, 0) / scored.length;
  return Math.round(((mean - 1) / 4) * 100);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** True when `quote` (≥3 words) appears in the candidate's own words. */
export function quoteInTranscript(quote: string, candidateText: string): boolean {
  const q = norm(quote);
  if (q.split(" ").length < 3) return false;
  return norm(candidateText).includes(q);
}
