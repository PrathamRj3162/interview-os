/**
 * System design report facts computed in code (no AI): checklist coverage from VERIFIED evidence, and red flags.
 * The evaluator only proposes which checklist items were covered and cites a quote or a whiteboard element;
 * a claim counts only if that quote is in the candidate's answers or that element is on a board they sent.
 */
import { boardRefs } from "./board";
import { locateQuote } from "./metrics";

export type ChecklistItem = { id: string; item: string; weight: number };
export type CandTurn = { content: string; board?: string | null; created_at: string };
export type VerifiedEvidence = { found: boolean; at: number | null; kind: "quote" | "board" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9:_\-\s]/g, " ").replace(/\s+/g, " ").trim();
const REF = /\b([ne]:[A-Za-z0-9_-]{1,6})\b/g;

/** A quote from the candidate's answers, or a whiteboard element (by id or by its text) they actually drew. */
export function verifyDesignEvidence(evidence: string, turns: CandTurn[], startedAt: string): VerifiedEvidence {
  const q = locateQuote(evidence, turns, startedAt);
  if (q.found) return { ...q, kind: "quote" };
  const boards = turns.map((t) => t.board).filter((b): b is string => Boolean(b));
  if (!boards.length) return { found: false, at: null, kind: "quote" };
  const refs = boardRefs(boards);
  const cited = [...evidence.matchAll(REF)].map((m) => m[1]);
  const start = Date.parse(startedAt);
  const atOf = (pred: (b: string) => boolean) => { const t = turns.find((x) => x.board && pred(x.board)); return t ? Math.max(0, Math.round((Date.parse(t.created_at) - start) / 1000)) : null; };
  if (cited.length && cited.every((r) => refs.has(r))) return { found: true, at: atOf((b) => b.includes(`[${cited[0]}]`)), kind: "board" };
  const e = norm(evidence.replace(REF, ""));
  if (e.split(" ").length >= 2 && boards.some((b) => norm(b).includes(e))) return { found: true, at: atOf((b) => norm(b).includes(e)), kind: "board" };
  return { found: false, at: null, kind: "quote" };
}

export type CoverageItem = ChecklistItem & { covered: boolean; evidence?: string; at?: number | null; kind?: "quote" | "board" };
export type Coverage = { score: number; items: CoverageItem[]; dropped: number };

/** Weighted share of the checklist covered (0–100), counting only items with verified evidence. */
export function scoreCoverage(checklist: ChecklistItem[], claimed: { id: string; evidence: string }[], turns: CandTurn[], startedAt: string): Coverage {
  let dropped = 0;
  const items = checklist.map((c): CoverageItem => {
    for (const cl of claimed.filter((x) => x.id === c.id)) {
      const v = verifyDesignEvidence(cl.evidence, turns, startedAt);
      if (v.found) return { ...c, covered: true, evidence: cl.evidence, at: v.at, kind: v.kind };
      dropped++;
    }
    return { ...c, covered: false };
  });
  const total = checklist.reduce((a, c) => a + c.weight, 0);
  const got = items.filter((i) => i.covered).reduce((a, c) => a + c.weight, 0);
  return { score: total ? Math.round((100 * got) / total) : 0, items, dropped };
}

// ───────────── Red flags (deterministic) ─────────────

export const TECH_TERMS = [
  "redis", "memcached", "kafka", "rabbitmq", "sqs", "kinesis", "pulsar", "cassandra", "dynamodb", "mongodb", "postgres", "postgresql", "mysql",
  "elasticsearch", "s3", "cdn", "zookeeper", "etcd", "hbase", "bigtable", "spanner", "cockroachdb", "kubernetes", "nginx", "load balancer",
  "consistent hashing", "bloom filter", "websocket", "websockets", "grpc", "graphql", "hadoop", "spark", "flink",
];
const NUMBER = /\b\d[\d,.]*\s*(k|m|b|bn|mn|million|billion|thousand|lakh|lakhs|crore|crores|qps|rps|tps|req|reqs|requests|users|gb|tb|mb|pb|kb|ms|%|x|per\s+(second|sec|day|month|minute|hour)|\/\s?s(ec)?|\/day)\b/i;
const QUESTION_OR_SCOPE = /\?|\b(how many|requirements?|should (it|we)|do we need|is it|are we|scope|read[- ]heavy|write[- ]heavy|latency|availability|consistency|assume|assumption)\b/i;
const REASON = /\b(because|since|so that|so we|so it|to avoid|to handle|to reduce|to keep|to absorb|which (gives|lets|allows|means)|trade-?offs?|instead of|rather than|for (low|fast|high|durab|consisten|availab|order|throughput|latency))/i;

const techIn = (text: string) => TECH_TERMS.filter((t) => new RegExp(`\\b${t.replace(" ", "\\s+")}\\b`, "i").test(text));
const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim());

export type RedFlag = { id: "components_before_requirements" | "no_numbers" | "unjustified_tech"; label: string; detail: string };

export function designRedFlags(turns: CandTurn[]): RedFlag[] {
  const flags: RedFlag[] = [];
  if (!turns.length) return flags;
  const nodeCount = (b?: string | null) => (b ? (b.match(/^\[n:/gm) ?? []).length : 0);
  const firstComponents = turns.findIndex((t) => nodeCount(t.board) >= 2 || techIn(t.content).length >= 2);
  const firstScoping = turns.findIndex((t) => QUESTION_OR_SCOPE.test(t.content));
  if (firstComponents >= 0 && (firstScoping < 0 || firstComponents < firstScoping)) {
    flags.push({ id: "components_before_requirements", label: "Components before requirements", detail: "You named or drew components before asking about scope, scale or non-functional needs." });
  }
  if (!turns.some((t) => NUMBER.test(t.content))) {
    flags.push({ id: "no_numbers", label: "No numbers", detail: "No traffic, storage or latency figure was stated at any point, so no choice was sized." });
  }
  const all = turns.map((t) => t.content).join("\n");
  const unjustified = techIn(all).filter((tech) => !sentences(all).some((s) => techIn(s).includes(tech) && REASON.test(s)));
  if (unjustified.length) {
    flags.push({ id: "unjustified_tech", label: "Technology named without a reason", detail: `Named without saying why: ${unjustified.slice(0, 5).join(", ")}.` });
  }
  return flags;
}
