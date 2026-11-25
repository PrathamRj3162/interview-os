import { describe, expect, it } from "vitest";
import { createVad, rmsOf } from "@/lib/voice/vad";
import { splitSentences, speakable } from "@/lib/voice/sentences";

/** Feed a sequence of [rms, durationMs] segments in 30 ms frames; collect events with their times. */
function run(vad: ReturnType<typeof createVad>, segments: [number, number][], strict = false) {
  const events: [string, number][] = [];
  let t = 0;
  for (const [rms, ms] of segments) for (let e = 0; e < ms; e += 30) { const ev = vad.push(rms, t, strict); if (ev) events.push([ev, t]); t += 30; }
  return events;
}

describe("VAD", () => {
  it("calibrates to room noise, then detects speech start and end", () => {
    const vad = createVad({ endMs: 900 });
    const ev = run(vad, [[0.005, 900], [0.08, 1500], [0.006, 1500]]);
    expect(ev.map((e) => e[0])).toEqual(["start", "end"]);
    expect(ev[0][1]).toBeGreaterThanOrEqual(900 + 150);   // needs ~160 ms of speech
    expect(ev[1][1] - 2400).toBeGreaterThanOrEqual(870); // ends ~900 ms after speech stops
  });
  it("ignores short clicks and keeps a noisy floor from counting as speech", () => {
    const vad = createVad();
    expect(run(vad, [[0.005, 900], [0.2, 60], [0.005, 900]])).toEqual([]);
    const noisy = createVad();
    expect(run(noisy, [[0.04, 3000]])).toEqual([]); // steady fan noise: floor adapts, no speech
    expect(noisy.floor).toBeGreaterThan(0.03);
  });
  it("short pauses inside an answer don't end it", () => {
    const vad = createVad({ endMs: 1200 });
    const ev = run(vad, [[0.005, 900], [0.08, 600], [0.005, 600], [0.08, 600], [0.005, 1500]]);
    expect(ev.map((e) => e[0])).toEqual(["start", "end"]);
  });
  it("strict mode (interviewer talking) needs louder, longer speech — echo doesn't barge in", () => {
    const vad = createVad();
    run(vad, [[0.005, 900]]);
    expect(run(vad, [[0.03, 250]], true)).toEqual([]);           // quiet echo
    expect(run(vad, [[0.12, 400]], true).map((e) => e[0])).toEqual(["start"]); // real interruption
  });
  it("rmsOf", () => {
    expect(rmsOf(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5);
    expect(rmsOf(new Float32Array(0))).toBe(0);
  });
});

describe("sentence chunking for TTS", () => {
  it("strips markdown and code, keeps abbreviations and decimals together", () => {
    expect(speakable("Use a **hash map**. ```js\nx()\n``` Then `sort` it.")).toBe("Use a hash map. (see the code shown on screen) Then sort it.");
    const parts = splitSentences("Good start. Can you tell me the time complexity, e.g. for n = 3.5 million items? Also, what about space? Take your time.");
    expect(parts.join(" ")).toContain("e.g. for n = 3.5 million items?");
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0]).toMatch(/^Good start\. Can you/); // a tiny first sentence merges with the next
  });
  it("splits long sentences and returns nothing for empty text", () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ") + ".";
    const parts = splitSentences(long, 40, 120);
    expect(parts.every((p) => p.length <= 120)).toBe(true);
    expect(parts.join(" ")).toBe(long);
    expect(splitSentences("   ")).toEqual([]);
  });
  it("reads hints naturally", () => {
    expect(splitSentences("[Hint 2/3] Think about two pointers.")[0]).toBe("Hint: Think about two pointers.");
  });
});
