/**
 * The system design (HLD) round's phase machine. Like the DSA round, the SERVER decides the phase: each phase has
 * a time budget (scaled to the interview length) and the interviewer is told to move on when the candidate
 * overruns. The interviewer may also advance early when a phase is genuinely done. Phases only move forward.
 */
export const DESIGN_PHASES = ["requirements", "estimates", "api", "high_level", "deep_dive", "curveball", "wrap"] as const;
export type DesignPhase = (typeof DESIGN_PHASES)[number];

export const DESIGN_PHASE_LABELS: Record<DesignPhase, string> = {
  requirements: "Requirements", estimates: "Estimates", api: "API & data", high_level: "High-level design",
  deep_dive: "Deep dive", curveball: "Curveball", wrap: "Wrap-up",
};

/** Minutes per phase in a 45-minute round (wrap-up takes whatever is left). */
export const DESIGN_BUDGET: Record<Exclude<DesignPhase, "wrap">, number> = { requirements: 5, estimates: 5, api: 5, high_level: 10, deep_dive: 15, curveball: 5 };

export const DESIGN_PHASE_GOALS: Record<DesignPhase, string> = {
  requirements: "Act as the product manager. Let the candidate drive: they should ask about users, core features, scale and non-functional needs. Answer what they ask, briefly. Give numbers (users, traffic, sizes) ONLY when they ask for them. If they jump to components before clarifying, ask what problem they're solving first.",
  estimates: "Ask for back-of-the-envelope estimates: requests per second (average and peak), storage per year, bandwidth. Let them do the maths; question numbers that are off by more than ~10x. Ask which of these numbers will drive a design choice.",
  api: "Ask for the main API (a few endpoints or events with inputs and outputs) and the core data model (entities, keys, which store and why).",
  high_level: "Ask them to draw the high-level design on the whiteboard and walk through one read and one write request end to end. Refer to what is on the whiteboard by name. Ask about any box or arrow whose purpose is unclear.",
  deep_dive: "Pick the one or two components that matter most for this system (e.g. the hottest path, the storage layer, the fan-out, the consistency-critical part) and go deep: data layout, scaling, failure handling, consistency, hot spots. Push for trade-offs: what alternative did they consider and what did they give up.",
  curveball: "Introduce the curveball below as a change in requirements or an incident, and ask how the design must change. Then ask for the main bottleneck left and what they would monitor.",
  wrap: "Close the round: ask if they have any questions, then end politely. Set should_end=true.",
};

export type PhaseWindow = { phase: DesignPhase; start: number; end: number };

/** Time windows (minutes from the start) for each phase, scaled to the round length. */
export function designPlan(durationMin: number): PhaseWindow[] {
  const total = Object.values(DESIGN_BUDGET).reduce((a, b) => a + b, 0); // 45
  const scale = Math.max(0.4, durationMin / total);
  let t = 0;
  const out: PhaseWindow[] = [];
  for (const p of DESIGN_PHASES) {
    if (p === "wrap") { out.push({ phase: p, start: t, end: Math.max(t, durationMin) }); break; }
    const len = DESIGN_BUDGET[p] * scale;
    out.push({ phase: p, start: t, end: t + len });
    t += len;
  }
  return out;
}

export const isDesignPhase = (v: unknown): v is DesignPhase => (DESIGN_PHASES as readonly string[]).includes(v as string);
export const asDesignPhase = (v: unknown): DesignPhase => (isDesignPhase(v) ? v : "requirements");

export type DesignSignals = { current: DesignPhase; elapsedMin: number; durationMin: number; aiAdvance: boolean; candidateTurns: number };
export type DesignStep = { phase: DesignPhase; reason: "time" | "interviewer moved on" | "time almost up" | null; overrun: boolean; phaseMinutesLeft: number };

/** Deterministic transition. Time pushes forward (possibly several phases); the interviewer may advance one step early. */
export function nextDesignPhase(s: DesignSignals): DesignStep {
  const plan = designPlan(s.durationMin);
  const idx = (p: DesignPhase) => DESIGN_PHASES.indexOf(p);
  const left = (p: DesignPhase) => Math.max(0, plan[idx(p)].end - s.elapsedMin);
  if (s.current === "wrap") return { phase: "wrap", reason: null, overrun: false, phaseMinutesLeft: left("wrap") };
  if (s.durationMin - s.elapsedMin <= 2) return { phase: "wrap", reason: "time almost up", overrun: false, phaseMinutesLeft: left("wrap") };
  const scheduled = plan.find((w) => s.elapsedMin >= w.start && s.elapsedMin < w.end)?.phase ?? "wrap";
  if (idx(scheduled) > idx(s.current)) return { phase: scheduled, reason: "time", overrun: true, phaseMinutesLeft: left(scheduled) };
  if (s.aiAdvance && s.candidateTurns > 0) {
    const next = DESIGN_PHASES[idx(s.current) + 1];
    return { phase: next, reason: "interviewer moved on", overrun: false, phaseMinutesLeft: left(next) };
  }
  return { phase: s.current, reason: null, overrun: false, phaseMinutesLeft: left(s.current) };
}

/** Generic curveballs used when a case has none of its own. */
export const DEFAULT_CURVEBALLS = [
  "Traffic just grew 10x overnight after a marketing campaign. What breaks first, and what do you change?",
  "One of your two regions (or data centres) goes down for an hour. What happens to users, and what do you change?",
  "One key or user now gets about 40% of all reads (a celebrity or a viral item). What happens, and how do you handle it?",
];

/** Deterministic pick so a round always gets the same curveball (and the report can name it). */
export function pickCurveball(seed: string, options: readonly string[] = DEFAULT_CURVEBALLS): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return options[(h >>> 0) % options.length];
}
