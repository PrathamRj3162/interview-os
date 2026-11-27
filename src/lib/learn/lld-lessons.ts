/**
 * LLD lab lessons, written for Interview OS: SOLID with before/after Java, 10 design patterns with "when an interviewer
 * expects it", class-diagram basics and a Java concurrency primer. Shipped as draft until approved on /review.
 */
import { contentId, type ContentMeta, type ContentStatus } from "@/lib/content/types";

export type LldLesson = {
  slug: string; title: string; group: "principles" | "patterns" | "concurrency"; version?: number; status?: ContentStatus;
  summary: string;
  /** When an interviewer expects to see it. */
  expect: string[];
  sections: { heading: string; text: string[]; before?: string; after?: string; code?: string }[];
  pitfalls: string[];
  cases: string[];
};

export const LLD_LESSONS: LldLesson[] = [
  {
    slug: "solid", title: "SOLID, with before-and-after Java", group: "principles",
    summary: "Five principles that keep classes small, replaceable and easy to extend — the vocabulary every LLD interviewer uses.",
    expect: ["Whenever you justify splitting a class", "When the interviewer adds a requirement and asks what changes", "When you introduce an interface"],
    sections: [
      { heading: "S — Single responsibility", text: ["A class should have one reason to change. Parsing input, applying rules and printing output are three reasons."],
        before: "class Billing {\n  void handle(String line) {\n    String[] p = line.split(\" \");      // parsing\n    double fee = p[0].equals(\"CAR\") ? 20 : 10; // rules\n    System.out.println(\"FEE \" + fee);   // output\n  }\n}",
        after: "class CommandParser { Command parse(String line) { /* … */ } }\nclass FeeCalculator { int fee(VehicleType t, int hours) { /* … */ } }\nclass ConsolePrinter { void print(String s) { System.out.println(s); } }" },
      { heading: "O — Open/closed", text: ["Open for extension, closed for modification: a new split type should be a new class, not another branch in an if-chain."],
        before: "long[] split(String type, long amount, int n) {\n  if (type.equals(\"EQUAL\")) { /* … */ }\n  else if (type.equals(\"EXACT\")) { /* … */ }\n  // every new type edits this method\n}",
        after: "interface SplitStrategy { long[] shares(long amount, int n, List<String> args); }\nclass EqualSplit implements SplitStrategy { /* … */ }\nclass PercentSplit implements SplitStrategy { /* … */ } // added without touching the others" },
      { heading: "L — Liskov substitution", text: ["A subtype must work wherever its parent is expected. If Square extends Rectangle and setWidth also changes the height, code written for Rectangle breaks."],
        before: "class Bird { void fly() { } }\nclass Penguin extends Bird { void fly() { throw new UnsupportedOperationException(); } }",
        after: "interface Bird { }\ninterface FlyingBird extends Bird { void fly(); }\nclass Sparrow implements FlyingBird { public void fly() { } }\nclass Penguin implements Bird { }" },
      { heading: "I — Interface segregation", text: ["Clients shouldn't depend on methods they don't use. Split fat interfaces into role interfaces."],
        before: "interface Machine { void print(); void scan(); void fax(); }\nclass SimplePrinter implements Machine { public void scan() { throw new UnsupportedOperationException(); } /* … */ }",
        after: "interface Printer { void print(); }\ninterface Scanner { void scan(); }\nclass SimplePrinter implements Printer { public void print() { } }" },
      { heading: "D — Dependency inversion", text: ["High-level policy depends on abstractions, and the concrete pieces are passed in. That's what makes code testable: tests pass in a fake clock or a fake payment gateway."],
        before: "class BookingService {\n  private final RazorpayClient pay = new RazorpayClient(); // fixed, untestable\n}",
        after: "interface PaymentGateway { boolean charge(String user, long paise); }\nclass BookingService {\n  private final PaymentGateway pay;\n  BookingService(PaymentGateway pay) { this.pay = pay; } // injected\n}" },
    ],
    pitfalls: ["Reciting the acronym without pointing at your own classes", "Creating an interface for every class 'for SOLID' — add one where variation is real", "Confusing dependency inversion with dependency injection frameworks"],
    cases: ["parking-lot", "expense-splitter"],
  },
  {
    slug: "class-diagrams", title: "Class-diagram basics", group: "principles",
    summary: "Enough UML to sketch a design quickly and talk about relationships precisely.",
    expect: ["At the start of every LLD round, after requirements", "When asked 'how do these classes relate?'"],
    sections: [
      { heading: "Is-a vs has-a", text: ["Inheritance (is-a) is for true substitutability. Composition (has-a) is the default: a ParkingLot has Floors, a Floor has Spots. Prefer composition; it is easier to change."] },
      { heading: "Association, aggregation, composition", text: ["Association: one class uses another. Aggregation: a whole holds parts that can exist alone (a Team and its Players). Composition: parts live and die with the whole (an Order and its OrderLines)."] },
      { heading: "Multiplicity", text: ["Write 1, 0..1, 1..* or * at each end: a Show has 1..* ShowSeats; a Booking has 1..* ShowSeats; a ShowSeat is in 0..1 active Booking."] },
      { heading: "Interfaces and abstract classes", text: ["Interfaces describe a role (PaymentGateway, SplitStrategy). Abstract classes share code between closely related types. In an interview, draw interfaces where behaviour varies."] },
    ],
    pitfalls: ["Drawing every getter and setter", "Using inheritance for code reuse between unrelated things", "Skipping multiplicities — they reveal the data model"],
    cases: ["parking-lot", "ticket-booking"],
  },
  ...([
    ["strategy", "Strategy", "Swap an algorithm behind one interface (pricing, split types, eviction policies, matching rules).", ["Several ways to do one thing, chosen at run time or added later", "The interviewer says 'now add another way to…'"], "interface PricingStrategy { long price(Ticket t, int hours); }\nclass HourlyPricing implements PricingStrategy { public long price(Ticket t, int h) { return t.rate() * h; } }\nclass FlatPricing implements PricingStrategy { public long price(Ticket t, int h) { return 100; } }\n// ParkingLot holds a PricingStrategy and can be given a new one", ["parking-lot", "expense-splitter", "lru-cache"]],
    ["factory", "Factory", "Centralise creating the right object from input (a command name, a vehicle type, a split type).", ["Creation depends on input or configuration", "You want callers not to know the concrete classes"], "class VehicleFactory {\n  static Vehicle of(String type, String reg) {\n    return switch (type) { case \"CAR\" -> new Car(reg); case \"BIKE\" -> new Bike(reg); default -> throw new IllegalArgumentException(\"type\"); };\n  }\n}", ["parking-lot", "food-ordering"]],
    ["observer", "Observer", "Notify many listeners when something happens, without the source knowing who they are.", ["Events with several consumers (notifications, displays, analytics)", "Pub-sub style requirements"], "interface BookingListener { void onBooked(Booking b); }\nclass BookingService {\n  private final List<BookingListener> listeners = new CopyOnWriteArrayList<>();\n  void subscribe(BookingListener l) { listeners.add(l); }\n  void book(Booking b) { /* … */ listeners.forEach(l -> l.onBooked(b)); }\n}", ["pub-sub", "elevator", "notifications"]],
    ["state", "State", "Model an object whose behaviour changes with its state, replacing big switch statements on a status field.", ["Vending machines, elevators, orders, document workflows", "The interviewer asks 'what if a coin is inserted while dispensing?'"], "interface VendingState { void insert(Machine m, int coin); void select(Machine m, String code); }\nclass Idle implements VendingState { /* … */ }\nclass HasMoney implements VendingState { /* … */ }\nclass Machine { VendingState state = new Idle(); void insert(int c) { state.insert(this, c); } }", ["vending-machine", "elevator", "atm"]],
    ["singleton", "Singleton", "Exactly one instance (a configuration or a registry). Usually better as one instance passed in.", ["A process-wide resource genuinely must be unique", "Asked about thread-safe initialisation"], "enum Config { INSTANCE; final Map<String, String> values = new ConcurrentHashMap<>(); }\n// Simple, thread-safe, serialisation-safe. In LLD answers prefer constructing once and injecting.", ["logger-library", "kv-transactions"]],
    ["builder", "Builder", "Construct objects with many optional parts readably, and validate once at the end.", ["Objects with many optional fields (a search query, an HTTP request, a notification)", "Immutable objects"], "Notification n = Notification.builder().to(user).channel(EMAIL).subject(\"Booked\").priority(HIGH).build();\n// build() validates required fields and returns an immutable object", ["notifications", "meeting-rooms"]],
    ["decorator", "Decorator", "Add behaviour by wrapping an object with the same interface (logging, caching, retries, toppings).", ["Optional add-ons that combine freely", "Cross-cutting behaviour around a core service"], "interface Coffee { int cost(); }\nclass Milk implements Coffee { private final Coffee c; Milk(Coffee c) { this.c = c; } public int cost() { return c.cost() + 20; } }\n// new Milk(new Sugar(new Espresso()))", ["rate-limiter", "logger-library"]],
    ["adapter", "Adapter", "Make an existing class fit an interface you need (wrapping a third-party payment SDK).", ["Integrating external services behind your own interface", "Supporting several providers with different APIs"], "class StripeAdapter implements PaymentGateway {\n  private final StripeClient client;\n  public boolean charge(String user, long paise) { return client.createCharge(paise, \"INR\", user).succeeded(); }\n}", ["ticket-booking", "food-ordering"]],
    ["command", "Command", "Turn a request into an object so it can be queued, logged, undone or replayed.", ["Undo/redo", "Command-line apps that dispatch on a command word", "Task queues"], "interface Command { void execute(); default void undo() { } }\nclass MoveCommand implements Command { /* … */ }\n// Map<String, Function<String[], Command>> parsers = Map.of(\"MOVE\", MoveCommand::parse, …)", ["tic-tac-toe", "kv-transactions", "task-scheduler"]],
    ["chain-of-responsibility", "Chain of responsibility", "Pass a request along handlers until one handles it (validation pipelines, escalation, ATM note dispensing).", ["A sequence of checks or handlers that may stop early", "Escalation levels in support systems"], "abstract class Handler { Handler next; Handler then(Handler n) { next = n; return n; }\n  void handle(Request r) { if (next != null) next.handle(r); } }\nclass AuthCheck extends Handler { /* … */ } class RateCheck extends Handler { /* … */ }", ["issue-resolution", "atm"]],
  ] as [string, string, string, string[], string, string[]][]).map(([slug, title, summary, expect, code, cases]) => ({
    slug, title: `${title} pattern`, group: "patterns" as const, summary, expect,
    sections: [{ heading: "Sketch in Java", text: [summary], code }],
    pitfalls: [`Using ${title} where a plain method or a simple if would do`, "Naming the pattern without explaining the change it makes easy"],
    cases,
  })),
  {
    slug: "java-concurrency", title: "Java concurrency for LLD and machine coding", group: "concurrency",
    summary: "What to say and write when the interviewer asks 'what if two users book the same seat at the same time?'",
    expect: ["Booking, inventory, wallets, rate limiters, caches, pub-sub", "Any shared mutable state touched by several requests"],
    sections: [
      { heading: "Find the shared mutable state first", text: ["List the data several requests can change at once (seat states, balances, counters). Everything else needs no locking. Immutable objects and confinement to one thread are the cheapest safety."] },
      { heading: "synchronized vs ReentrantLock", text: ["synchronized is simple and released automatically. ReentrantLock adds tryLock with a timeout, fairness and multiple conditions. Keep critical sections small, and always lock in the same order to avoid deadlocks."],
        code: "private final ReentrantLock lock = new ReentrantLock();\nvoid hold(List<String> seats) {\n  lock.lock();\n  try { /* check all seats free, then mark them held */ }\n  finally { lock.unlock(); }\n}" },
      { heading: "Concurrent collections and atomics", text: ["ConcurrentHashMap (computeIfAbsent, merge are atomic per key), AtomicInteger/AtomicLong for counters, CopyOnWriteArrayList for rarely changing listener lists, BlockingQueue for producer-consumer."],
        code: "ConcurrentHashMap<String, AtomicInteger> counts = new ConcurrentHashMap<>();\ncounts.computeIfAbsent(client, k -> new AtomicInteger()).incrementAndGet();" },
      { heading: "Producer-consumer and executors", text: ["Use an ExecutorService instead of raw threads; a BlockingQueue between producers and consumers gives backpressure for free."],
        code: "BlockingQueue<Task> q = new LinkedBlockingQueue<>(1000);\nExecutorService workers = Executors.newFixedThreadPool(4);\nfor (int i = 0; i < 4; i++) workers.submit(() -> { while (true) q.take().run(); });" },
      { heading: "Optimistic vs pessimistic locking", text: ["Pessimistic: lock the row/seat before changing it (simple, can block under contention). Optimistic: keep a version number and update only if it hasn't changed (UPDATE … WHERE version = ?), retrying on conflict — better when conflicts are rare."] },
    ],
    pitfalls: ["Check-then-act without a lock (two holds both see the seat free)", "Locking a whole service when one key would do", "Holding a lock while calling a slow external service"],
    cases: ["ticket-booking", "rate-limiter", "kv-transactions"],
  },
];

export const LLD_LESSON_BY_SLUG: Record<string, LldLesson> = Object.fromEntries(LLD_LESSONS.map((l) => [l.slug, l]));
export const lldLessonMeta = (l: LldLesson): ContentMeta => ({ id: contentId("lld-lesson", l.slug), version: l.version ?? 1, type: "lld-lesson", tags: ["lld", l.group], status: l.status ?? "draft" });
