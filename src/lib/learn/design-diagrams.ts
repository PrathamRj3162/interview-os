/**
 * Reference architecture diagrams for the system design lab. Data only — rendered as inline SVG by
 * components/learn/design-diagram.tsx. Nodes sit on a small grid (col, row); edges are directed.
 */
export type NodeKind = "client" | "edge" | "service" | "store" | "cache" | "queue" | "class";
export type DiagramNode = { id: string; label: string; col: number; row: number; kind: NodeKind };
export type DiagramEdge = { from: string; to: string; label?: string; dashed?: boolean };
export type Diagram = { caption: string; nodes: DiagramNode[]; edges: DiagramEdge[] };

const n = (id: string, label: string, col: number, row: number, kind: NodeKind): DiagramNode => ({ id, label, col, row, kind });
const e = (from: string, to: string, label?: string, dashed?: boolean): DiagramEdge => ({ from, to, label, dashed });

export const DESIGN_DIAGRAMS: Record<string, Diagram> = {
  "url-shortener": {
    caption: "Reads hit the cache first; analytics are written asynchronously so redirects stay fast.",
    nodes: [n("c", "Browser", 0, 1, "client"), n("lb", "Load balancer", 1, 1, "edge"), n("api", "API servers", 2, 1, "service"), n("kg", "Key-range allocator", 2, 0, "service"), n("cache", "Redis cache", 3, 0, "cache"), n("db", "Links store (sharded)", 3, 1, "store"), n("q", "Click queue", 2, 2, "queue"), n("agg", "Stats aggregator", 3, 2, "service")],
    edges: [e("c", "lb"), e("lb", "api"), e("api", "kg", "key ranges"), e("api", "cache", "lookup"), e("api", "db", "miss / create"), e("api", "q", "click", true), e("q", "agg")],
  },
  "rate-limiter": {
    caption: "Every API server asks a shared counter store before forwarding; rules are cached locally.",
    nodes: [n("c", "Client", 0, 1, "client"), n("gw", "API gateway + limiter", 1, 1, "edge"), n("rules", "Rules config", 1, 0, "store"), n("redis", "Redis counters", 2, 0, "cache"), n("svc", "Backend services", 2, 1, "service"), n("rej", "429 + Retry-After", 1, 2, "client")],
    edges: [e("c", "gw"), e("rules", "gw", "cached", true), e("gw", "redis", "INCR / bucket"), e("gw", "svc", "allowed"), e("gw", "rej", "over limit")],
  },
  "chat": {
    caption: "Persistent connections go through gateways; a router finds which gateway holds the recipient.",
    nodes: [n("a", "Sender", 0, 0, "client"), n("b", "Recipient", 0, 2, "client"), n("ws", "WebSocket gateways", 1, 1, "edge"), n("router", "Chat service", 2, 1, "service"), n("pres", "Presence (Redis)", 2, 0, "cache"), n("msgs", "Message store", 3, 1, "store"), n("push", "Push notifications", 2, 2, "queue")],
    edges: [e("a", "ws", "send"), e("ws", "router"), e("router", "pres", "who is online?"), e("router", "msgs", "persist"), e("router", "ws", "deliver", true), e("ws", "b"), e("router", "push", "offline")],
  },
  "news-feed": {
    caption: "Hybrid fan-out: push posts to followers' feeds, but pull celebrity posts at read time.",
    nodes: [n("u", "Client", 0, 1, "client"), n("api", "Feed API", 1, 1, "service"), n("post", "Post service", 1, 0, "service"), n("posts", "Posts DB", 2, 0, "store"), n("fan", "Fan-out workers", 2, 1, "queue"), n("graph", "Follow graph", 3, 1, "store"), n("feeds", "Feed cache (per user)", 2, 2, "cache")],
    edges: [e("u", "post", "new post"), e("post", "posts"), e("post", "fan", "event", true), e("fan", "graph", "followers"), e("fan", "feeds", "push ids"), e("u", "api", "read feed"), e("api", "feeds"), e("api", "posts", "celebrity pull")],
  },
  "notifications": {
    caption: "Producers enqueue; per-channel workers handle retries, preferences and provider limits.",
    nodes: [n("svc", "Product services", 0, 1, "service"), n("api", "Notify API", 1, 1, "service"), n("prefs", "User preferences", 1, 0, "store"), n("q", "Priority queues", 2, 1, "queue"), n("push", "Push worker", 3, 0, "service"), n("mail", "Email worker", 3, 1, "service"), n("sms", "SMS worker", 3, 2, "service"), n("log", "Delivery log", 2, 2, "store")],
    edges: [e("svc", "api"), e("api", "prefs", "opt-outs"), e("api", "q"), e("q", "push"), e("q", "mail"), e("q", "sms"), e("mail", "log", "status", true)],
  },
  "file-storage": {
    caption: "Files are split into content-addressed blocks; metadata and blocks scale separately.",
    nodes: [n("c", "Desktop / mobile client", 0, 1, "client"), n("meta", "Metadata service", 1, 0, "service"), n("mdb", "Metadata DB", 2, 0, "store"), n("blk", "Block upload service", 1, 2, "service"), n("obj", "Object storage", 2, 2, "store"), n("sync", "Sync notifier", 2, 1, "queue")],
    edges: [e("c", "meta", "file tree, versions"), e("meta", "mdb"), e("c", "blk", "changed blocks"), e("blk", "obj", "by hash"), e("meta", "sync", "change event"), e("sync", "c", "long-poll", true)],
  },
  "ride-matching": {
    caption: "Driver locations stream into a geo index; matching queries nearby cells and offers the trip.",
    nodes: [n("d", "Driver app", 0, 0, "client"), n("r", "Rider app", 0, 2, "client"), n("loc", "Location service", 1, 0, "service"), n("geo", "Geo index (cells)", 2, 0, "cache"), n("match", "Matching service", 2, 1, "service"), n("trip", "Trip service", 1, 2, "service"), n("tdb", "Trips DB", 2, 2, "store")],
    edges: [e("d", "loc", "GPS every 4s"), e("loc", "geo"), e("r", "trip", "request"), e("trip", "match"), e("match", "geo", "nearby"), e("match", "d", "offer", true), e("trip", "tdb")],
  },
  "kv-cache": {
    caption: "Clients hash keys onto a ring of nodes; each key is replicated to the next nodes on the ring.",
    nodes: [n("app", "App servers + client lib", 0, 1, "client"), n("ring", "Consistent-hash ring", 1, 1, "edge"), n("n1", "Cache node A", 2, 0, "cache"), n("n2", "Cache node B", 2, 1, "cache"), n("n3", "Cache node C", 2, 2, "cache"), n("db", "Database (source of truth)", 3, 1, "store"), n("cfg", "Membership / config", 1, 0, "service")],
    edges: [e("app", "ring", "hash(key)"), e("ring", "n2", "owner"), e("n2", "n3", "replicate", true), e("cfg", "ring", "node list", true), e("app", "db", "miss → load", true), e("n1", "n2", "gossip", true)],
  },
  "parking-lot": {
    caption: "The lot owns floors and spots; a pluggable strategy picks spots and another prices tickets.",
    nodes: [n("lot", "ParkingLot", 1, 0, "class"), n("floor", "Floor", 0, 1, "class"), n("spot", "Spot (size, free)", 0, 2, "class"), n("alloc", "SpotStrategy", 1, 1, "class"), n("ticket", "Ticket", 2, 1, "class"), n("fee", "FeeStrategy", 2, 2, "class"), n("veh", "Vehicle", 1, 2, "class")],
    edges: [e("lot", "floor", "has many"), e("floor", "spot", "has many"), e("lot", "alloc", "uses"), e("lot", "ticket", "issues"), e("ticket", "fee", "priced by"), e("ticket", "veh", "for"), e("ticket", "spot", "holds", true)],
  },
  "expense-splitter": {
    caption: "Expenses update a balance sheet; a split strategy decides shares and a simplifier settles up.",
    nodes: [n("group", "Group", 1, 0, "class"), n("user", "User", 0, 1, "class"), n("exp", "Expense", 1, 1, "class"), n("split", "SplitStrategy (equal / exact / %)", 2, 1, "class"), n("bal", "BalanceSheet", 1, 2, "class"), n("settle", "DebtSimplifier", 2, 2, "class")],
    edges: [e("group", "user", "members"), e("group", "exp", "has many"), e("exp", "split", "uses"), e("exp", "bal", "updates"), e("bal", "settle", "input to")],
  },
  "elevator": {
    caption: "A controller assigns requests to cars through a scheduling strategy; each car is a state machine.",
    nodes: [n("btn", "Hall / car buttons", 0, 1, "client"), n("ctl", "ElevatorController", 1, 1, "class"), n("sched", "SchedulingStrategy", 1, 0, "class"), n("car", "Elevator (car)", 2, 1, "class"), n("state", "State: Idle / Moving / DoorsOpen", 2, 2, "class"), n("disp", "Display / observers", 2, 0, "class")],
    edges: [e("btn", "ctl", "request"), e("ctl", "sched", "pick car"), e("ctl", "car", "assign stop"), e("car", "state", "transitions"), e("car", "disp", "notifies", true)],
  },
  "ticket-booking": {
    caption: "Seats are held with a short lock before payment; a confirmed booking converts holds into sales.",
    nodes: [n("user", "User", 0, 1, "client"), n("show", "Show (movie, screen, time)", 1, 0, "class"), n("seat", "ShowSeat (state)", 2, 0, "class"), n("book", "BookingService", 1, 1, "class"), n("lock", "SeatLock (TTL)", 2, 1, "class"), n("pay", "PaymentGateway", 1, 2, "class"), n("bk", "Booking", 2, 2, "class")],
    edges: [e("user", "book", "select seats"), e("book", "show", "lookup"), e("show", "seat", "has many"), e("book", "lock", "hold 10 min"), e("book", "pay", "charge"), e("pay", "bk", "on success"), e("bk", "seat", "mark sold", true)],
  },
  "unique-id-generator": {
    caption: "Each generator builds IDs from time + its leased worker id + a per-millisecond sequence, so no request needs a central lock.",
    nodes: [n("svc", "Calling services", 0, 1, "client"), n("lib", "ID generator (per host)", 1, 1, "service"), n("lease", "Worker-id leases (etcd)", 1, 0, "store"), n("ntp", "Clock / NTP monitor", 2, 0, "service"), n("db", "Callers' databases", 2, 1, "store")],
    edges: [e("svc", "lib", "next id"), e("lib", "lease", "lease worker id", true), e("ntp", "lib", "clock health", true), e("svc", "db", "rows keyed by id")],
  },
  "key-value-store": {
    caption: "Any node coordinates a request and writes to N replicas on the hash ring; quorums trade latency for consistency.",
    nodes: [n("cl", "Client", 0, 1, "client"), n("co", "Coordinator node", 1, 1, "service"), n("r1", "Replica A (WAL + LSM)", 2, 0, "store"), n("r2", "Replica B", 2, 1, "store"), n("r3", "Replica C", 2, 2, "store"), n("gos", "Gossip membership", 1, 0, "service"), n("ae", "Anti-entropy (Merkle)", 1, 2, "queue")],
    edges: [e("cl", "co", "get/put"), e("co", "r1", "W/R quorum"), e("co", "r2"), e("co", "r3", "hinted handoff", true), e("gos", "co", "ring + health", true), e("ae", "r3", "repair", true)],
  },
  "message-queue": {
    caption: "Topics are split into partitions stored as replicated append-only logs; consumer groups track their own offsets.",
    nodes: [n("p", "Producers", 0, 1, "client"), n("b1", "Broker: partition leader", 1, 1, "store"), n("b2", "Broker: follower", 1, 2, "store"), n("ctl", "Controller / metadata", 1, 0, "service"), n("g1", "Consumer group A", 2, 0, "client"), n("g2", "Consumer group B", 2, 2, "client"), n("off", "Committed offsets", 2, 1, "store")],
    edges: [e("p", "b1", "append (key → partition)"), e("b1", "b2", "replicate"), e("ctl", "b1", "leadership", true), e("b1", "g1", "poll"), e("b1", "g2", "poll"), e("g1", "off", "commit")],
  },
  "job-scheduler": {
    caption: "Schedulers claim due jobs with a lease so each slot fires once; workers execute from a queue and report back.",
    nodes: [n("api", "Job API", 0, 1, "service"), n("store", "Jobs (indexed by next_run_at)", 1, 1, "store"), n("sch", "Scheduler replicas", 1, 0, "service"), n("q", "Ready-run queue", 2, 0, "queue"), n("w", "Worker pool", 2, 1, "service"), n("runs", "Runs (unique job+slot)", 2, 2, "store")],
    edges: [e("api", "store", "create"), e("sch", "store", "claim due (lease)"), e("sch", "q", "enqueue run"), e("q", "w"), e("w", "runs", "status, attempts"), e("w", "q", "retry w/ backoff", true)],
  },
  typeahead: {
    caption: "Suggestions are served from an in-memory trie with precomputed top-k; query logs rebuild it offline.",
    nodes: [n("c", "Browser (debounced)", 0, 1, "client"), n("cdn", "CDN (short prefixes)", 1, 0, "edge"), n("sug", "Suggest service (trie shards)", 1, 1, "service"), n("log", "Query log stream", 2, 2, "queue"), n("agg", "Count aggregator", 2, 1, "service"), n("build", "Trie builder", 2, 0, "service")],
    edges: [e("c", "cdn"), e("c", "sug", "GET /suggest"), e("c", "log", "searches", true), e("log", "agg"), e("agg", "build", "top-k per prefix"), e("build", "sug", "swap new trie", true)],
  },
  "web-crawler": {
    caption: "A prioritised frontier with one queue per host keeps crawling polite; fetched pages are deduped before storage.",
    nodes: [n("seed", "Seeds / recrawl scheduler", 0, 0, "service"), n("fr", "URL frontier (per-host queues)", 0, 1, "queue"), n("f", "Fetchers (robots, DNS cache)", 1, 1, "service"), n("p", "Parser / link extractor", 2, 1, "service"), n("seen", "Seen-URL set (bloom)", 2, 0, "cache"), n("st", "Content store + hashes", 2, 2, "store")],
    edges: [e("seed", "fr"), e("fr", "f", "polite rate"), e("f", "p", "HTML"), e("p", "seen", "new?"), e("seen", "fr", "enqueue new URLs", true), e("p", "st", "store if not duplicate")],
  },
  instagram: {
    caption: "Media goes straight to object storage and the CDN; posts fan out to followers' feed caches (pull for celebrities).",
    nodes: [n("app", "Mobile app", 0, 1, "client"), n("obj", "Object storage", 1, 0, "store"), n("cdn", "CDN", 0, 0, "edge"), n("proc", "Media processing", 2, 0, "queue"), n("post", "Post service", 1, 1, "service"), n("fan", "Fan-out workers", 2, 1, "queue"), n("feed", "Feed cache", 1, 2, "cache"), n("graph", "Follow graph", 2, 2, "store")],
    edges: [e("app", "obj", "signed upload"), e("obj", "proc", "resize", true), e("app", "post", "create post"), e("post", "fan", "new post", true), e("fan", "graph", "followers"), e("fan", "feed", "push ids"), e("app", "feed", "read feed"), e("cdn", "app", "images")],
  },
  "collab-editor": {
    caption: "Each active document is owned by one server that orders operations; clients get transformed ops, and the log is snapshotted.",
    nodes: [n("a", "Editor A", 0, 0, "client"), n("b", "Editor B", 0, 2, "client"), n("gw", "WebSocket gateway (sticky by doc)", 1, 1, "edge"), n("doc", "Doc session (OT/CRDT)", 2, 1, "service"), n("log", "Op log", 3, 1, "store"), n("snap", "Snapshots", 3, 2, "store"), n("pres", "Presence (cursors)", 2, 0, "cache")],
    edges: [e("a", "gw", "ops"), e("b", "gw", "ops"), e("gw", "doc"), e("doc", "log", "append"), e("log", "snap", "periodic", true), e("doc", "pres"), e("doc", "gw", "transformed ops", true)],
  },
  youtube: {
    caption: "Uploads are transcoded into adaptive-bitrate segments; players fetch manifests and segments from the CDN.",
    nodes: [n("cr", "Creator", 0, 0, "client"), n("up", "Resumable upload", 1, 0, "service"), n("raw", "Raw video storage", 2, 0, "store"), n("tq", "Transcode queue", 2, 1, "queue"), n("tw", "Transcoders", 3, 1, "service"), n("seg", "Segments + manifests", 3, 2, "store"), n("cdn", "CDN", 2, 2, "edge"), n("v", "Viewer", 1, 2, "client")],
    edges: [e("cr", "up"), e("up", "raw"), e("raw", "tq", "new video", true), e("tq", "tw"), e("tw", "seg", "renditions"), e("seg", "cdn"), e("v", "cdn", "manifest + segments")],
  },
  "upi-payments": {
    caption: "Every payment carries an idempotency key, moves through a state machine and lands in an append-only ledger reconciled with banks.",
    nodes: [n("app", "Payer app", 0, 1, "client"), n("api", "Payment API (idempotency)", 1, 1, "service"), n("orch", "Payment orchestrator", 2, 1, "service"), n("bank", "Bank / switch connector", 3, 1, "edge"), n("led", "Double-entry ledger", 2, 2, "store"), n("rec", "Reconciliation jobs", 3, 2, "queue"), n("st", "Payments (state)", 2, 0, "store")],
    edges: [e("app", "api", "pay"), e("api", "orch"), e("orch", "st", "state transitions"), e("orch", "bank", "debit/credit"), e("orch", "led", "entries"), e("rec", "led", "match", true), e("rec", "bank", "statements", true)],
  },
  "flash-sale": {
    caption: "A waiting room shapes the spike; stock is decremented atomically, and unpaid reservations expire back into stock.",
    nodes: [n("u", "Shoppers", 0, 1, "client"), n("edge", "CDN + waiting room", 1, 1, "edge"), n("rl", "Rate limit / bot check", 1, 0, "service"), n("res", "Reservation service", 2, 1, "service"), n("inv", "Inventory counter (atomic)", 3, 1, "cache"), n("exp", "Expiry worker", 3, 2, "queue"), n("pay", "Order + payment", 2, 2, "service")],
    edges: [e("u", "edge"), e("edge", "rl"), e("rl", "res", "admitted"), e("res", "inv", "DECR if > 0"), e("res", "pay", "pay within 10 min"), e("exp", "inv", "release unpaid", true)],
  },
  "food-delivery": {
    caption: "An order state machine drives restaurant and dispatch steps; partner locations feed a geo index for assignment and live ETA.",
    nodes: [n("cu", "Customer app", 0, 1, "client"), n("ord", "Order service (state machine)", 1, 1, "service"), n("rest", "Restaurant app", 1, 0, "client"), n("disp", "Dispatch service", 2, 1, "service"), n("geo", "Partner geo index", 3, 1, "cache"), n("loc", "Location ingest", 3, 0, "queue"), n("eta", "ETA service", 2, 2, "service"), n("dp", "Partner app", 3, 2, "client")],
    edges: [e("cu", "ord", "place (idempotent)"), e("ord", "rest", "accept?"), e("ord", "disp", "assign"), e("disp", "geo", "nearby"), e("dp", "loc", "GPS"), e("loc", "geo"), e("disp", "dp", "offer", true), e("eta", "cu", "live ETA", true)],
  },
};

if (process.env.E2E_FIXTURES === "1") DESIGN_DIAGRAMS["e2e-fixture"] = DESIGN_DIAGRAMS["url-shortener"];
