import "server-only";
import { contentId, type ContentMeta, type ContentStatus } from "@/lib/content/types";

/**
 * System design building-block primers, written for Interview OS. One page each: when to use it, trade-offs,
 * a 30-second interview answer, 3 check questions (graded on the server — the key never reaches the browser)
 * and the cases that need it. They ship as `draft` until approved on /review.
 */
export type PrimerCheck = { q: string; options: string[]; answer: number; why: string };
export type Primer = {
  slug: string; title: string; version?: number; status?: ContentStatus;
  when: string[]; tradeoffs: string[]; answer30: string; checks: PrimerCheck[]; cases: string[];
};

const q = (question: string, options: string[], answer: number, why: string): PrimerCheck => ({ q: question, options, answer, why });

export const PRIMERS: Primer[] = [
  {
    slug: "scaling-basics", title: "Scaling: vertical, horizontal and stateless services",
    when: ["Traffic outgrows one machine", "You need availability beyond a single server", "Different tiers grow at different rates"],
    tradeoffs: ["Vertical scaling is simple but has a ceiling and a single point of failure", "Horizontal scaling needs stateless servers and a load balancer", "Moving state out (sessions, caches) adds network hops"],
    answer30: "I'd keep the app servers stateless so I can add machines behind a load balancer, and push state into shared stores: sessions in Redis, data in the database. Vertical scaling is my first lever for the database because it's simpler, then read replicas and sharding when the numbers require it.",
    checks: [
      q("Why do horizontally scaled app servers need to be stateless?", ["So they use less memory", "So any server can handle any request and servers can be added or removed freely", "Because load balancers can't route to stateful servers", "To avoid using a database"], 1, "If a server holds a user's session, that user must always return to it; stateless servers make scaling and failover trivial."),
      q("What is the main limit of vertical scaling?", ["It requires code changes", "There is a hardware ceiling and the machine is a single point of failure", "It can't be done in the cloud", "It makes queries slower"], 1, "Bigger machines eventually stop existing or become very expensive, and one machine is one failure domain."),
      q("Where should user sessions live in a horizontally scaled web tier?", ["In each server's memory", "In a shared store such as Redis or a signed token", "In the load balancer", "In the CDN"], 1, "A shared store or a self-contained signed token lets any server validate the session."),
    ],
    cases: ["url-shortener", "news-feed", "instagram"],
  },
  {
    slug: "load-balancing", title: "Load balancing (L4 vs L7)",
    when: ["More than one server handles the same traffic", "You need health checks and failover", "You need routing by path, header or version (L7)"],
    tradeoffs: ["L4 (TCP) is faster and protocol-agnostic but can't route by URL", "L7 (HTTP) can route, terminate TLS and retry, at more CPU cost", "Sticky sessions help stateful apps but unbalance load"],
    answer30: "A load balancer spreads requests across healthy servers. An L4 balancer works on TCP connections and is very fast; an L7 balancer understands HTTP, so it can route by path, terminate TLS and retry failed requests. I'd use round-robin or least-connections with health checks, and avoid sticky sessions by keeping servers stateless.",
    checks: [
      q("Which can route /api to one pool and /images to another?", ["An L4 load balancer", "An L7 load balancer", "DNS round-robin only", "A database proxy"], 1, "Only an L7 balancer reads the HTTP path."),
      q("What do health checks give you?", ["Faster responses", "Traffic stops going to servers that are failing", "Encryption", "Caching"], 1, "Unhealthy servers are taken out of rotation automatically."),
      q("A downside of sticky sessions is…", ["They need TLS", "Load can become uneven and a server failure loses those sessions", "They only work with L4", "They prevent caching"], 1, "Users are pinned to servers, so load and failures don't spread evenly."),
    ],
    cases: ["url-shortener", "rate-limiter", "chat"],
  },
  {
    slug: "caching", title: "Caching: patterns, eviction and stampedes",
    when: ["Reads far outnumber writes", "The same data is requested often (hot keys)", "The source is slow or expensive"],
    tradeoffs: ["Cache-aside is simple but the first read is slow and data can be stale", "Write-through keeps the cache fresh at the cost of write latency", "TTLs trade freshness for load; expiring many keys at once causes stampedes"],
    answer30: "I'd use cache-aside: read from Redis, on a miss read the database and populate the cache with a TTL. Writes update the database and delete the cache key. LRU eviction handles memory pressure. To avoid a stampede when a hot key expires, I'd add TTL jitter and let only one request rebuild the key while others wait or serve stale data.",
    checks: [
      q("In cache-aside, what happens on a cache miss?", ["The request fails", "The app reads the database and writes the result into the cache", "The cache reads the database itself", "The write is retried"], 1, "The application owns the miss path in cache-aside."),
      q("What is a cache stampede?", ["A cache running out of memory", "Many requests hitting the database at once when a hot key expires", "Two caches disagreeing", "A slow network"], 1, "All waiting requests miss together and overload the source."),
      q("Which reduces stampedes?", ["Shorter TTLs", "Jittered TTLs and request coalescing (one rebuild at a time)", "Removing the cache", "Bigger keys"], 1, "Spreading expiries and letting one request refill the key prevents the herd."),
    ],
    cases: ["url-shortener", "kv-cache", "news-feed", "typeahead"],
  },
  {
    slug: "cdn", title: "CDNs",
    when: ["Static assets or media are served worldwide", "Large files dominate bandwidth (video, images)", "You want to absorb traffic spikes at the edge"],
    tradeoffs: ["Huge latency and cost wins for cacheable content", "Invalidation is slow or costly; use versioned URLs", "Dynamic, personalised responses rarely benefit"],
    answer30: "A CDN caches content in edge locations close to users, so images, video segments and static files load fast and the origin sees a fraction of the traffic. I'd serve media from object storage through the CDN with versioned URLs, so I never need to purge, and keep personalised API responses out of it.",
    checks: [
      q("Why use versioned asset URLs (app.3f9c.js) with a CDN?", ["They compress better", "A new version is a new URL, so you never need to purge stale copies", "CDNs require them", "They hide the origin"], 1, "Changing the URL sidesteps cache invalidation."),
      q("Which content benefits least from a CDN?", ["Video segments", "Product images", "A user's personalised account page", "JavaScript bundles"], 2, "Personalised responses can't be shared between users."),
      q("A CDN mainly reduces…", ["Database writes", "Latency for distant users and load/bandwidth on the origin", "Code size", "The number of servers needed for writes"], 1, "Edges serve cached copies near users."),
    ],
    cases: ["youtube", "instagram", "flash-sale"],
  },
  {
    slug: "sql-vs-nosql", title: "SQL vs NoSQL",
    when: ["Relational data with transactions and joins → SQL", "Huge scale with simple access by key → key-value/wide-column", "Flexible documents read as a whole → document store"],
    tradeoffs: ["SQL gives transactions, constraints and ad-hoc queries; sharding is harder", "NoSQL scales out easily for known access patterns but limits joins and transactions", "Pick from access patterns and consistency needs, not fashion"],
    answer30: "I choose the store from the access patterns. Money, orders and anything needing transactions goes in a relational database. Very high-volume data read by a key, like messages per conversation or events per user, fits a wide-column store such as Cassandra. Many systems use both.",
    checks: [
      q("A payments ledger needing multi-row transactions fits best in…", ["A relational database", "A CDN", "A document store without transactions", "A cache"], 0, "Money movement needs ACID transactions."),
      q("Chat messages read by (conversation, time) at billions of rows fit…", ["A wide-column store partitioned by conversation", "One SQL table with no index", "A CDN", "Local files"], 0, "Partitioned by conversation, sorted by time, is the access pattern."),
      q("The best way to pick a database in an interview is…", ["Always NoSQL for scale", "From access patterns, consistency needs and scale", "Always SQL", "Whatever is newest"], 1, "Justify by the queries you need."),
    ],
    cases: ["chat", "upi-payments", "key-value-store"],
  },
  {
    slug: "indexes", title: "Database indexes",
    when: ["Queries filter or sort on columns", "Lookups by a key that isn't the primary key", "Range scans (time windows)"],
    tradeoffs: ["Indexes speed reads but slow writes and use space", "Composite indexes follow the leftmost-prefix rule", "Wrapping a column in a function usually bypasses the index"],
    answer30: "An index is a sorted structure, usually a B+ tree, that lets the database find rows without scanning the table. I'd index the columns my main queries filter and sort on, with composite indexes in the order the queries use them, and accept slower writes for faster reads.",
    checks: [
      q("An index on (a, b) helps which query?", ["WHERE b = 1", "WHERE a = 1 AND b = 2", "WHERE c = 3", "None"], 1, "Leftmost-prefix: a, or a and b."),
      q("The cost of adding indexes is…", ["Slower reads", "Slower writes and more storage", "Lost data", "Less consistency"], 1, "Each write must update every index."),
      q("Why might WHERE LOWER(email) = 'x' not use an index on email?", ["Strings can't be indexed", "The function changes the value, so the plain index doesn't match", "LOWER is slow", "Indexes ignore WHERE"], 1, "Use an expression index or store normalised values."),
    ],
    cases: ["job-scheduler", "url-shortener"],
  },
  {
    slug: "replication", title: "Replication",
    when: ["Read traffic exceeds one machine", "You need failover when a node dies", "Data must survive a data-centre loss"],
    tradeoffs: ["Async replication is fast but replicas lag (stale reads, possible loss on failover)", "Sync replication is safe but adds write latency", "Multi-leader allows local writes but needs conflict resolution"],
    answer30: "I'd run a primary with read replicas: writes go to the primary, reads can go to replicas. With asynchronous replication, replicas can lag, so reads that must see your own write go to the primary. For durability across failures I'd make at least one replica synchronous or use a consensus-based store.",
    checks: [
      q("A user updates their profile and immediately sees the old one. Likely cause?", ["Index missing", "Reading from an asynchronous replica that hasn't caught up", "CDN failure", "Load balancer"], 1, "Replication lag; route read-your-writes to the primary."),
      q("Synchronous replication's main cost is…", ["Stale reads", "Higher write latency", "Less durability", "More storage"], 1, "The primary waits for a replica to confirm."),
      q("Multi-leader replication requires…", ["No network", "Conflict resolution for concurrent writes", "Only one region", "A CDN"], 1, "Two leaders can accept conflicting writes."),
    ],
    cases: ["key-value-store", "kv-cache", "upi-payments"],
  },
  {
    slug: "sharding", title: "Sharding (partitioning)",
    when: ["Data or write load exceeds one database", "Access is mostly by a key (user, tenant, conversation)", "You need to scale writes, not just reads"],
    tradeoffs: ["Spreads load but cross-shard queries and transactions get hard", "A bad shard key creates hot shards", "Resharding is expensive; plan with consistent hashing or many logical shards"],
    answer30: "I'd shard by the key most queries use, like user id, so a request touches one shard. I'd hash the key to spread load evenly, keep many logical shards mapped to fewer machines so I can rebalance, and watch for hot keys like celebrity users that need special handling.",
    checks: [
      q("A good shard key is…", ["Monotonic timestamps", "A key most queries filter on, with values spread evenly", "A boolean flag", "The country code alone"], 1, "Queries hit one shard and load spreads out."),
      q("Sharding by creation date causes…", ["Even load", "All new writes hitting one shard (hotspot)", "Faster joins", "Lower storage"], 1, "The newest shard takes every write."),
      q("What becomes harder after sharding?", ["Single-key lookups", "Cross-shard joins and transactions", "Caching", "Indexes on one shard"], 1, "Data you need together may live apart."),
    ],
    cases: ["key-value-store", "chat", "instagram"],
  },
  {
    slug: "consistent-hashing", title: "Consistent hashing",
    when: ["Distributing keys over a changing set of nodes", "Caches and KV stores that add/remove nodes", "You want minimal data movement on resize"],
    tradeoffs: ["Adding a node moves only ~1/N of keys (vs almost all with modulo)", "Needs virtual nodes to spread load evenly", "Hot keys are still hot"],
    answer30: "Nodes and keys are hashed onto a ring; each key belongs to the next node clockwise. When a node joins or leaves, only the keys next to it move. Each physical node gets many virtual nodes on the ring so load stays even, and replicas go to the next few distinct nodes.",
    checks: [
      q("With modulo hashing (hash % N), adding one node moves…", ["Only one key", "About 1/N of keys", "Almost all keys", "No keys"], 2, "Changing N changes almost every assignment."),
      q("Virtual nodes are used to…", ["Encrypt keys", "Spread load evenly across physical nodes", "Store backups", "Speed up hashing"], 1, "Many points per node smooth the distribution."),
      q("With consistent hashing, adding a node moves roughly…", ["All keys", "1/N of the keys", "Half the keys", "None"], 1, "Only the arc the new node takes over."),
    ],
    cases: ["kv-cache", "key-value-store"],
  },
  {
    slug: "cap-pacelc", title: "CAP and PACELC",
    when: ["A system spans multiple nodes or regions", "Deciding behaviour during a network partition", "Choosing between low latency and strong consistency"],
    tradeoffs: ["During a partition you choose consistency (reject some requests) or availability (serve possibly stale data)", "PACELC: else, with no partition, you trade latency for consistency", "Different operations in one system can choose differently"],
    answer30: "CAP says that during a network partition, a distributed store must either refuse some requests to stay consistent or keep serving with possibly stale data. PACELC adds that even without partitions, stronger consistency costs latency. I choose per operation: payments favour consistency; feeds and likes favour availability.",
    checks: [
      q("During a partition, an AP system will…", ["Reject all requests", "Keep serving, possibly returning stale data", "Lose all data", "Become strongly consistent"], 1, "Availability is chosen over consistency."),
      q("PACELC's 'ELC' part is about…", ["Encryption", "Latency vs consistency when there is no partition", "Load balancing", "Caching"], 1, "Else: latency or consistency."),
      q("A bank transfer should usually favour…", ["Availability", "Consistency", "Neither", "Caching"], 1, "Money must not be double-spent."),
    ],
    cases: ["key-value-store", "upi-payments"],
  },
  {
    slug: "consistency-models", title: "Consistency models",
    when: ["Users read data others just wrote", "Replicated or cached data", "Deciding what staleness users can tolerate"],
    tradeoffs: ["Strong (linearisable) is easiest to reason about but slow and less available", "Eventual is fast and available but readers may see old data", "Read-your-writes and monotonic reads fix the most visible anomalies cheaply"],
    answer30: "Strong consistency means every read sees the latest write; eventual means replicas converge later. Most products don't need strong consistency everywhere, but users notice when their own change disappears, so I'd guarantee read-your-writes, for example by reading from the primary for a short time after a user writes.",
    checks: [
      q("Read-your-writes guarantees that…", ["Everyone sees every write immediately", "A user always sees their own writes", "Writes are never lost", "Reads are fast"], 1, "Only the writer's view is guaranteed fresh."),
      q("Eventual consistency means…", ["Data is never consistent", "Replicas converge if writes stop", "Reads block until consistent", "Only one replica exists"], 1, "Given time without new writes, all copies agree."),
      q("Which feature most needs strong consistency?", ["Like counts", "Feed ranking", "Seat booking for a show", "View counts"], 2, "Two people must not get the same seat."),
    ],
    cases: ["ticket-booking", "chat", "collab-editor"],
  },
  {
    slug: "quorums", title: "Quorums (W + R > N)",
    when: ["Replicated stores with tunable consistency", "Leaderless replication (Dynamo-style)", "Balancing read and write latency"],
    tradeoffs: ["W + R > N makes every read overlap the latest write", "Higher W or R = more latency and less availability", "Sloppy quorums improve availability but weaken the guarantee"],
    answer30: "With N replicas, a write waits for W acknowledgements and a read queries R replicas. If W + R > N, every read overlaps at least one replica with the latest write, so it can return the newest version. With N = 3, W = 2 and R = 2 is a common balance.",
    checks: [
      q("With N = 3, which setting guarantees reads overlap the latest write?", ["W = 1, R = 1", "W = 2, R = 2", "W = 1, R = 2", "W = 0, R = 3"], 1, "2 + 2 = 4 > 3, so any 2 replicas read share at least one with the 2 that acknowledged the write."),
      q("Raising W from 2 to 3 (N = 3) means…", ["Faster writes", "Writes fail if any replica is down", "Stale reads", "No change"], 1, "All replicas must acknowledge."),
      q("W = 1, R = 1 with N = 3 gives…", ["Strong consistency", "Fast but possibly stale reads", "No availability", "Lost writes always"], 1, "Reads may hit a replica without the write."),
    ],
    cases: ["key-value-store"],
  },
  {
    slug: "queues-and-logs", title: "Queues and logs (partitions, consumers)",
    when: ["Decoupling producers from slow consumers", "Smoothing traffic spikes", "Many independent consumers of the same events"],
    tradeoffs: ["Queues absorb spikes but add latency and operational parts", "Logs (Kafka) retain and replay; classic queues delete on ack", "Ordering only within a partition"],
    answer30: "I'd put a queue between the request path and slow work like emails or transcoding, so the API stays fast and spikes are absorbed. If several services need the same events or I need replay, I'd use a partitioned log like Kafka, partitioned by a key whose order matters, with consumer groups tracking offsets.",
    checks: [
      q("Kafka guarantees ordering…", ["Globally across a topic", "Within a partition", "Never", "Only for one consumer group"], 1, "Order is per partition."),
      q("A main reason to add a queue is…", ["Stronger consistency", "Decoupling and absorbing spikes", "Fewer servers", "Smaller messages"], 1, "Producers don't wait for slow consumers."),
      q("Two consumer groups on one topic each receive…", ["Half the messages", "All the messages", "Only new messages", "Nothing"], 1, "Each group reads the full stream independently."),
    ],
    cases: ["message-queue", "notifications", "news-feed", "youtube"],
  },
  {
    slug: "idempotency", title: "Delivery semantics and idempotency keys",
    when: ["Clients or services retry requests", "Messages can be delivered more than once", "Money or orders must not be duplicated"],
    tradeoffs: ["At-least-once delivery is the practical default; duplicates must be harmless", "Idempotency keys cost a lookup and storage", "Exactly-once end to end is achieved by idempotent processing, not by the network"],
    answer30: "Networks and queues deliver at least once, so I make operations idempotent. The client sends an idempotency key with each payment; the server stores the key with the result in the same transaction, and a retry with the same key returns the stored result instead of charging again.",
    checks: [
      q("Why are idempotency keys needed for payments?", ["To encrypt the request", "So a retried request doesn't create a second payment", "To speed up payments", "For analytics"], 1, "Retries are inevitable; duplicates must be prevented."),
      q("Where should the server record the idempotency key?", ["In a log file", "Atomically with the operation's result, under a unique constraint", "In the client", "In the CDN"], 1, "Atomic storage stops two retries racing."),
      q("'Exactly-once' processing in practice means…", ["The network never duplicates", "At-least-once delivery plus idempotent processing", "Disabling retries", "One server only"], 1, "Duplicates arrive but have no effect."),
    ],
    cases: ["upi-payments", "notifications", "food-delivery"],
  },
  {
    slug: "retries-backoff", title: "Retries, backoff and timeouts",
    when: ["Calling other services or providers", "Transient failures (timeouts, 503s)", "Protecting a struggling dependency"],
    tradeoffs: ["Retries recover from blips but multiply load during outages", "Exponential backoff with jitter spreads retries out", "Retry only idempotent or idempotency-keyed operations"],
    answer30: "Every remote call gets a timeout. I retry transient failures a few times with exponential backoff and jitter, only for idempotent operations, and stop retrying when a circuit breaker sees the dependency is down, so retries don't turn a small outage into a big one.",
    checks: [
      q("Why add jitter to backoff?", ["To make retries faster", "So clients don't all retry at the same moment", "To log errors", "To encrypt requests"], 1, "Synchronised retries cause waves of load."),
      q("A circuit breaker…", ["Restarts servers", "Stops calling a failing dependency for a while", "Encrypts traffic", "Caches responses"], 1, "It fails fast instead of piling on."),
      q("Which call is unsafe to retry blindly?", ["GET a profile", "POST a payment without an idempotency key", "Fetch a static file", "Health check"], 1, "It could charge twice."),
    ],
    cases: ["notifications", "upi-payments"],
  },
  {
    slug: "sagas-outbox", title: "Sagas and the outbox pattern",
    when: ["A business flow spans several services/databases", "You must update a database and publish an event reliably", "Distributed transactions (2PC) are too costly"],
    tradeoffs: ["Sagas give eventual consistency with compensating steps instead of locks", "Compensations must be designed for every step", "Outbox avoids dual-write bugs at the cost of a relay process"],
    answer30: "For an order that touches payment, inventory and delivery, I'd use a saga: each service does its local transaction and publishes an event; if a later step fails, earlier steps run compensating actions like refunding. To publish events reliably, each service writes the event to an outbox table in the same transaction, and a relay publishes it.",
    checks: [
      q("A saga handles failure of a later step by…", ["Rolling back a global transaction", "Running compensating actions for earlier steps", "Ignoring it", "Retrying forever"], 1, "Each step has an undo."),
      q("The outbox pattern solves…", ["Slow queries", "Losing events when the DB write succeeds but publishing fails", "Caching", "Authentication"], 1, "Event and data are written in one transaction."),
      q("Why avoid two-phase commit across microservices?", ["It's not secure", "It blocks resources and couples availability of all participants", "It's too fast", "It needs a CDN"], 1, "Locks are held across services."),
    ],
    cases: ["food-delivery", "upi-payments", "flash-sale"],
  },
  {
    slug: "leader-election", title: "Leader election and coordination",
    when: ["Exactly one node must do a job (scheduler, partition leader)", "Failover of a primary", "Distributed locks and leases"],
    tradeoffs: ["Consensus systems (Raft/ZooKeeper/etcd) are safe but add a dependency", "Leases need fencing tokens to stop a paused old leader", "Split brain if done with heartbeats alone"],
    answer30: "I wouldn't build election myself: I'd use etcd or ZooKeeper to grant a lease to one node. The lease has a TTL so a dead leader is replaced, and each new leader gets a higher fencing token that downstream systems check, so a paused old leader can't do damage when it wakes up.",
    checks: [
      q("A fencing token prevents…", ["Slow elections", "A stale leader that woke up from a pause from overwriting newer work", "Network partitions", "High CPU"], 1, "Writes with an older token are rejected."),
      q("Why use a lease with a TTL?", ["To speed up reads", "So leadership expires if the leader dies", "To encrypt data", "To reduce storage"], 1, "No heartbeat → lease expires → new leader."),
      q("Split brain means…", ["Two leaders believe they are in charge", "The database is sharded", "Two replicas", "A slow network"], 0, "Both act, causing conflicts."),
    ],
    cases: ["job-scheduler", "message-queue", "unique-id-generator"],
  },
  {
    slug: "blob-storage", title: "Blob (object) storage",
    when: ["Images, video, documents and backups", "Large files that don't belong in a database", "Direct client uploads/downloads"],
    tradeoffs: ["Cheap and durable but higher latency than block storage", "Objects are immutable-ish: write new versions", "Use signed URLs so bytes bypass your servers"],
    answer30: "Large files go in object storage like S3; the database only stores metadata and the object key. Clients upload and download directly with short-lived signed URLs, so file bytes never pass through my app servers, and a CDN sits in front for reads.",
    checks: [
      q("Where should a 200 MB video be stored?", ["A database BLOB column", "Object storage, with metadata in the database", "Application server disk", "Redis"], 1, "Object storage is built for large, durable files."),
      q("Signed URLs let you…", ["Encrypt the database", "Let clients upload/download directly without routing bytes through your servers", "Skip authentication", "Compress files"], 1, "Time-limited direct access."),
      q("Updating a stored object usually means…", ["Editing bytes in place", "Writing a new object/version", "Changing the CDN", "Sharding"], 1, "Treat objects as immutable."),
    ],
    cases: ["file-storage", "youtube", "instagram"],
  },
  {
    slug: "inverted-index", title: "Inverted indexes (search)",
    when: ["Full-text search over documents", "Filtering by many terms", "Search-as-you-type alongside a trie"],
    tradeoffs: ["Very fast term lookup; building and updating the index costs work", "Sharded by document (scatter-gather) or by term", "Relevance ranking is its own problem (TF-IDF/BM25)"],
    answer30: "An inverted index maps each term to the list of documents containing it, so a search intersects a few lists instead of scanning everything. I'd use Elasticsearch or similar, shard by document, and keep it eventually consistent with the source database through a change stream.",
    checks: [
      q("An inverted index maps…", ["Documents to their ids", "Terms to the documents containing them", "Users to sessions", "Keys to nodes"], 1, "Term → posting list."),
      q("Why not use SQL LIKE '%term%' for search at scale?", ["It's not allowed", "It scans every row and can't use a normal index", "It's too accurate", "It needs a CDN"], 1, "Leading wildcards defeat B-tree indexes."),
      q("Keeping the search index in sync with the database is usually…", ["Synchronous in every request", "Asynchronous via a change stream (eventually consistent)", "Impossible", "Done weekly by hand"], 1, "Index updates lag slightly behind writes."),
    ],
    cases: ["typeahead", "web-crawler"],
  },
  {
    slug: "geo-indexing", title: "Geo indexing (geohash, quadtrees)",
    when: ["Find things near a point (drivers, restaurants)", "Very frequent location updates", "Partitioning by area"],
    tradeoffs: ["Geohash/S2/H3 cells turn 2D search into key lookups; cell edges need neighbour checks", "Quadtrees adapt to density but are harder to distribute", "Keep fast-changing locations in memory"],
    answer30: "I'd divide the map into cells using geohash or H3 and keep an in-memory index from cell to the drivers in it. A nearby search looks at the rider's cell and its neighbours, then ranks candidates by distance or ETA. Driver updates just move a driver between cells.",
    checks: [
      q("Why also search neighbouring cells?", ["To be polite", "A nearby point can be just across a cell boundary", "Cells overlap", "It's faster"], 1, "Boundaries split close points."),
      q("Frequently updated driver locations are best kept…", ["In a relational table updated per ping", "In an in-memory geo index", "In a CDN", "In object storage"], 1, "Updates arrive every few seconds."),
      q("A quadtree's advantage is…", ["Fixed cell size", "Cells adapt to density (split busy areas)", "No memory use", "Exact distances"], 1, "Dense cities get smaller cells."),
    ],
    cases: ["ride-matching", "food-delivery"],
  },
  {
    slug: "realtime-delivery", title: "Polling vs SSE vs WebSockets",
    when: ["Live updates: chat, tracking, notifications, collaboration", "Choosing how the server pushes data", "Mobile/battery constraints"],
    tradeoffs: ["Polling is simple but wasteful and laggy", "SSE is one-way server→client over HTTP, simple and proxy-friendly", "WebSockets are two-way and low-latency but need connection management at scale"],
    answer30: "For chat or collaborative editing I'd use WebSockets because both sides send frequently. For one-way live updates like order tracking, Server-Sent Events are simpler. Long polling is the fallback. At scale, connections live on gateway servers and a registry tracks which gateway holds each user.",
    checks: [
      q("Best fit for order-tracking updates sent only from server to client?", ["Short polling every 100 ms", "Server-Sent Events", "FTP", "Email"], 1, "One-way streaming over HTTP."),
      q("Chat with frequent messages both ways fits…", ["WebSockets", "Daily batch jobs", "SSE only", "DNS"], 0, "Both sides send often, so a full-duplex connection avoids polling delay."),
      q("At scale, how do you deliver to a user connected to another gateway?", ["Broadcast to all gateways always", "Look up which gateway holds their connection (registry/presence)", "Ask the client to poll", "Use a CDN"], 1, "Route via a connection registry."),
    ],
    cases: ["chat", "collab-editor", "food-delivery"],
  },
  {
    slug: "bloom-filters", title: "Bloom filters",
    when: ["Checking membership in a huge set cheaply", "Avoiding disk reads for keys that don't exist", "Seen-URL sets, username taken checks"],
    tradeoffs: ["Tiny memory, fast; false positives possible, false negatives never", "Can't delete (without counting variants)", "Size and hash count set the false-positive rate"],
    answer30: "A Bloom filter is a bit array with a few hash functions that tells you 'definitely not present' or 'probably present'. It's tiny, so it sits in memory in front of an expensive lookup: crawlers use one for seen URLs, and LSM stores use them to skip files that can't contain a key.",
    checks: [
      q("A Bloom filter can return…", ["False negatives", "False positives", "Exact counts", "Sorted results"], 1, "'Probably present' may be wrong; 'not present' is always right."),
      q("A common use is…", ["Encrypting passwords", "Skipping disk reads for keys that definitely aren't there", "Sorting data", "Load balancing"], 1, "Used by LSM stores and crawlers."),
      q("Deleting an item from a standard Bloom filter is…", ["Easy", "Not supported (bits are shared)", "Required", "Automatic"], 1, "Clearing bits could remove other items."),
    ],
    cases: ["web-crawler", "key-value-store"],
  },
  {
    slug: "observability", title: "Observability: metrics, logs, traces",
    when: ["Running anything in production", "Defining SLOs and alerts", "Debugging slow requests across services"],
    tradeoffs: ["Metrics are cheap and great for alerts; logs are detailed but costly at volume", "Tracing shows cross-service latency; needs propagation of context", "Alert on user-facing symptoms (SLOs), not every cause"],
    answer30: "I'd track the golden signals for each service — latency, traffic, errors and saturation — with dashboards and alerts on SLOs like p99 latency and error rate. Structured logs with request ids, and distributed traces, let me follow one slow request across services.",
    checks: [
      q("The four golden signals are…", ["CPU, RAM, disk, network", "Latency, traffic, errors, saturation", "Logs, traces, metrics, events", "Uptime only"], 1, "A standard starting set."),
      q("What should page someone at 3 a.m.?", ["Any log line with ERROR", "User-facing SLO breaches (e.g. error rate or p99 over target)", "CPU at 60%", "A deploy"], 1, "Alert on symptoms users feel."),
      q("Distributed tracing helps you…", ["Store files", "See where time goes across services for one request", "Encrypt traffic", "Scale databases"], 1, "Spans across services."),
    ],
    cases: ["notifications", "rate-limiter", "flash-sale"],
  },
  {
    slug: "auth", title: "Auth: sessions, JWT and OAuth",
    when: ["Signing users in", "Letting users log in with Google/GitHub", "Service-to-service calls"],
    tradeoffs: ["Server sessions are easy to revoke but need a shared store", "JWTs are stateless and fast to verify but hard to revoke; keep them short-lived", "OAuth/OIDC delegates login; never handle third-party passwords"],
    answer30: "For a web app I'd use secure, HTTP-only session cookies backed by a shared session store, or short-lived JWT access tokens with refresh tokens if many services need to verify identity without a lookup. 'Login with Google' is OAuth with OpenID Connect: we get a verified identity token, never the user's password.",
    checks: [
      q("A drawback of long-lived JWTs is…", ["They're slow to verify", "They're hard to revoke before expiry", "They need a database for every check", "They can't hold claims"], 1, "Keep them short-lived; use refresh tokens."),
      q("OAuth 'Login with Google' means your app…", ["Stores the user's Google password", "Receives a token/identity from Google instead of a password", "Can read all Google data", "Doesn't need HTTPS"], 1, "Delegated authentication."),
      q("Session cookies should be…", ["Readable by JavaScript", "HttpOnly, Secure and SameSite", "Stored in localStorage", "Sent over HTTP"], 1, "Protects against XSS theft and CSRF."),
    ],
    cases: ["notifications", "upi-payments"],
  },
  {
    slug: "api-design", title: "API design: pagination and versioning",
    when: ["Designing public or internal APIs", "Returning large lists", "Changing an API without breaking clients"],
    tradeoffs: ["Offset pagination is simple but slow and inconsistent on changing data", "Cursor pagination is stable and fast; no random page jumps", "Version in the URL or header; prefer additive, backward-compatible changes"],
    answer30: "I'd design resource-oriented endpoints with clear status codes, idempotency keys on unsafe operations, and cursor-based pagination for feeds so new items don't shift pages. Breaking changes get a new version; otherwise I only add optional fields so old clients keep working.",
    checks: [
      q("Why prefer cursor pagination for a feed?", ["It allows page numbers", "New items don't cause duplicates or skips, and it stays fast", "It's shorter", "It's required by REST"], 1, "The cursor marks a stable position."),
      q("A backward-compatible change is…", ["Renaming a field", "Adding an optional field", "Changing a field's type", "Removing an endpoint"], 1, "Old clients ignore new fields."),
      q("Which HTTP method should be idempotent by definition?", ["POST", "PUT", "PATCH always", "None"], 1, "PUT replaces state; repeating it has the same effect."),
    ],
    cases: ["news-feed", "url-shortener", "instagram"],
  },
];

export const PRIMER_BY_SLUG: Record<string, Primer> = Object.fromEntries(PRIMERS.map((p) => [p.slug, p]));
export const primerMeta = (p: Primer): ContentMeta => ({ id: contentId("primer", p.slug), version: p.version ?? 1, type: "primer", tags: ["system-design"], status: p.status ?? "draft" });

/** Check questions for the page: no answer key, options in a random display order. */
export function primerQuestions(p: Primer): { q: string; options: string[]; order: number[] }[] {
  const shuffle = (xs: number[]) => { for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };
  return p.checks.map((c) => ({ q: c.q, options: c.options, order: shuffle(c.options.map((_, i) => i)) }));
}
