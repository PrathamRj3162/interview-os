/**
 * Energy-based voice activity detection (no model, no download). Feed it the RMS level of each short
 * audio frame; it tracks the room's noise floor and reports when speech starts and ends.
 *
 * - Noise floor: a slow-moving estimate that follows quiet frames quickly and loud frames very slowly.
 * - Speech starts after `startMs` of frames above max(minLevel, floor × startRatio).
 * - Speech ends after `endMs` of frames below max(minLevel × 0.7, floor × endRatio) (hysteresis).
 * - `strict` (used while the interviewer is talking) raises the bar so speaker echo doesn't count as barge-in.
 */
export type VadOptions = { startMs?: number; endMs?: number; startRatio?: number; endRatio?: number; minLevel?: number };
export type VadEvent = "start" | "end" | null;

export function createVad(opts: VadOptions = {}) {
  const o = { startMs: 160, endMs: 1200, startRatio: 3, endRatio: 2, minLevel: 0.012, ...opts };
  let floor = 0.01;
  let speaking = false;
  let aboveSince: number | null = null;
  let belowSince: number | null = null;
  let frames = 0;

  return {
    get floor() { return floor; },
    get speaking() { return speaking; },
    setEndMs(ms: number) { o.endMs = ms; },
    reset() { speaking = false; aboveSince = belowSince = null; },
    /** Push one frame's RMS (0–1) at time `t` (ms). Returns "start"/"end" on transitions. */
    push(rms: number, t: number, strict = false): VadEvent {
      frames++;
      // Calibrate fast during the first ~0.5 s, then adapt slowly (faster downwards than upwards).
      const k = frames < 15 ? 0.3 : rms < floor ? 0.05 : speaking ? 0.0005 : 0.004;
      floor = Math.max(0.002, floor + (rms - floor) * k);
      const startLevel = Math.max(o.minLevel * (strict ? 2.5 : 1), floor * (strict ? o.startRatio * 2 : o.startRatio));
      const endLevel = Math.max(o.minLevel * 0.7, floor * o.endRatio);
      if (!speaking) {
        if (rms >= startLevel) {
          aboveSince ??= t;
          if (t - aboveSince >= (strict ? o.startMs * 2 : o.startMs)) { speaking = true; belowSince = null; return "start"; }
        } else aboveSince = null;
      } else if (rms < endLevel) {
        belowSince ??= t;
        if (t - belowSince >= o.endMs) { speaking = false; aboveSince = null; return "end"; }
      } else belowSince = null;
      return null;
    },
  };
}

/** Root-mean-square of a time-domain frame (Float32 samples in −1..1). */
export function rmsOf(frame: Float32Array): number {
  let s = 0;
  for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
  return Math.sqrt(s / Math.max(1, frame.length));
}
