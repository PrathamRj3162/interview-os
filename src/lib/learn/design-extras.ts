/**
 * Live-round material for the original 12 design cases: level variants, a weighted must-cover checklist (used for
 * the coverage score in HLD rounds), three curveballs and five common mistakes. Written for Interview OS.
 */
import type { ChecklistItem } from "@/lib/interview/design-report";

export type CaseExtras = {
  variants: { sde1: string; sde2: string };
  checklist: ChecklistItem[];
  curveballs: string[];
  mistakes: string[];
};

const c = (id: string, item: string, weight: number): ChecklistItem => ({ id, item, weight });

export const CASE_EXTRAS: Record<string, CaseExtras> = {
  "url-shortener": {
    variants: {
      sde1: "Single region, 100M links a month. Focus on key generation, the read path with a cache, and expiry.",
      sde2: "Multi-region with custom domains and click analytics within a minute. Expect hot-link handling, analytics pipeline design and abuse controls.",
    },
    checklist: [], curveballs: [], // set on the case itself
    mistakes: [
      "Hashing the long URL and truncating it without handling collisions.",
      "Putting analytics writes on the redirect path, adding latency to every click.",
      "Skipping the cache even though reads outnumber writes about 100:1.",
      "Using a single auto-increment counter in one database as the only key source.",
      "Ignoring expiry and abuse, which every real shortener has to handle.",
    ],
  },
  "rate-limiter": {
    variants: {
      sde1: "One API behind a few servers; limit per user per minute. Focus on the algorithm and where counters live.",
      sde2: "Global API across regions with per-plan rules and bursts. Expect accuracy vs latency trade-offs, fail-open policy and hot keys.",
    },
    checklist: [
      c("rules", "Clarifies what is limited (user, key, IP), the limits and whether bursts are allowed", 2),
      c("algorithm", "Chooses an algorithm (token bucket, sliding window, fixed window) and explains its trade-off", 3),
      c("shared_state", "Keeps counters in a shared fast store so all servers see the same count", 3),
      c("atomic", "Makes increment-and-check atomic (Lua script, INCR with TTL, or similar)", 2),
      c("response", "Returns 429 with retry/remaining headers", 1),
      c("failure", "Decides fail-open vs fail-closed when the counter store is down", 2),
      c("latency", "Keeps added latency small (local cache of rules, one round trip)", 1),
    ],
    curveballs: [
      "Your Redis cluster for counters becomes unreachable for two minutes. What do your API servers do?",
      "One customer's API key now sends 50% of all traffic from 20 regions. How do you keep limits accurate?",
      "Product wants limits per endpoint and per plan, changed without a deploy. What changes?",
    ],
    mistakes: [
      "Keeping counters in each server's memory, so the real limit becomes N times larger.",
      "Read-then-write counters without atomicity, letting bursts slip through.",
      "Not saying what happens when the counter store fails.",
      "Choosing fixed windows without noticing the double-burst at window edges.",
      "Forgetting to tell clients when to retry.",
    ],
  },
  chat: {
    variants: {
      sde1: "1:1 chat with online status and delivered/read receipts for a few million users.",
      sde2: "Groups up to 500, multi-device sync, ordering guarantees and offline delivery at hundreds of millions of users.",
    },
    checklist: [
      c("realtime", "Uses persistent connections (WebSockets) for real-time delivery", 3),
      c("routing", "Knows which gateway holds each user's connection (presence/session registry)", 3),
      c("persist", "Persists messages before acknowledging, with a store suited to per-conversation reads", 2),
      c("ordering", "Defines message ordering (per-conversation sequence numbers or timestamps) and handles retries/duplicates", 2),
      c("offline", "Delivers to offline users later (push notification + sync on reconnect)", 2),
      c("receipts", "Handles delivered/read receipts", 1),
      c("groups", "Fans out group messages efficiently", 1),
      c("scale_estimates", "Estimates concurrent connections and messages per second", 1),
    ],
    curveballs: [
      "A gateway server holding 200,000 connections crashes. What happens to those users and their in-flight messages?",
      "Product wants groups of 5,000 members. What breaks in your fan-out?",
      "Users complain messages arrive out of order on their second device. What do you change?",
    ],
    mistakes: [
      "Polling the server every few seconds instead of using persistent connections.",
      "Acknowledging messages before they are stored, so a crash loses them.",
      "No plan for finding which server holds the recipient's connection.",
      "Ignoring duplicate delivery when clients retry.",
      "Treating group messages exactly like 1:1 without thinking about fan-out cost.",
    ],
  },
  "news-feed": {
    variants: {
      sde1: "Chronological feed of followed accounts for 10M users.",
      sde2: "Ranked feed for 500M users including celebrity accounts with 50M followers, served under 200 ms.",
    },
    checklist: [
      c("fanout_choice", "Compares fan-out on write vs on read and picks with reasons", 3),
      c("celebrity", "Handles very large accounts differently (hybrid pull for celebrities)", 3),
      c("feed_cache", "Stores precomputed feeds (ids) in a cache per user", 2),
      c("pagination", "Paginates the feed with a cursor", 1),
      c("ranking", "Explains where ranking happens and its inputs", 1),
      c("media", "Serves media from object storage + CDN, not the feed service", 1),
      c("estimates", "Estimates posts/s, feed reads/s and fan-out cost", 2),
    ],
    curveballs: [
      "A celebrity with 80M followers posts during a live event. What happens with your design?",
      "Users who haven't opened the app in a year come back. Do you still precompute their feeds?",
      "The feed cache cluster restarts and is empty. What happens to read load and latency?",
    ],
    mistakes: [
      "Pure fan-out on write, which melts down for celebrity accounts.",
      "Pure fan-out on read with joins at request time, which is too slow at scale.",
      "Storing whole posts in every follower's feed instead of ids.",
      "Offset pagination that skips or repeats items as new posts arrive.",
      "No estimate of fan-out cost before choosing.",
    ],
  },
  notifications: {
    variants: {
      sde1: "Send push, email and SMS for one product; a few million per day.",
      sde2: "Platform for many teams: priorities, user preferences, quiet hours, provider failover, exactly-once-feeling delivery at 1B/day.",
    },
    checklist: [
      c("api_async", "Accepts requests through an API and processes them asynchronously via queues", 3),
      c("preferences", "Checks user preferences, opt-outs and quiet hours before sending", 2),
      c("channels", "Separate workers per channel with provider integrations", 2),
      c("retries", "Retries with backoff and a dead-letter queue", 2),
      c("dedupe", "Prevents duplicates with an idempotency key", 2),
      c("priority", "Separates urgent (OTP) from bulk (marketing) traffic", 2),
      c("tracking", "Tracks delivery status for each notification", 1),
    ],
    curveballs: [
      "Your SMS provider starts failing 30% of requests during a festival sale. What happens to OTPs?",
      "A bug in another team's service sends the same notification 10 times. How do you protect users?",
      "Marketing schedules 50M emails at 9 a.m. while OTPs must still arrive within 10 seconds. What changes?",
    ],
    mistakes: [
      "Calling providers synchronously inside the API request.",
      "One queue for everything, so bulk campaigns delay OTPs.",
      "No idempotency, so retries send duplicates.",
      "Ignoring user preferences and opt-outs (also a legal problem).",
      "No dead-letter handling: failed messages disappear silently.",
    ],
  },
  "file-storage": {
    variants: {
      sde1: "Upload, download and sync files up to 1 GB for one user across two devices.",
      sde2: "Shared folders, conflict handling, deduplication and resumable uploads at hundreds of millions of users.",
    },
    checklist: [
      c("split", "Separates metadata (file tree, versions) from file content (blocks in object storage)", 3),
      c("chunking", "Splits files into chunks and uploads only changed chunks", 3),
      c("dedupe", "Content-addresses chunks (hash) to deduplicate", 2),
      c("sync_notify", "Notifies other devices of changes (long-poll, WebSocket or push)", 2),
      c("conflicts", "Defines conflict handling for concurrent edits", 2),
      c("resumable", "Supports resumable uploads", 1),
      c("direct_upload", "Uploads directly to object storage with signed URLs", 1),
    ],
    curveballs: [
      "Two devices edit the same file offline and reconnect. What does each user see?",
      "A user uploads a 50 GB video on a flaky mobile connection. What changes?",
      "Storage costs are growing 40% a year. Where do you save?",
    ],
    mistakes: [
      "Storing files as database blobs.",
      "Re-uploading the whole file on every change.",
      "No story for conflicting edits.",
      "Routing all file bytes through the app servers.",
      "Polling every device constantly for changes.",
    ],
  },
  "ride-matching": {
    variants: {
      sde1: "One city: track drivers and match a rider to the nearest available driver.",
      sde2: "Many cities at peak: matching quality, surge, location update load, and avoiding double-assigning a driver.",
    },
    checklist: [
      c("location_ingest", "Ingests frequent driver location updates and sizes that load", 2),
      c("geo_index", "Uses a geospatial index (geohash, quadtree, S2/H3 cells) in memory for nearby search", 3),
      c("matching", "Explains how candidates are found, ranked and offered", 2),
      c("assignment_lock", "Prevents assigning one driver to two riders (lock/state machine)", 3),
      c("trip_state", "Models trip states and persists them", 1),
      c("offer_timeout", "Handles offer timeouts and re-matching", 1),
      c("partition", "Partitions by city/region", 1),
    ],
    curveballs: [
      "A concert ends and 20,000 people request rides from one block. What happens?",
      "Driver location updates double because the app now sends every 2 seconds. What breaks?",
      "Two riders get matched to the same driver at the same moment. How did it happen and how do you stop it?",
    ],
    mistakes: [
      "Querying a relational database with distance maths for every request.",
      "Not estimating location update throughput.",
      "No protection against double assignment.",
      "Treating the world as one shard.",
      "Ignoring what happens when a driver doesn't respond to an offer.",
    ],
  },
  "kv-cache": {
    variants: {
      sde1: "A cache cluster for one service: sharding, eviction and what happens when a node dies.",
      sde2: "Shared multi-tenant cache: replication, rebalancing without stampedes, hot keys and consistency with the database.",
    },
    checklist: [
      c("sharding", "Shards keys with consistent hashing (virtual nodes) to limit movement on resize", 3),
      c("eviction", "Chooses an eviction policy (LRU/LFU) and TTLs", 2),
      c("replication", "Replicates for availability and explains failover", 2),
      c("invalidation", "Defines a cache pattern (cache-aside, write-through) and invalidation", 2),
      c("stampede", "Prevents stampedes (request coalescing, jittered TTLs)", 2),
      c("hot_keys", "Handles hot keys (replicas, local caching, key splitting)", 2),
      c("membership", "Tracks cluster membership (config service or gossip)", 1),
    ],
    curveballs: [
      "You add four nodes to a 12-node cluster during peak. What happens to the hit rate and the database?",
      "One product page key gets 200,000 reads per second. What happens?",
      "A node is partitioned but still serving stale values. What do clients see?",
    ],
    mistakes: [
      "Modulo hashing, which reshuffles almost every key when nodes change.",
      "No plan for a cold cache hammering the database.",
      "Ignoring invalidation and serving stale data indefinitely.",
      "No replication, so one node failure drops a shard of hot data.",
      "Forgetting hot keys.",
    ],
  },
  "parking-lot": {
    variants: {
      sde1: "Single building, three spot sizes, ticket and pay on exit.",
      sde2: "Multiple entry gates in parallel, reservations and pluggable pricing; concurrency must be safe.",
    },
    checklist: [
      c("entities", "Models lot, floors, spots, vehicles and tickets with clear responsibilities", 3),
      c("spot_strategy", "Uses a strategy for spot allocation", 2),
      c("pricing", "Keeps pricing pluggable (strategy) rather than if/else", 2),
      c("concurrency", "Makes spot assignment safe with concurrent gates", 2),
      c("extensibility", "Shows how a new vehicle type or spot type is added", 1),
    ],
    curveballs: ["Add EV charging spots that cost extra per hour.", "Two gates assign the last spot at the same moment.", "Monthly pass holders park without tickets."],
    mistakes: ["God class that does everything.", "Pricing hard-coded in if/else chains.", "No thought about concurrent gates.", "Inheritance for every vehicle with duplicated logic.", "Ignoring how tickets are paid and closed."],
  },
  "expense-splitter": {
    variants: {
      sde1: "Groups, expenses split equally or by exact amounts, and balances.",
      sde2: "Percent and share splits, multiple currencies, settle-up suggestions and an audit trail.",
    },
    checklist: [
      c("entities", "Models users, groups, expenses and balances", 3),
      c("split_strategy", "Uses a strategy per split type with validation (amounts add up)", 3),
      c("balances", "Maintains a balance sheet updated per expense", 2),
      c("simplify", "Explains debt simplification", 1),
      c("money", "Uses exact money arithmetic (integers/decimals, not floats)", 1),
    ],
    curveballs: ["Add a new split type: by shares (2:1:1).", "An expense is edited after it was settled.", "Members pay in different currencies."],
    mistakes: ["Floats for money.", "Split logic inside one big method.", "Not validating that splits sum to the total.", "Recomputing all balances from scratch on every read without saying why.", "No audit trail for edits."],
  },
  elevator: {
    variants: {
      sde1: "One building, three elevators, hall and car buttons.",
      sde2: "Peak-hour optimisation, maintenance mode, emergency behaviour and pluggable scheduling.",
    },
    checklist: [
      c("entities", "Separates controller, elevator car, requests and buttons", 3),
      c("state", "Models each car as a state machine (idle, moving, doors open)", 2),
      c("scheduling", "Pluggable scheduling strategy for choosing a car", 3),
      c("requests", "Handles hall vs car requests and direction", 1),
      c("concurrency", "Thread-safe request queues", 1),
    ],
    curveballs: ["Add a VIP mode that skips other floors.", "One elevator goes into maintenance mid-trip.", "Morning rush: everyone goes up from the lobby."],
    mistakes: ["Scheduling logic tangled inside the Elevator class.", "Booleans instead of a state machine.", "Ignoring direction of travel.", "No way to change the algorithm.", "Not handling simultaneous requests."],
  },
  "ticket-booking": {
    variants: {
      sde1: "One cinema chain: shows, seats, booking and payment.",
      sde2: "Flash demand for a blockbuster, seat holds with expiry, payment failures and no double booking.",
    },
    checklist: [
      c("entities", "Models movie, show, screen, seat, show-seat and booking", 3),
      c("hold", "Temporarily holds seats with an expiry before payment", 3),
      c("no_double", "Prevents double booking (locking or optimistic versioning)", 3),
      c("payment", "Handles payment success, failure and timeout", 1),
      c("extensibility", "Shows how pricing or seat types extend", 1),
    ],
    curveballs: ["A blockbuster opens and 100,000 users hit one show.", "Payment succeeds but the confirmation call times out.", "Add group bookings that must sit together."],
    mistakes: ["Booking seats without a hold, so payment races cause double booking.", "Seat state stored only on the Seat (not per show).", "No expiry for holds.", "Ignoring payment timeouts.", "One giant BookingManager class."],
  },
};
