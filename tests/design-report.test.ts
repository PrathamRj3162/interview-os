import { describe, expect, it } from "vitest";
import { verifyDesignEvidence, scoreCoverage, designRedFlags, type CandTurn } from "@/lib/interview/design-report";

const T0 = "2026-01-01T10:00:00Z";
const at = (min: number) => new Date(Date.parse(T0) + min * 60_000).toISOString();
const BOARD = "Nodes:\n[n:lb0001] Load balancer\n[n:api001] API servers\n[n:red001] Redis cache\nEdges:\n[e:ar0001] API servers -> Redis cache (cache-aside)";
const turns: CandTurn[] = [
  { content: "How many users do we expect, and is it read heavy?", created_at: at(1) },
  { content: "About 100M new links a month, so roughly 40 writes per second and 4000 reads per second.", created_at: at(6) },
  { content: "Reads go to Redis first because most lookups hit a small set of hot links.", board: BOARD, created_at: at(18) },
];

describe("design evidence verification", () => {
  it("accepts exact quotes, element ids and element text on a board the candidate sent", () => {
    expect(verifyDesignEvidence("roughly 40 writes per second", turns, T0)).toMatchObject({ found: true, kind: "quote", at: 360 });
    expect(verifyDesignEvidence("[n:red001] Redis cache", turns, T0)).toMatchObject({ found: true, kind: "board", at: 1080 });
    expect(verifyDesignEvidence("e:ar0001", turns, T0)).toMatchObject({ found: true, kind: "board" });
    expect(verifyDesignEvidence("API servers -> Redis cache", turns, T0)).toMatchObject({ found: true, kind: "board" });
  });
  it("rejects invented quotes and element ids that were never drawn", () => {
    expect(verifyDesignEvidence("we shard by user id across 64 nodes", turns, T0).found).toBe(false);
    expect(verifyDesignEvidence("[n:zzz999] Kafka", turns, T0).found).toBe(false);
  });
});

describe("coverage score", () => {
  const checklist = [
    { id: "scale", item: "States read/write traffic", weight: 2 },
    { id: "cache", item: "Caches hot reads", weight: 2 },
    { id: "keys", item: "Collision-free key generation", weight: 1 },
  ];
  it("weights only verified items; unverified claims are dropped", () => {
    const c = scoreCoverage(checklist, [
      { id: "scale", evidence: "40 writes per second and 4000 reads per second" },
      { id: "cache", evidence: "[n:red001] Redis cache" },
      { id: "keys", evidence: "we pre-allocate key ranges per server" }, // never said
    ], turns, T0);
    expect(c.score).toBe(80); // (2 + 2) / 5
    expect(c.items.map((i) => i.covered)).toEqual([true, true, false]);
    expect(c.dropped).toBe(1);
  });
  it("nothing claimed → 0; empty checklist → 0", () => {
    expect(scoreCoverage(checklist, [], turns, T0).score).toBe(0);
    expect(scoreCoverage([], [], turns, T0).score).toBe(0);
  });
});

describe("design red flags", () => {
  it("a clean, scoped, sized, justified answer has none", () => {
    expect(designRedFlags(turns)).toEqual([]);
  });
  it("components before any scoping question", () => {
    const f = designRedFlags([{ content: "I'd use Kafka and Cassandra with a load balancer.", created_at: at(1) }, { content: "What scale do we need?", created_at: at(3) }]);
    expect(f.map((x) => x.id)).toContain("components_before_requirements");
  });
  it("drawing two boxes first also counts as jumping to components", () => {
    const f = designRedFlags([{ content: "Here's my plan.", board: "Nodes:\n[n:a00001] A\n[n:b00001] B", created_at: at(1) }, { content: "How many users?", created_at: at(2) }]);
    expect(f.map((x) => x.id)).toContain("components_before_requirements");
  });
  it("no numbers anywhere", () => {
    expect(designRedFlags([{ content: "How many users? It should be fast and reliable.", created_at: at(1) }]).map((x) => x.id)).toEqual(["no_numbers"]);
  });
  it("technology named without a reason lists the offenders", () => {
    const f = designRedFlags([{ content: "Is it read heavy? 10k QPS. We use Redis because reads dominate. Also Kafka and Cassandra.", created_at: at(1) }]);
    expect(f).toEqual([expect.objectContaining({ id: "unjustified_tech", detail: "Named without saying why: kafka, cassandra." })]);
  });
});
