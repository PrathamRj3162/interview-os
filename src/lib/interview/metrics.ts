/**
 * Objective interview metrics, computed in code from timestamps and recorded events — no AI involved.
 * Also: locating evidence quotes in time, and validating AI annotations of the candidate's code.
 */

export type TimedTurn = { role: "interviewer" | "candidate"; content: string; created_at: string };
export type TimedEvent = { type: string; payload: Record<string, unknown>; created_at: string };
export type TimedSubmission = { status: string; passed: number; total: number; created_at: string };

export type Metrics = {
  durationMin: number;
  /** Candidate's share of all words spoken/typed in the interview (%). */
  talkShare: number;
  /** Median seconds from an interviewer message to the candidate's reply (includes typing or speaking time). */
  medianReplySec: number | null;
  /** Candidate messages that asked something. */
  questionsAsked: number;
  coding?: {
    firstRunMin: number | null;
    firstSubmitMin: number | null;
    acceptedMin: number | null;
    runs: number;
    submissions: number;
    runsBeforeAccepted: number | null;
    languageSwitches: number;
  };
};

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const minutesSince = (start: number, iso: string) => Math.round(((new Date(iso).getTime() - start) / 60000) * 10) / 10;

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function computeMetrics(opts: {
  startedAt: string; endedAt: string; turns: TimedTurn[];
  events?: TimedEvent[]; submissions?: TimedSubmission[];
}): Metrics {
  const start = new Date(opts.startedAt).getTime();
  const end = new Date(opts.endedAt).getTime();
  const cand = opts.turns.filter((t) => t.role === "candidate");
  const cw = cand.reduce((s, t) => s + words(t.content), 0);
  const iw = opts.turns.filter((t) => t.role === "interviewer").reduce((s, t) => s + words(t.content), 0);

  const replies: number[] = [];
  for (let i = 1; i < opts.turns.length; i++) {
    const a = opts.turns[i - 1], b = opts.turns[i];
    if (a.role === "interviewer" && b.role === "candidate" && !a.content.startsWith("[Hint")) {
      const sec = (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) / 1000;
      if (sec >= 0 && sec < 3600) replies.push(Math.round(sec));
    }
  }

  const m: Metrics = {
    durationMin: Math.max(0, Math.round(((end - start) / 60000) * 10) / 10),
    talkShare: cw + iw ? Math.round((cw / (cw + iw)) * 100) : 0,
    medianReplySec: median(replies),
    questionsAsked: cand.filter((t) => t.content.includes("?")).length,
  };

  if (opts.events || opts.submissions) {
    const runs = (opts.events ?? []).filter((e) => e.type === "run");
    const subs = opts.submissions ?? [];
    const accepted = subs.find((s) => s.status === "accepted");
    m.coding = {
      firstRunMin: runs[0] ? minutesSince(start, runs[0].created_at) : null,
      firstSubmitMin: subs[0] ? minutesSince(start, subs[0].created_at) : null,
      acceptedMin: accepted ? minutesSince(start, accepted.created_at) : null,
      runs: runs.length,
      submissions: subs.length,
      runsBeforeAccepted: accepted ? runs.filter((r) => r.created_at < accepted.created_at).length : null,
      languageSwitches: (opts.events ?? []).filter((e) => e.type === "language").length,
    };
  }
  return m;
}

// ───────────── Evidence quotes with timestamps ─────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Finds the candidate message a quote came from and returns its offset from the start of the interview
 * in seconds. `found: false` means the quote isn't in the transcript (it gets discarded); `at: null`
 * means it's real but spans messages, so it has no single timestamp.
 */
export function locateQuote(quote: string, candidateTurns: { content: string; created_at: string }[], startedAt: string): { found: boolean; at: number | null } {
  const q = norm(quote);
  if (q.split(" ").length < 3) return { found: false, at: null };
  const start = new Date(startedAt).getTime();
  for (const t of candidateTurns) {
    if (norm(t.content).includes(q)) return { found: true, at: Math.max(0, Math.round((new Date(t.created_at).getTime() - start) / 1000)) };
  }
  if (norm(candidateTurns.map((t) => t.content).join(" ")).includes(q)) return { found: true, at: null };
  return { found: false, at: null };
}

export const fmtClock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

// ───────────── Annotated code ─────────────

export const NOTE_KINDS = ["bug", "edge_case", "complexity", "style", "good"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export type CodeNote = { line: number; kind: NoteKind; note: string };

/** Prefixes each line with its number so the evaluator can cite lines reliably. */
export const numberLines = (code: string) => code.split("\n").map((l, i) => `${String(i + 1).padStart(3, " ")}| ${l}`).join("\n");

const squash = (s: string) => s.replace(/\s+/g, "");

/**
 * Keeps only annotations whose quoted code really is on (or near) the cited line. The AI must quote the
 * line; if the quote isn't found anywhere, the note is dropped. Line numbers are corrected to the nearest
 * line that actually contains the quote. Returns the survivors (one per line, max 8) and the drop count.
 */
export function validateCodeNotes(code: string, notes: { line: number; quote: string; kind: string; note: string }[]): { notes: CodeNote[]; dropped: number } {
  const lines = code.split("\n").map(squash);
  const out = new Map<number, CodeNote>();
  let dropped = 0;
  for (const n of notes) {
    const q = squash(n.quote ?? "");
    const kind = (NOTE_KINDS as readonly string[]).includes(n.kind) ? (n.kind as NoteKind) : "style";
    if (q.length < 3 || !n.note?.trim()) { dropped++; continue; }
    const hits = lines.map((l, i) => (l.includes(q) ? i + 1 : -1)).filter((i) => i > 0);
    if (!hits.length) { dropped++; continue; }
    const line = hits.reduce((best, i) => (Math.abs(i - n.line) < Math.abs(best - n.line) ? i : best), hits[0]);
    if (out.has(line)) { dropped++; continue; }
    out.set(line, { line, kind, note: n.note.trim().slice(0, 400) });
  }
  const sorted = [...out.values()].sort((a, b) => a.line - b.line);
  return { notes: sorted.slice(0, 8), dropped: dropped + Math.max(0, sorted.length - 8) };
}
