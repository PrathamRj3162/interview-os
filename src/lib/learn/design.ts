/**
 * System design lab — case studies written for Interview OS. A reference answer, not the only answer:
 * interviewers care about the reasoning and trade-offs. Each case links to a focused practice round.
 */
import { contentId, type ContentMeta, type ContentStatus } from "@/lib/content/types";
import type { ChecklistItem } from "@/lib/interview/design-report";
import { CASE_EXTRAS } from "./design-extras";
import { NEW_CASES } from "./design-cases-2";
import { LLD_CASES } from "./lld-cases";

export type DesignCase = {
  slug: string;
  /** Content version (bump on edits so the change is reviewed again) and shipped status; defaults: 1 / live. */
  version?: number;
  status?: ContentStatus;
  title: string;
  kind: "hld" | "lld";
  level: "Starter" | "Intermediate" | "Advanced";
  prompt: string;
  functional: string[];
  nonFunctional: string[];
  estimates?: string[];
  api: string[];
  data: string[];
  components: string[];
  deepDives: string[];
  tradeoffs: string[];
  followUps: string[];
  /** Scheduled curveballs for the live round (one is picked per interview). */
  curveballs?: string[];
  /** Weighted must-cover checklist for the live round's coverage score (HLD). */
  checklist?: ChecklistItem[];
  /** What the round looks like at each level. */
  variants?: { sde1: string; sde2: string };
  /** Common mistakes, revealed with the reference answer. */
  mistakes?: string[];
  /** LLD cases that also exist as a machine coding problem (same statement, 90-minute build). */
  mc?: string;
};

export const HLD_FRAMEWORK = [
  "Clarify functional requirements (what must it do?) and non-functional ones (scale, latency, availability, consistency).",
  "Estimate: users, requests per second (read vs write), storage per year, bandwidth — round numbers are fine.",
  "Define the API (a few endpoints or events) and the core data model.",
  "Draw the high-level design: clients → load balancer → services → storage/caches/queues.",
  "Deep-dive the hardest 1–2 parts: hot keys, fan-out, consistency, failure handling.",
  "Discuss trade-offs and what you'd do at 10× scale; mention monitoring.",
];
export const LLD_FRAMEWORK = [
  "Clarify use cases and scope; list actors.",
  "Identify entities and their responsibilities; choose relationships (has-a vs is-a).",
  "Define interfaces and key methods; keep classes small (SRP).",
  "Apply patterns only where they help (Strategy, Factory, Observer, State).",
  "Walk through one or two flows end to end; handle concurrency where it matters.",
  "Show how the design extends to a new requirement without rewrites.",
];

const BASE_CASES: DesignCase[] = [
  {
    slug: "url-shortener", title: "URL shortener", kind: "hld", level: "Starter",
    prompt: "Design a service that turns long URLs into short links and redirects visitors.",
    functional: ["Create a short link (optionally a custom alias and expiry)", "Redirect short → long quickly", "Basic click counts"],
    nonFunctional: ["Very read-heavy (≈100:1)", "Redirect p99 < 50 ms", "High availability; links must never collide"],
    estimates: ["100M new links/month ≈ 40 writes/s; 4,000 reads/s average, more at peak", "500 bytes per record → ~600 GB over 10 years", "7-character base62 keys give 62⁷ ≈ 3.5 trillion combinations"],
    api: ["POST /links {url, alias?, expiresAt?} → {code}", "GET /{code} → 301/302 redirect", "GET /links/{code}/stats"],
    data: ["links(code PK, long_url, owner_id, created_at, expires_at)", "Click events go to a log/queue, aggregated later"],
    components: ["Stateless API servers behind a load balancer", "Key generation: pre-generated key ranges per server (or counter + base62) to avoid collisions", "Key-value store or sharded SQL keyed by code", "Cache (e.g. Redis) for hot codes; CDN/edge for the most popular", "Async analytics pipeline (queue → aggregator)"],
    deepDives: ["Why hashing the URL alone risks collisions and how ranges avoid coordination", "301 (cacheable, fewer hits) vs 302 (accurate analytics)", "Expiry: lazy delete on read plus a background sweeper"],
    tradeoffs: ["Counter-based keys are guessable; add randomness if links must be private", "Strong consistency only on create; reads can be eventually consistent"],
    followUps: ["How do you stop abuse (spam, malware links)?", "What happens if a cache node dies?", "How would you support custom domains?"],
    checklist: [
      { id: "read_heavy", item: "Identifies the read-heavy ratio and a latency target for redirects", weight: 2 },
      { id: "estimates", item: "Sizes writes/s, reads/s and storage from stated numbers", weight: 2 },
      { id: "key_gen", item: "Collision-free short-key generation (ranges, counter + base62, or checked hashing)", weight: 3 },
      { id: "data_model", item: "Key-value data model keyed by the short code", weight: 1 },
      { id: "cache", item: "Caches hot codes in front of the store (and says what happens on a miss)", weight: 3 },
      { id: "redirect_code", item: "Chooses 301 vs 302 with the analytics trade-off", weight: 1 },
      { id: "async_analytics", item: "Records clicks asynchronously so redirects stay fast", weight: 2 },
      { id: "expiry", item: "Handles expiry (lazy check on read and/or background cleanup)", weight: 1 },
      { id: "abuse", item: "Mentions abuse controls (rate limits, malicious-link checks)", weight: 1 },
    ],
    curveballs: [
      "A single link goes viral and now gets about 40% of all redirects. What happens, and how do you handle it?",
      "Marketing wants custom aliases for every enterprise customer, and alias collisions must be impossible. What changes?",
      "Your cache cluster loses half its nodes during peak traffic. What happens to redirect latency, and what do you change?",
    ],
  },
  {
    slug: "rate-limiter", title: "Rate limiter", kind: "hld", level: "Starter",
    prompt: "Design a rate limiter that protects an API (e.g. 100 requests per minute per user).",
    functional: ["Limit by user, API key or IP", "Different rules per endpoint", "Return 429 with retry information"],
    nonFunctional: ["Adds < 5 ms latency", "Works across many API servers", "Fails open or closed by policy"],
    estimates: ["1M active users, 50k req/s peak → one counter update per request", "Counters are tiny; memory is a few hundred MB"],
    api: ["Middleware: allow(key, rule) → {allowed, remaining, resetAt}", "Rules config: {endpoint, limit, window, key}"],
    data: ["In Redis: per-key counters or token buckets with TTLs", "Rules in a config store, cached in each server"],
    components: ["Limiter middleware in the API gateway", "Central fast store (Redis cluster) with atomic operations (Lua/INCR)", "Rules service + local cache", "Metrics for rejections"],
    deepDives: ["Algorithms: fixed window (simple, bursty at edges), sliding log (exact, memory-heavy), sliding window counter (good balance), token bucket (allows controlled bursts)", "Atomicity: race between read and increment — use INCR/EXPIRE or a script", "Local pre-limits to reduce Redis load"],
    tradeoffs: ["Exactness vs cost: approximate sliding windows are usually enough", "Fail open keeps the product up but drops protection"],
    followUps: ["How would you limit across regions?", "How do you tell clients when to retry?", "How do you avoid hot keys for one heavy tenant?"],
  },
  {
    slug: "chat", title: "Chat / messaging app", kind: "hld", level: "Intermediate",
    prompt: "Design a 1:1 and small-group chat service with online presence and delivery receipts.",
    functional: ["Send and receive messages in real time", "Message history across devices", "Sent/delivered/read receipts", "Online/last-seen presence"],
    nonFunctional: ["Low latency (< 200 ms)", "Messages never lost; order preserved per conversation", "Hundreds of millions of connections"],
    estimates: ["50M daily users × 40 messages ≈ 2B messages/day ≈ 23k/s average", "100 bytes per message → ~200 GB/day before replication"],
    api: ["WebSocket: send {convId, clientMsgId, body}; server acks with serverMsgId", "GET /conversations/{id}/messages?before=", "Events: message, receipt, presence"],
    data: ["messages partitioned by conversation_id, ordered by a per-conversation sequence", "conversations, participants; user → devices"],
    components: ["Gateway servers holding WebSocket connections; a registry of user → gateway", "Chat service assigns sequence numbers and persists", "Wide-column/NoSQL store for messages (write-heavy, range reads)", "Queue for fan-out to other participants' gateways; push notifications for offline users", "Presence service with heartbeats and TTLs"],
    deepDives: ["Idempotency with clientMsgId so retries don't duplicate", "Ordering: per-conversation sequence rather than global clocks", "Offline delivery: store-and-forward plus sync on reconnect"],
    tradeoffs: ["End-to-end encryption limits server-side search", "Presence accuracy vs heartbeat cost"],
    followUps: ["How do group chats with 1,000 members change fan-out?", "How do you sync history to a new device?", "What happens when a gateway crashes?"],
  },
  {
    slug: "news-feed", title: "News feed", kind: "hld", level: "Intermediate",
    prompt: "Design a social news feed: users follow others and see a ranked feed of recent posts.",
    functional: ["Create posts", "Follow/unfollow", "Home feed with pagination"],
    nonFunctional: ["Feed loads in < 300 ms", "Eventual consistency is fine", "Celebrities with millions of followers"],
    estimates: ["200M daily users, 2 posts/day each ≈ 4.6k posts/s; feed reads ≈ 100k/s"],
    api: ["POST /posts", "POST /follow/{userId}", "GET /feed?cursor="],
    data: ["posts(id, author, created_at, body, media refs)", "follows(follower, followee)", "Precomputed feed lists per user (post ids) in a cache"],
    components: ["Post service + object storage/CDN for media", "Fan-out service: on write, push post ids into followers' feed caches", "Feed service merges precomputed lists with celebrity posts pulled at read time", "Ranking step (recency + simple signals)"],
    deepDives: ["Push (fan-out on write) vs pull (fan-out on read) and the hybrid for celebrities", "Cursor pagination over a changing feed", "Backfilling a feed for a new follow"],
    tradeoffs: ["Push wastes work for inactive users; pull is slow for heavy readers", "Ranking quality vs latency budget"],
    followUps: ["How do you remove a deleted post from millions of feeds?", "How would you add ads?", "How do you keep the feed fresh in real time?"],
  },
  {
    slug: "notifications", title: "Notification service", kind: "hld", level: "Intermediate",
    prompt: "Design a service other teams use to send push, email and SMS notifications.",
    functional: ["Send to a user across channels", "Templates and user preferences (opt-outs, quiet hours)", "Scheduling and retries"],
    nonFunctional: ["At-least-once delivery without spamming duplicates", "Spiky load (campaigns)", "Respect provider rate limits"],
    estimates: ["10M notifications/day normally, 50M in a campaign hour ≈ 14k/s peak"],
    api: ["POST /notify {userId, templateId, data, channels?, idempotencyKey}", "GET /notifications/{id}/status"],
    data: ["templates, user preferences, delivery log (status per channel)"],
    components: ["API validates, checks preferences, writes to a queue", "Per-channel workers with provider adapters (APNs/FCM, email, SMS)", "Rate limiting per provider; retry with backoff; dead-letter queue", "Deduplication by idempotency key"],
    deepDives: ["Exactly-once is impractical; dedupe at the edge", "Prioritised queues so OTPs aren't stuck behind marketing", "Quiet hours and time zones"],
    tradeoffs: ["Batching saves cost but adds latency", "Storing every delivery event vs aggregated stats"],
    followUps: ["How do you handle a provider outage?", "How do you track opens and clicks?", "How would you A/B test templates?"],
  },
  {
    slug: "file-storage", title: "File storage & sync", kind: "hld", level: "Advanced",
    prompt: "Design a cloud drive that stores files and keeps them in sync across a user's devices.",
    functional: ["Upload/download large files", "Sync changes across devices", "Share with others", "Version history"],
    nonFunctional: ["Durability above all", "Efficient for large files and slow networks", "Conflicts handled predictably"],
    estimates: ["50M users × 10 GB ≈ 500 PB logical; deduplication helps"],
    api: ["POST /uploads (get chunk URLs)", "PUT chunk to object storage", "POST /files/commit {chunks}", "GET /changes?cursor="],
    data: ["files(id, owner, path, version, chunk list)", "chunks(hash, size, location) — content-addressed", "change log per user for sync"],
    components: ["Client splits files into chunks (e.g. 4 MB), hashes them, uploads only missing chunks", "Object storage (replicated/erasure-coded) for chunks", "Metadata service (strongly consistent DB)", "Notification channel so devices pull changes"],
    deepDives: ["Chunking + hashing for resumable uploads and dedupe", "Conflict resolution: keep both copies with a clear name", "Garbage collecting unreferenced chunks safely"],
    tradeoffs: ["Smaller chunks dedupe better but add metadata", "Strong metadata consistency vs global latency"],
    followUps: ["How do you share a folder with 1,000 people?", "How would you add search inside documents?", "How do you handle a 50 GB file?"],
  },
  {
    slug: "ride-matching", title: "Ride-hailing matching", kind: "hld", level: "Advanced",
    prompt: "Design the part of a ride-hailing app that tracks drivers and matches riders to nearby drivers.",
    functional: ["Drivers send location every few seconds", "Rider requests a ride and gets a nearby driver", "Live trip tracking"],
    nonFunctional: ["Match within seconds", "Location writes are very high volume", "A driver is never double-booked"],
    estimates: ["1M active drivers × update every 4 s = 250k writes/s"],
    api: ["Driver stream: location {lat, lng, ts}", "POST /rides {pickup, drop}", "Rider stream: ride status"],
    data: ["In-memory geospatial index (geohash/H3 cells → drivers)", "rides(id, rider, driver, state, …) in a durable DB"],
    components: ["Location ingest service updating an in-memory geo index (sharded by region/cell)", "Matching service: search nearby cells, rank by ETA, offer to a driver with a timeout", "Trip service with a state machine", "Pub/sub for live updates"],
    deepDives: ["Geohash/H3 cells and searching neighbouring cells", "Locking a driver during an offer (lease with TTL) to avoid double booking", "Hot regions at peak times"],
    tradeoffs: ["Nearest driver vs best overall assignment", "Keeping locations only in memory (fast, lossy) vs persisting them"],
    followUps: ["How would you add surge pricing?", "How do you handle a driver going offline mid-offer?", "How do you shard by geography?"],
  },
  {
    slug: "kv-cache", title: "Distributed cache", kind: "hld", level: "Advanced",
    prompt: "Design a distributed in-memory cache (like a simplified Redis cluster) used by many services.",
    functional: ["get/set/delete with TTL", "Scale out by adding nodes", "Survive node failures"],
    nonFunctional: ["Sub-millisecond reads", "Even load across nodes", "Minimal data movement when the cluster changes"],
    estimates: ["1M ops/s, 2 TB of hot data → ~20 nodes with 128 GB each plus replicas"],
    api: ["GET key", "SET key value ttl", "DEL key"],
    data: ["Key → value with expiry; per-node LRU/LFU eviction"],
    components: ["Consistent hashing with virtual nodes to map keys to nodes", "Client library or proxy that knows the ring", "Primary-replica per shard; failover via health checks", "Eviction policy and memory limits"],
    deepDives: ["Why consistent hashing moves only ~1/N keys on resize", "Hot keys: replication of hot keys, client-side caching", "Cache stampede: request coalescing, jittered TTLs"],
    tradeoffs: ["Write-through vs write-back vs cache-aside", "Replication improves availability but risks stale reads"],
    followUps: ["How do you keep the cache consistent with the database?", "What happens during a network partition?", "How would you warm a new node?"],
  },
  {
    slug: "parking-lot", title: "Parking lot", kind: "lld", level: "Starter",
    prompt: "Design the classes for a multi-floor parking lot with different spot sizes, tickets and payment.",
    functional: ["Park and unpark vehicles of different sizes", "Issue tickets; compute fees by duration", "Show free spots per floor"],
    nonFunctional: ["Easy to add new vehicle types or pricing rules", "Safe under concurrent entries"],
    api: ["ParkingLot.park(vehicle) → Ticket", "ParkingLot.unpark(ticket) → Receipt", "Floor.freeSpots(type)"],
    data: ["Vehicle (Bike, Car, Truck) with size", "Spot (size, occupied)", "Ticket (id, spot, entry time)", "Payment"],
    components: ["ParkingLot → Floors → Spots (composition)", "SpotAllocationStrategy (nearest, by floor) — Strategy pattern", "PricingStrategy per vehicle type/time — Strategy", "EntryGate/ExitGate using the lot; synchronized spot assignment"],
    deepDives: ["Fitting a car into a larger spot when exact sizes are full", "Avoiding two gates assigning the same spot (lock per floor or atomic claim)"],
    tradeoffs: ["Inheritance for vehicles vs a size enum", "Global lock (simple) vs fine-grained locks (scales)"],
    followUps: ["Add electric charging spots", "Add monthly passes", "Support reservations"],
  },
  {
    slug: "expense-splitter", title: "Expense splitter", kind: "lld", level: "Intermediate",
    prompt: "Design an app where groups record shared expenses and see who owes whom (a Splitwise-style app).",
    functional: ["Add expenses split equally, by exact amounts or by percentage", "Show balances per person", "Simplify debts", "Record settlements"],
    nonFunctional: ["Money is exact (no floating point)", "New split types are easy to add"],
    api: ["Group.addExpense(paidBy, amount, split)", "Group.balances()", "Group.simplify() → transfers"],
    data: ["User, Group, Expense(paidBy, amount, splits)", "Split (EqualSplit, ExactSplit, PercentSplit)", "Balance ledger: net amount per user"],
    components: ["Split types behind an interface with validate() — Strategy/polymorphism", "Ledger keeps net balances; expenses are immutable records", "Debt simplification: greedy match of largest creditor with largest debtor"],
    deepDives: ["Store paise/cents as integers; distribute rounding remainders deterministically", "Simplification minimises transactions in practice (exact minimum is NP-hard in general)"],
    tradeoffs: ["Recomputing balances from history vs maintaining them incrementally"],
    followUps: ["Multiple currencies", "Editing an old expense", "Recurring expenses"],
  },
  {
    slug: "elevator", title: "Elevator system", kind: "lld", level: "Intermediate",
    prompt: "Design the control system for a building with several elevators.",
    functional: ["Hall calls (up/down) and car calls (floor buttons)", "Dispatch calls to elevators", "Doors, direction and idle states"],
    nonFunctional: ["Minimise waiting time", "Easy to swap the dispatch algorithm"],
    api: ["Controller.requestHall(floor, direction)", "Elevator.requestFloor(floor)", "Elevator.step()"],
    data: ["Elevator(id, currentFloor, direction, state, stops)", "Request(floor, direction, time)"],
    components: ["Elevator state machine (Idle, MovingUp, MovingDown, DoorsOpen) — State pattern", "DispatchStrategy (nearest car, SCAN/LOOK) — Strategy", "Controller assigns hall calls; each elevator keeps sorted stop sets"],
    deepDives: ["LOOK algorithm: keep going in one direction while there are stops ahead", "Handling a request for a floor just passed"],
    tradeoffs: ["Centralised controller (optimal, single point) vs each elevator deciding (simple, less optimal)"],
    followUps: ["Add maintenance mode", "Express elevators for upper floors", "Peak-hour behaviour"],
  },
  {
    slug: "ticket-booking", title: "Movie ticket booking", kind: "lld", level: "Advanced",
    prompt: "Design the booking flow for a cinema chain: shows, seat maps, temporary holds and payment.",
    functional: ["Browse shows and seat maps", "Hold seats for a few minutes during payment", "Confirm or release on payment result"],
    nonFunctional: ["No double booking", "Holds expire automatically", "Pricing rules vary by seat type and time"],
    api: ["BookingService.hold(showId, seatIds, userId) → Hold", "BookingService.confirm(holdId, payment)", "BookingService.release(holdId)"],
    data: ["Cinema, Screen, Seat(type), Show(movie, screen, time)", "ShowSeat(state: AVAILABLE | HELD | BOOKED, holdExpiresAt)", "Booking, Payment"],
    components: ["Seat state transitions guarded by optimistic locking (version) or row locks", "Hold expiry via TTL check on read plus a sweeper", "PricingStrategy per seat type/day", "Observer to notify waitlisted users when seats free up"],
    deepDives: ["Atomic multi-seat hold: all-or-nothing in one transaction", "Payment succeeds after the hold expired — refund or re-check"],
    tradeoffs: ["Pessimistic locks (simple, contention) vs optimistic (scales, retries)"],
    followUps: ["Group bookings that must sit together", "Dynamic pricing", "Seat selection for 10,000-seat stadiums"],
  },
];


/** The original 12 cases (live) with their live-round material merged in, then the newer cases (shipped as draft). */
const WITH_EXTRAS: DesignCase[] = BASE_CASES.map((bc) => {
  const x = CASE_EXTRAS[bc.slug];
  if (!x) return bc;
  return { ...bc, variants: x.variants, mistakes: x.mistakes, checklist: bc.checklist?.length ? bc.checklist : x.checklist, curveballs: bc.curveballs?.length ? bc.curveballs : x.curveballs };
});

/** A draft case that exists only on the local E2E server (E2E_FIXTURES=1), so review-gate tests never touch real content. */
const E2E_FIXTURE: DesignCase[] = process.env.E2E_FIXTURES === "1"
  ? [{ ...WITH_EXTRAS[0], slug: "e2e-fixture", title: "E2E fixture case", status: "draft" }]
  : [];

export const DESIGN_CASES: DesignCase[] = [...WITH_EXTRAS, ...NEW_CASES, ...LLD_CASES, ...E2E_FIXTURE];

export const CASE_BY_SLUG: Record<string, DesignCase> = Object.fromEntries(DESIGN_CASES.map((c) => [c.slug, c]));

export const designMeta = (c: DesignCase): ContentMeta => ({
  id: contentId("design-case", c.slug), version: c.version ?? 1, type: "design-case",
  difficulty: c.level === "Starter" ? "starter" : c.level === "Intermediate" ? "intermediate" : "advanced",
  tags: [c.kind], status: c.status ?? "live",
});
