import "server-only";
import { contentId, type ContentMeta, type ContentStatus } from "@/lib/content/types";

/**
 * Design fundamentals scenario questions (the short Q&A some fresher loops use instead of a full design), written
 * for Interview OS. Each has 4–6 key points; the AI may only mark a key point covered by quoting the candidate's
 * own words, which is checked in code, and the score is computed in code. Server-only: key points are the key.
 */
export type KeyPoint = { id: string; point: string };
export type DesignQuestion = { slug: string; version?: number; status?: ContentStatus; q: string; keyPoints: KeyPoint[] };

const k = (id: string, point: string): KeyPoint => ({ id, point });

export const DESIGN_QUESTIONS: DesignQuestion[] = [
  { slug: "slow-product-page", q: "The product page is slow only at peak traffic. What do you check, in order?", keyPoints: [k("metrics", "Look at metrics first: latency percentiles, error rate, saturation per tier"), k("bottleneck", "Find which tier is saturated (app CPU, DB connections, cache hit rate, downstream calls)"), k("db", "Check slow queries / missing indexes / connection pool exhaustion"), k("cache", "Check the cache hit rate and whether hot data is cached"), k("scale", "Scale the saturated tier (more instances, read replicas) as a short-term fix")] },
  { slug: "add-cache", q: "Reads on your API are 50× writes and the database is struggling. How would you add a cache, and what can go wrong?", keyPoints: [k("pattern", "Cache-aside (read cache, on miss read DB and populate)"), k("invalidation", "Invalidate or update the cache on writes"), k("ttl", "Use TTLs so stale data eventually expires"), k("stampede", "Protect against stampedes when hot keys expire"), k("stale", "Accept or handle briefly stale reads")] },
  { slug: "lb-health", q: "One of your five app servers starts returning errors. How should the load balancer and the system react?", keyPoints: [k("health_checks", "Health checks remove the failing server from rotation"), k("stateless", "Stateless servers so other servers can take its traffic"), k("retries", "Retry idempotent requests on another server"), k("alert", "Alert/monitor and replace the instance (auto-healing)")] },
  { slug: "db-write-bottleneck", q: "Your single database can't keep up with writes anymore. What are your options?", keyPoints: [k("vertical", "Scale up the machine as a first, simple step"), k("sharding", "Shard/partition data by a key"), k("shard_key", "Choose a shard key that spreads writes and matches queries"), k("async", "Move non-critical writes to a queue / batch them"), k("replicas_reads", "Note that read replicas help reads, not writes")] },
  { slug: "session-scaling", q: "You add more web servers but users keep getting logged out. Why, and how do you fix it?", keyPoints: [k("local_sessions", "Sessions stored in one server's memory"), k("shared_store", "Move sessions to a shared store (e.g. Redis) or signed tokens"), k("sticky", "Sticky sessions are a workaround with downsides"), k("stateless", "Keep web servers stateless")] },
  { slug: "duplicate-payments", q: "Users report being charged twice when the app retries after a timeout. How do you fix it?", keyPoints: [k("idempotency", "Use an idempotency key per payment attempt"), k("store_key", "Store the key with the result under a unique constraint"), k("return_same", "Return the stored result for repeated requests"), k("unknown_state", "Treat a timeout as unknown and check status instead of re-charging")] },
  { slug: "image-serving", q: "Your app serves user images directly from your API servers and bandwidth costs are exploding. What do you change?", keyPoints: [k("object_storage", "Store images in object storage"), k("cdn", "Serve them through a CDN"), k("signed_urls", "Upload/download directly with signed URLs"), k("sizes", "Generate resized versions/thumbnails"), k("cache_headers", "Set long cache headers with versioned URLs")] },
  { slug: "email-in-request", q: "Signing up takes 4 seconds because the API sends a welcome email synchronously. How do you fix it?", keyPoints: [k("queue", "Put the email job on a queue"), k("worker", "Send from a background worker"), k("retries", "Retry failures with backoff"), k("respond_fast", "Return to the user immediately after the core write")] },
  { slug: "hot-key", q: "One celebrity's profile gets 100× more reads than anyone else and its cache node is overloaded. What do you do?", keyPoints: [k("replicate_key", "Replicate the hot key to several nodes / read replicas"), k("local_cache", "Add a short-lived local (in-process) cache"), k("cdn_edge", "Cache at the edge/CDN if the response is shareable"), k("detect", "Detect hot keys with metrics")] },
  { slug: "read-after-write", q: "A user edits their bio and the page still shows the old one for a few seconds. Why, and how would you fix it?", keyPoints: [k("replica_lag", "Reads go to a replica that lags behind the primary"), k("ryw", "Guarantee read-your-writes: read from the primary for that user briefly"), k("cache_invalidate", "Or a cache wasn't invalidated on write"), k("acceptable", "Decide where eventual consistency is acceptable")] },
  { slug: "api-rate-abuse", q: "One client is sending 10,000 requests a second and hurting everyone else. How do you protect the API?", keyPoints: [k("rate_limit", "Rate limit per client/API key"), k("algorithm", "Use a token bucket or sliding window"), k("shared_counter", "Keep counters in a shared store across servers"), k("429", "Return 429 with retry information"), k("edge", "Block abusive traffic early at the gateway/edge")] },
  { slug: "db-migration", q: "You must add a new NOT NULL column to a table with 500 million rows without downtime. How?", keyPoints: [k("nullable_first", "Add the column as nullable (or with a default) first"), k("backfill", "Backfill in batches"), k("dual_write", "Write the new column from the app before enforcing"), k("enforce_later", "Add the NOT NULL constraint after the backfill"), k("avoid_lock", "Avoid long table locks")] },
  { slug: "search-like", q: "Product search uses SQL LIKE '%term%' and is too slow. What would you use instead?", keyPoints: [k("full_scan", "Leading wildcard forces a full scan; indexes can't help"), k("inverted_index", "Use a search engine with an inverted index (e.g. Elasticsearch)"), k("sync", "Keep it in sync with the database asynchronously"), k("ranking", "Rank results by relevance")] },
  { slug: "realtime-updates", q: "The order-tracking page polls the server every second and the servers are overloaded. What would you change?", keyPoints: [k("push", "Push updates instead of polling"), k("sse_ws", "Use SSE or WebSockets"), k("backoff_poll", "If polling stays, poll less often / long polling"), k("only_changes", "Send only changes")] },
  { slug: "region-failure", q: "Your whole app runs in one cloud region. What happens if that region goes down, and what would you do about it?", keyPoints: [k("outage", "Everything is unavailable"), k("multi_az", "Spread across availability zones first"), k("dr_region", "Keep a standby or active copy in another region"), k("data_replication", "Replicate data across regions (with lag trade-offs)"), k("failover", "Have a tested failover (DNS/traffic switch)")] },
  { slug: "monitoring-basics", q: "You're on call for a new service. What would you monitor and alert on?", keyPoints: [k("golden_signals", "Latency, traffic, errors, saturation"), k("slo", "Alert on user-facing SLO breaches, not every blip"), k("logs_traces", "Structured logs and tracing for debugging"), k("dependencies", "Monitor downstream dependencies")] },
  { slug: "pagination", q: "Your feed API uses ?page=500 and it's slow and sometimes shows duplicates. Why, and what's better?", keyPoints: [k("offset_cost", "Large offsets make the DB skip many rows"), k("shifting", "New items shift pages, causing duplicates/skips"), k("cursor", "Use cursor (keyset) pagination"), k("index", "Back it with an index on the sort key")] },
  { slug: "n-plus-one", q: "The orders page makes 101 database queries to show 100 orders. What's wrong and how do you fix it?", keyPoints: [k("n_plus_one", "It's the N+1 query problem"), k("join_batch", "Use a join or one batched IN query"), k("orm_eager", "Use eager loading in the ORM"), k("measure", "Measure query count/time per request")] },
  { slug: "consistency-choice", q: "Which parts of an e-commerce app need strong consistency, and which can be eventually consistent?", keyPoints: [k("strong_money", "Payments and orders need strong consistency"), k("strong_inventory", "Inventory decrements at checkout must not oversell"), k("eventual_reviews", "Reviews, ratings and recommendations can be eventual"), k("eventual_counts", "View counts and analytics can be eventual")] },
  { slug: "secure-api", q: "What basic security would you put in place for a new public API?", keyPoints: [k("https", "HTTPS everywhere"), k("authn", "Authentication (tokens/OAuth) and authorization checks per resource"), k("validation", "Validate and sanitise input"), k("rate_limit", "Rate limiting and abuse protection"), k("secrets", "Keep secrets out of code; least privilege")] },
];

export const DESIGN_QUESTION_BY_SLUG: Record<string, DesignQuestion> = Object.fromEntries(DESIGN_QUESTIONS.map((x) => [x.slug, x]));
export const designQuestionMeta = (x: DesignQuestion): ContentMeta => ({ id: contentId("design-question", x.slug), version: x.version ?? 1, type: "design-question", tags: ["system-design", "fundamentals"], status: x.status ?? "draft" });

/** Picks `n` questions from the visible pool (random order). */
export function pickDesignQuestions(pool: DesignQuestion[], n = 5): DesignQuestion[] {
  const xs = [...pool];
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs.slice(0, n);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** Keeps only key-point claims whose quote (≥3 words) really appears in that answer. Score is computed here. */
export function verifyKeyPoints(q: DesignQuestion, answer: string, claims: { id: string; quote: string }[]) {
  const a = norm(answer);
  const covered = new Map<string, string>();
  let dropped = 0;
  for (const c of claims) {
    const kp = q.keyPoints.find((x) => x.id === c.id);
    const qt = norm(c.quote);
    if (kp && !covered.has(kp.id) && qt.split(" ").length >= 3 && a.includes(qt)) covered.set(kp.id, c.quote); else dropped++;
  }
  return {
    covered: q.keyPoints.filter((x) => covered.has(x.id)).map((x) => ({ ...x, quote: covered.get(x.id)! })),
    missed: q.keyPoints.filter((x) => !covered.has(x.id)),
    dropped,
  };
}
