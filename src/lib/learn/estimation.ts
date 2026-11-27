/**
 * Back-of-the-envelope estimation trainer: generated drills (no AI), graded in code with a tolerance, with worked
 * steps. Pure functions so the same seed always gives the same drill (and CI can check every template).
 */
import { makeRng } from "@/lib/dsa/rng";
import { contentId, type ContentMeta } from "@/lib/content/types";

export const ESTIMATION_META: ContentMeta = { id: contentId("estimation-drill", "templates"), version: 1, type: "estimation-drill", tags: ["system-design"], status: "draft" };

type Template = { product: string; write: string; read: string; size: [number, number]; sizeLabel: string; dau: [number, number]; writes: [number, number]; reads: [number, number] };

const TEMPLATES: Template[] = [
  { product: "a photo-sharing app", write: "upload photos", read: "view photos in their feed", size: [200_000, 3_000_000], sizeLabel: "photo", dau: [5e6, 2e8], writes: [0.2, 2], reads: [20, 200] },
  { product: "a URL shortener", write: "create short links", read: "follow short links", size: [300, 1_000], sizeLabel: "link record", dau: [1e6, 1e8], writes: [0.05, 1], reads: [2, 30] },
  { product: "a chat app", write: "send messages", read: "receive messages", size: [100, 1_000], sizeLabel: "message", dau: [1e7, 5e8], writes: [10, 80], reads: [20, 200] },
  { product: "a food delivery app", write: "place orders", read: "check order tracking updates", size: [1_000, 5_000], sizeLabel: "order record", dau: [1e6, 3e7], writes: [0.1, 1], reads: [10, 60] },
  { product: "a video platform", write: "upload videos", read: "watch videos", size: [50_000_000, 500_000_000], sizeLabel: "video (all renditions)", dau: [1e6, 5e7], writes: [0.001, 0.02], reads: [3, 20] },
  { product: "a ride-hailing app", write: "send a location update (drivers only, about 1 in 10 users)", read: "see nearby cars", size: [50, 200], sizeLabel: "location update", dau: [1e6, 2e7], writes: [100, 2_000], reads: [5, 40] },
  { product: "a news feed", write: "publish posts", read: "load their feed", size: [500, 5_000], sizeLabel: "post", dau: [1e7, 3e8], writes: [0.1, 3], reads: [5, 50] },
  { product: "a payments app", write: "make payments", read: "check payment history", size: [500, 2_000], sizeLabel: "ledger entry", dau: [5e6, 2e8], writes: [0.5, 4], reads: [1, 10] },
];

export type DrillAnswerKey = "writeQps" | "readQps" | "peakReadQps" | "storageTbYear" | "egressMBs";
export type Drill = {
  seed: number; product: string; story: string; peakFactor: number;
  given: { dau: number; writesPerUser: number; readsPerUser: number; sizeBytes: number; sizeLabel: string };
  questions: { key: DrillAnswerKey; label: string; unit: string }[];
  answers: Record<DrillAnswerKey, number>;
  steps: Record<DrillAnswerKey, string>;
};

const round = (x: number, sig = 2) => { if (x === 0) return 0; const p = Math.pow(10, sig - 1 - Math.floor(Math.log10(Math.abs(x)))); return Math.round(x * p) / p; };
export const fmtNum = (x: number) => {
  const a = Math.abs(x);
  if (a >= 1e9) return `${round(x / 1e9)}B`; if (a >= 1e6) return `${round(x / 1e6)}M`; if (a >= 1e3) return `${round(x / 1e3)}k`;
  return String(round(x));
};
const fmtBytes = (b: number) => (b >= 1e9 ? `${round(b / 1e9)} GB` : b >= 1e6 ? `${round(b / 1e6)} MB` : b >= 1e3 ? `${round(b / 1e3)} KB` : `${round(b)} bytes`);
const nice = (x: number) => round(x, 1);

export function makeDrill(seed: number): Drill {
  const r = makeRng(seed);
  const t = TEMPLATES[r.int(0, TEMPLATES.length - 1)];
  const logPick = ([lo, hi]: [number, number]) => nice(Math.exp(Math.log(lo) + r.next() * (Math.log(hi) - Math.log(lo))));
  const dau = logPick(t.dau), writesPerUser = logPick(t.writes), readsPerUser = logPick(t.reads), sizeBytes = logPick(t.size);
  const peakFactor = r.pick([2, 3, 5]);
  const writesDay = dau * writesPerUser, readsDay = dau * readsPerUser;
  const answers: Record<DrillAnswerKey, number> = {
    writeQps: writesDay / 86_400,
    readQps: readsDay / 86_400,
    peakReadQps: (readsDay / 86_400) * peakFactor,
    storageTbYear: (writesDay * sizeBytes * 365) / 1e12,
    egressMBs: ((readsDay / 86_400) * sizeBytes) / 1e6,
  };
  const steps: Record<DrillAnswerKey, string> = {
    writeQps: `${fmtNum(dau)} users × ${writesPerUser} writes = ${fmtNum(writesDay)} writes/day; ÷ 86,400 s ≈ ${fmtNum(answers.writeQps)} writes/s (tip: ÷ 100k is close enough).`,
    readQps: `${fmtNum(dau)} × ${readsPerUser} reads = ${fmtNum(readsDay)} reads/day; ÷ 86,400 ≈ ${fmtNum(answers.readQps)} reads/s.`,
    peakReadQps: `Average ${fmtNum(answers.readQps)} reads/s × peak factor ${peakFactor} ≈ ${fmtNum(answers.peakReadQps)} reads/s.`,
    storageTbYear: `${fmtNum(writesDay)} writes/day × ${fmtBytes(sizeBytes)} × 365 ≈ ${fmtNum(answers.storageTbYear)} TB/year (before replication; ×3 with 3 replicas).`,
    egressMBs: `${fmtNum(answers.readQps)} reads/s × ${fmtBytes(sizeBytes)} ≈ ${fmtNum(answers.egressMBs)} MB/s on average (assuming each read returns one full ${t.sizeLabel}).`,
  };
  return {
    seed, product: t.product, peakFactor,
    story: `You're designing ${t.product}. It has ${fmtNum(dau)} daily active users. Each user ${t.write} about ${writesPerUser} times a day and ${t.read} about ${readsPerUser} times a day. A ${t.sizeLabel} is about ${fmtBytes(sizeBytes)}. Peak traffic is ${peakFactor}× the average.`,
    given: { dau, writesPerUser, readsPerUser, sizeBytes, sizeLabel: t.sizeLabel },
    questions: [
      { key: "writeQps", label: "Average writes per second", unit: "writes/s" },
      { key: "readQps", label: "Average reads per second", unit: "reads/s" },
      { key: "peakReadQps", label: "Peak reads per second", unit: "reads/s" },
      { key: "storageTbYear", label: "New storage per year", unit: "TB/year" },
      { key: "egressMBs", label: "Average read bandwidth", unit: "MB/s" },
    ],
    answers, steps,
  };
}

/** Parses "4k", "4,000", "4e3", "2.5M", "0.3" → number; null if unreadable. */
export function parseEstimate(raw: string): number | null {
  const m = /^\s*([0-9]*\.?[0-9]+(?:e[+-]?\d+)?)\s*([kmbt])?\s*$/i.exec(raw.replace(/,/g, "").replace(/_/g, ""));
  if (!m) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[(m[2] ?? "").toLowerCase() as "k" | "m" | "b" | "t"] ?? 1;
  const v = Number(m[1]) * mult;
  return Number.isFinite(v) ? v : null;
}

export type Grade = "good" | "close" | "off";
/** Within 25% = good (that's what an interviewer expects); within 3× = close (right order of magnitude); else off. */
export function gradeEstimate(answer: number, truth: number): Grade {
  if (!(answer > 0) || !(truth > 0)) return "off";
  const ratio = Math.max(answer / truth, truth / answer);
  return ratio <= 1.25 ? "good" : ratio <= 3 ? "close" : "off";
}

export const REFERENCE_CARD = {
  latency: [
    ["L1 cache reference", "~1 ns"], ["Main memory reference", "~100 ns"], ["Compress 1 KB (fast codec)", "~2 µs"],
    ["Read 1 MB sequentially from memory", "~10 µs"], ["SSD random read", "~100 µs"], ["Round trip within a data centre", "~0.5 ms"],
    ["Read 1 MB sequentially from SSD", "~1 ms"], ["Disk seek (HDD)", "~10 ms"], ["Round trip Mumbai ↔ US East", "~200 ms"],
  ],
  powers: [["2¹⁰", "≈ 1 thousand (KB)"], ["2²⁰", "≈ 1 million (MB)"], ["2³⁰", "≈ 1 billion (GB)"], ["2⁴⁰", "≈ 1 trillion (TB)"]],
  rules: ["1 day ≈ 86,400 s ≈ 10⁵ s", "1M requests/day ≈ 12 requests/s", "1 year ≈ 3.15 × 10⁷ s", "Peak is often 2–5× average", "Plan storage with replication (×3) and headroom"],
} as const;
