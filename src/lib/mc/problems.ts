/**
 * Machine coding problems, written for Interview OS (original statements modelled on commonly reported themes;
 * never copied). Client-safe: hidden tests and expected outputs live in ./tests (server-only), and Java reference
 * implementations in /mc-refs (used by CI to generate and check expected outputs).
 * Every problem is a command-line app: each input line is one command; only the listed outputs are printed.
 * Extensions only add commands or optional arguments, so the core behaviour never changes after the reveal.
 */
import type { McProblem } from "./types";

export const MC_PROBLEMS: McProblem[] = [
  {
    slug: "splitwise", title: "Expense sharing app", level: "Intermediate", status: "draft", concurrency: false, lldCase: "expense-splitter",
    statement: ["Build an in-memory app where friends record shared expenses and see who owes whom.", "Amounts are in rupees with up to two decimals; store money as integer paise. When an amount doesn't split evenly, the first listed person takes the extra paise."],
    io: [
      "USER <id> — add a user (ids are single words). Prints nothing.",
      "EXPENSE <paidBy> <amount> <n> <u1> … <un> EQUAL — split equally among the n users.",
      "EXPENSE <paidBy> <amount> <n> <u1> … <un> EXACT <a1> … <an> — exact shares; they must add up to the amount.",
      "SHOW — one line per pair with a non-zero net balance: \"<debtor> owes <creditor>: <amount>\" (two decimals), sorted by debtor then creditor; or \"No balances\".",
      "SHOW <user> — the same lines, only those involving that user; or \"No balances\".",
      "Errors print one line: \"ERROR unknown user <id>\", \"ERROR invalid amount\", \"ERROR amounts do not add up\".",
    ],
    core: ["Users, equal and exact expenses", "Pairwise net balances (A owes B and B owes A cancel out)", "SHOW and SHOW <user> in the required order", "Input validation with the listed errors"],
    bonus: ["Keep an expense history per user", "Design so a new split type needs no changes to existing ones"],
    extension: { title: "Percentage splits", text: ["Support splitting by percentages."], io: ["EXPENSE <paidBy> <amount> <n> <u1> … <un> PERCENT <p1> … <pn> — percentages must add up to 100; otherwise \"ERROR percents do not add up to 100\". Shares are rounded down to the paise and the first listed person takes any remainder."] },
    sample: { input: "USER a\nUSER b\nUSER c\nEXPENSE a 300 3 a b c EQUAL\nSHOW\nEXPENSE b 100 2 a b EXACT 70 30\nSHOW a", output: "b owes a: 100.00\nc owes a: 100.00\nb owes a: 30.00\nc owes a: 100.00" },
  },
  {
    slug: "parking-lot", title: "Parking lot", level: "Starter", status: "draft", concurrency: false, lldCase: "parking-lot",
    statement: ["Build a parking lot with several floors. On every floor, slot 1 is for trucks, slots 2–3 are for bikes and every other slot is for cars.", "A vehicle gets the lowest-numbered free slot of its type on the lowest floor."],
    io: [
      "CREATE <floors> <slotsPerFloor> — prints \"Created <floors> floors with <slotsPerFloor> slots each\".",
      "PARK <CAR|BIKE|TRUCK> <registration> — prints \"TICKET F<floor>-S<slot>\" or \"FULL\".",
      "UNPARK <ticket> — prints \"Unparked <registration>\" or \"ERROR invalid ticket\".",
      "FREE <type> — one line per floor: \"F<floor>: <n> free\".",
      "Any command before CREATE prints \"ERROR no lot\". An unknown vehicle type prints \"ERROR invalid type\".",
    ],
    core: ["Slot allocation rules", "Tickets and unparking", "Free counts per floor", "Validation"],
    bonus: ["Find a vehicle's ticket by registration", "Keep allocation as a swappable strategy"],
    extension: { title: "Hourly pricing", text: ["Charge on exit. Rates per started hour: BIKE 10, CAR 20, TRUCK 50."], io: ["UNPARK <ticket> <hours> — prints \"Unparked <registration>\" then \"FEE <amount>\" where amount = rate × hours (hours ≥ 1; otherwise \"ERROR invalid hours\" and the vehicle stays parked)."] },
    sample: { input: "CREATE 1 4\nPARK CAR KA01\nPARK BIKE KA02\nPARK CAR KA03\nFREE CAR\nUNPARK F1-S4", output: "Created 1 floors with 4 slots each\nTICKET F1-S4\nTICKET F1-S2\nFULL\nF1: 0 free\nUnparked KA01" },
  },
  {
    slug: "snake-ladder", title: "Snakes and ladders", level: "Starter", status: "draft", concurrency: false,
    statement: ["Simulate a snakes-and-ladders game. Dice rolls are given as input so games are reproducible.", "Players take turns in the order they were added. A move that would go past the last square doesn't happen (the player stays)."],
    io: [
      "BOARD <size> — new board with squares 1..size; players start at 0.",
      "SNAKE <head> <tail> and LADDER <bottom> <top> — prints nothing; a snake must go down and a ladder up, otherwise \"ERROR invalid snake\" / \"ERROR invalid ladder\".",
      "PLAYER <name> — add a player.",
      "ROLL <1-6> — the current player moves: \"<name> rolled <d> and moved from <a> to <b>\"; then, if they landed on one, \" — snake to <x>\" or \" — ladder to <x>\" is appended. If they reach the last square, a second line \"<name> wins\". Rolls after a win print \"ERROR game over\".",
    ],
    core: ["Board, snakes, ladders, players", "Turn order and movement", "Overshoot rule and winning", "Validation"],
    bonus: ["Snakes/ladders that chain (a ladder ending at a snake head)", "Multiple dice"],
    extension: { title: "Six rule", text: ["Rolling a 6 gives the same player another roll. Three sixes in a row cancel the whole turn: the player goes back to where the turn started."], io: ["Add \"RULE SIX\" (after BOARD) to enable it for that game. After a 6, the same player rolls next. On the third 6 in a row print \"<name> rolled three sixes — turn cancelled\" (and no move line), and play passes to the next player."] },
    sample: { input: "BOARD 20\nLADDER 3 15\nSNAKE 18 2\nPLAYER Ana\nPLAYER Bo\nROLL 3\nROLL 5\nROLL 3\nROLL 2", output: "Ana rolled 3 and moved from 0 to 3 — ladder to 15\nBo rolled 5 and moved from 0 to 5\nAna rolled 3 and moved from 15 to 18 — snake to 2\nBo rolled 2 and moved from 5 to 7" },
  },
  {
    slug: "tic-tac-toe", title: "Tic-tac-toe engine", level: "Starter", status: "draft", concurrency: false,
    statement: ["Build a tic-tac-toe game for two players on an N×N board (rows and columns are 1-based)."],
    io: [
      "NEW <n> — new n×n game; X moves first.",
      "PLAYER <X|O> <name>.",
      "MOVE <row> <col> — the current player places their mark: prints \"<name> placed <mark> at <row> <col>\"; then \"<name> won\" if they completed a full row, column or diagonal, or \"Game drawn\" if the board is full. Invalid moves print \"ERROR invalid move\" and the same player moves again. Moves after the game ends print \"ERROR game over\".",
      "PRINT — the board, one line per row, \"-\" for empty cells, no spaces.",
    ],
    core: ["Board and players", "Win and draw detection", "Turn order and invalid moves", "PRINT"],
    bonus: ["Undo the last move", "O(1) win check per move"],
    extension: { title: "K in a row", text: ["Allow a win with K marks in a row (horizontally, vertically or diagonally) on a bigger board."], io: ["NEW <n> <k> — a player wins with k in a row (k ≤ n); NEW <n> keeps k = n."] },
    sample: { input: "NEW 3\nPLAYER X Ana\nPLAYER O Bo\nMOVE 1 1\nMOVE 2 2\nMOVE 1 2\nMOVE 3 3\nMOVE 1 3\nPRINT", output: "Ana placed X at 1 1\nBo placed O at 2 2\nAna placed X at 1 2\nBo placed O at 3 3\nAna placed X at 1 3\nAna won\nXXX\n-O-\n--O" },
  },
  {
    slug: "movie-booking", title: "Movie ticket booking", level: "Advanced", status: "draft", concurrency: true, lldCase: "ticket-booking",
    statement: ["Build seat booking for shows. A user first holds seats, then confirms within 10 minutes; expired holds release their seats.", "Seats are named row letter + number (A1, A2, …, B1…). Time is advanced explicitly with TICK. In the review, expect questions about two users booking the same seat at the same moment."],
    io: [
      "SHOW <showId> <rows> <cols> — create a show (rows ≤ 26).",
      "HOLD <user> <showId> <seat> [<seat>…] — all or nothing: prints \"HOLD <holdId>\" (H1, H2, …) or \"ERROR seat <seat> unavailable\" for the first seat that is held, booked or doesn't exist.",
      "CONFIRM <holdId> — prints \"BOOKED <bookingId> <seats comma-separated>\" (B1, B2, …) or \"ERROR hold expired\" / \"ERROR unknown hold\".",
      "RELEASE <holdId> — frees the seats silently.",
      "TICK <minutes> — advance time; holds older than 10 minutes expire.",
      "AVAILABLE <showId> — prints the number of free seats.",
    ],
    core: ["Holds are all-or-nothing", "Confirm and expiry", "Availability", "No seat is ever held or booked twice"],
    bonus: ["Cancel a booking", "Explain (in the review) how you'd make HOLD safe under concurrent requests"],
    extension: { title: "Row pricing", text: ["Rows can have different prices (default 150)."], io: ["PRICE <showId> <row> <amount> — set a row's price.", "Once any PRICE command has been given, CONFIRM prints a second line \"TOTAL <sum>\" (row price × seats; rows without a price cost 150)."] },
    sample: { input: "SHOW s1 2 3\nHOLD ana s1 A1 A2\nHOLD bo s1 A2\nCONFIRM H1\nAVAILABLE s1", output: "HOLD H1\nERROR seat A2 unavailable\nBOOKED B1 A1,A2\n4" },
  },
  {
    slug: "cab-booking", title: "Cab booking", level: "Intermediate", status: "draft", concurrency: false,
    statement: ["Match riders with the nearest available driver on a grid. Distances are Euclidean; only drivers within 5 units can be matched; ties go to the lexicographically smaller driver id."],
    io: [
      "DRIVER <id> <x> <y> — add an available driver.",
      "RIDER <id> <x> <y> — add a rider (or update their location).",
      "BOOK <riderId> <destX> <destY> — prints \"RIDE <rideId> <driverId>\" (R1, R2, …) or \"NO_DRIVER\".",
      "END <rideId> — the ride ends at its destination; the driver moves there and is available again; prints \"FARE <amount>\" = 10 × distance from pickup to destination, two decimals.",
      "HISTORY <riderId> — one line per finished ride: \"<rideId> <driverId> <fare>\", or \"No rides\".",
    ],
    core: ["Nearest-driver matching with the radius and tie rule", "Ride lifecycle and fares", "History"],
    bonus: ["Driver ratings", "Cancel a ride before it ends"],
    extension: { title: "Surge pricing", text: ["Fares can be multiplied during busy times."], io: ["SURGE <multiplier> — applies to rides booked after this command (fare uses the multiplier active at booking time)."] },
    sample: { input: "DRIVER d1 0 0\nDRIVER d2 3 4\nRIDER r1 3 3\nBOOK r1 6 7\nEND R1\nHISTORY r1", output: "RIDE R1 d2\nFARE 50.00\nR1 d2 50.00" },
  },
  {
    slug: "food-ordering", title: "Food ordering", level: "Intermediate", status: "draft", concurrency: false,
    statement: ["Route orders to restaurants. A restaurant can prepare a limited number of orders at once; an order frees capacity when it's delivered."],
    io: [
      "RESTAURANT <id> <capacity> <rating> — rating is a number like 4.2.",
      "MENU <restaurantId> <item> <price> — add or update an item's price.",
      "ORDER <user> <item> <qty> — choose the restaurant with spare capacity and the lowest price for the item (ties: higher rating, then smaller id); prints \"ORDER <orderId> <restaurantId> <total>\" (O1, O2, …; total = price × qty) or \"NO_RESTAURANT\".",
      "DELIVERED <orderId> — frees capacity; prints nothing, or \"ERROR unknown order\".",
    ],
    core: ["Restaurants, menus, capacity", "Selection rule and ties", "Order lifecycle"],
    bonus: ["Orders with several items (all from one restaurant)", "Order history per user"],
    extension: { title: "Selection strategies", text: ["Let operations switch how restaurants are chosen."], io: ["STRATEGY <PRICE|RATING> — PRICE is the default; RATING picks the highest-rated restaurant with spare capacity that serves the item (ties: lower price, then smaller id). Applies to later orders."] },
    sample: { input: "RESTAURANT r1 1 4.5\nRESTAURANT r2 2 3.9\nMENU r1 dosa 80\nMENU r2 dosa 70\nORDER u1 dosa 2\nORDER u2 dosa 1\nORDER u3 dosa 1", output: "ORDER O1 r2 140\nORDER O2 r2 70\nORDER O3 r1 80" },
  },
  {
    slug: "issue-resolution", title: "Customer issue resolution", level: "Intermediate", status: "draft", concurrency: false,
    statement: ["Assign customer issues to support agents by expertise. An agent works on one issue at a time; others wait in a first-come queue."],
    io: [
      "AGENT <id> <type> [<type>…] — an agent and the issue types they handle.",
      "ISSUE <issueId> <type> — assign to the free agent with that expertise and the smallest id: \"ASSIGNED <issueId> <agentId>\"; if none is free: \"WAITING <issueId>\".",
      "RESOLVE <issueId> — prints \"RESOLVED <issueId>\"; the agent then takes the oldest waiting issue they can handle, printing its ASSIGNED line. Unknown or unassigned issues print \"ERROR cannot resolve <issueId>\".",
      "HISTORY <agentId> — the issues they resolved, comma-separated, or \"None\".",
    ],
    core: ["Expertise-based assignment", "Waiting queue (oldest first)", "Resolution and history"],
    bonus: ["Issue priorities", "Search issues by customer"],
    extension: { title: "Agent leave", text: ["Agents can go on leave."], io: ["LEAVE <agentId> — the agent stops taking issues. Their current issue (if any) is reassigned like a new issue but keeps its place at the front of the queue if nobody is free: prints its ASSIGNED or WAITING line."] },
    sample: { input: "AGENT a1 payment\nAGENT a2 payment delivery\nISSUE i1 payment\nISSUE i2 payment\nISSUE i3 payment\nRESOLVE i1\nHISTORY a1", output: "ASSIGNED i1 a1\nASSIGNED i2 a2\nWAITING i3\nRESOLVED i1\nASSIGNED i3 a1\ni1" },
  },
  {
    slug: "pub-sub", title: "In-memory pub-sub", level: "Intermediate", status: "draft", concurrency: true,
    statement: ["Build a topic-based publish/subscribe system. Delivery here is synchronous and printed, but design it so delivery could run on worker threads (the review will ask)."],
    io: [
      "TOPIC <name>.",
      "SUBSCRIBE <subscriber> <topic> — prints nothing; duplicates are ignored.",
      "UNSUBSCRIBE <subscriber> <topic>.",
      "PUBLISH <topic> <message> — each subscriber, in the order they subscribed, prints \"<subscriber> <- <message>\"; a topic with no subscribers prints \"(no subscribers)\". Unknown topics print \"ERROR unknown topic <name>\".",
    ],
    core: ["Topics and subscriptions", "Ordered delivery", "Unsubscribe and errors"],
    bonus: ["Message filters per subscriber", "Delivery on worker threads with per-subscriber ordering"],
    extension: { title: "Replay", text: ["Messages are kept per topic with offsets starting at 0."], io: ["REPLAY <subscriber> <topic> <offset> — prints \"<subscriber> <- <message>\" for every message from that offset on; an offset past the end prints \"(nothing to replay)\"."] },
    sample: { input: "TOPIC orders\nSUBSCRIBE s1 orders\nSUBSCRIBE s2 orders\nPUBLISH orders o1\nUNSUBSCRIBE s1 orders\nPUBLISH orders o2", output: "s1 <- o1\ns2 <- o1\ns2 <- o2" },
  },
  {
    slug: "lru-cache", title: "Cache with eviction policies", level: "Intermediate", status: "draft", concurrency: false,
    statement: ["Build a fixed-capacity key-value cache. When full, adding a new key evicts one key first."],
    io: [
      "CAPACITY <n> — new empty cache.",
      "PUT <key> <value> — insert or update; if a key is evicted, print \"EVICT <key>\" first. Updating an existing key never evicts.",
      "GET <key> — prints the value or \"MISS\".",
      "Default policy LRU: evict the least recently used key (PUT and GET both count as use).",
    ],
    core: ["O(1) GET/PUT", "LRU eviction", "Updates don't evict"],
    bonus: ["TTL per key", "Hit/miss statistics"],
    extension: { title: "LFU policy", text: ["Support least-frequently-used eviction."], io: ["POLICY <LRU|LFU> — switch the current cache's policy (use counts are kept from the start). LFU evicts the key with the fewest uses; ties go to the least recently used."] },
    sample: { input: "CAPACITY 2\nPUT a 1\nPUT b 2\nGET a\nPUT c 3\nGET b\nGET c", output: "1\nEVICT b\nMISS\n3" },
  },
  {
    slug: "rate-limiter", title: "Rate limiter library", level: "Intermediate", status: "draft", concurrency: true,
    statement: ["Build a rate limiter clients can configure per client id. Timestamps are integer seconds given in the input and never decrease. The review will ask how you'd make it thread-safe."],
    io: [
      "RULE <client> <limit> <windowSeconds> — fixed window: windows start at multiples of windowSeconds.",
      "REQ <client> <timestamp> — prints \"ALLOW\" or \"DENY\"; clients without a rule print \"ALLOW\".",
    ],
    core: ["Per-client rules", "Fixed-window counting", "Correct window boundaries"],
    bonus: ["Per-endpoint rules", "Report remaining quota"],
    extension: { title: "Sliding window", text: ["Some clients need a sliding window."], io: ["ALGO <client> <FIXED|SLIDING> — SLIDING allows a request if fewer than limit requests were allowed in the last windowSeconds (timestamps t with now − t < windowSeconds)."] },
    sample: { input: "RULE c1 2 10\nREQ c1 1\nREQ c1 5\nREQ c1 9\nREQ c1 10", output: "ALLOW\nALLOW\nDENY\nALLOW" },
  },
  {
    slug: "task-scheduler", title: "Task scheduler", level: "Advanced", status: "draft", concurrency: false,
    statement: ["Simulate a single worker that runs tasks by priority. Time advances with TICK; a running task isn't interrupted."],
    io: [
      "ADD <taskId> <priority> <duration> — higher priority runs first; ties run in the order added.",
      "TICK <units> — advance time; whenever the worker is idle it starts the best waiting task. Each finish prints \"t=<time> DONE <taskId>\" (time starts at 0).",
      "STATUS — prints \"RUNNING <taskId>\" or \"IDLE\", then \"WAITING <n>\".",
    ],
    core: ["Priority + FIFO ordering", "Time simulation", "STATUS"],
    bonus: ["Several workers", "Cancel a waiting task"],
    extension: { title: "Dependencies", text: ["A task can depend on another task finishing first."], io: ["ADD <taskId> <priority> <duration> AFTER <depId> — the task can't start until depId is done (unknown ids print \"ERROR unknown dependency\" and the task isn't added)."] },
    sample: { input: "ADD a 1 3\nADD b 5 2\nTICK 1\nSTATUS\nTICK 5", output: "RUNNING b\nWAITING 1\nt=2 DONE b\nt=5 DONE a" },
  },
  {
    slug: "kv-transactions", title: "Key-value store with transactions", level: "Advanced", status: "draft", concurrency: true,
    statement: ["Build an in-memory key-value store with transactions. Values are strings without spaces."],
    io: [
      "SET <key> <value>; GET <key> — prints the value or \"NULL\"; DELETE <key>.",
      "COUNT <value> — prints how many keys currently have that value.",
      "BEGIN — start a transaction; COMMIT — apply it; ROLLBACK — discard it. COMMIT/ROLLBACK without a transaction print \"NO TRANSACTION\".",
      "Base: BEGIN inside an open transaction prints \"ERROR nested\".",
    ],
    core: ["Basic commands", "COUNT in O(1) or close", "Single-level transactions"],
    bonus: ["Snapshot isolation for readers (discuss)", "TTL keys"],
    extension: { title: "Nested transactions", text: ["Transactions can be nested."], io: ["NESTED ON — from now on BEGIN opens a nested transaction instead of printing \"ERROR nested\". ROLLBACK discards only the innermost transaction; COMMIT applies all open transactions."] },
    sample: { input: "SET a 10\nBEGIN\nSET a 20\nGET a\nROLLBACK\nGET a\nCOUNT 10", output: "20\n10\n1" },
  },
  {
    slug: "vending-machine", title: "Vending machine", level: "Starter", status: "draft", concurrency: false,
    statement: ["Build a vending machine that accepts coins of 1, 2, 5, 10 and 20 rupees."],
    io: [
      "STOCK <code> <name> <price> <qty> — add or restock a product.",
      "INSERT <coin> — prints \"BALANCE <n>\"; invalid coins print \"ERROR invalid coin\".",
      "SELECT <code> — prints \"DISPENSE <name>\" then \"CHANGE <n>\"; or \"SOLD OUT\", \"UNKNOWN PRODUCT\", \"INSUFFICIENT FUNDS <missing>\" (the balance is kept).",
      "CANCEL — prints \"REFUND <n>\" (the balance) and resets it.",
    ],
    core: ["Stock and coins", "Selling and change amount", "Error states"],
    bonus: ["Model states (idle, has money, dispensing) explicitly", "Admin restock and sales report"],
    extension: { title: "Limited change", text: ["The machine can only give change from coins it holds."], io: ["LOAD <coin> <count> — add coins for change. After LOAD is used once, change must be made from held coins (inserted coins join the pool; use the largest coins first). If exact change is impossible, print \"EXACT CHANGE ONLY\", refund the inserted coins (\"REFUND <n>\") and don't dispense."] },
    sample: { input: "STOCK A1 chips 15 1\nINSERT 10\nINSERT 10\nSELECT A1\nSELECT A1", output: "BALANCE 10\nBALANCE 20\nDISPENSE chips\nCHANGE 5\nSOLD OUT" },
  },
  {
    slug: "meeting-rooms", title: "Meeting room booking", level: "Intermediate", status: "draft", concurrency: true,
    statement: ["Book meeting rooms by time range (minutes; start inclusive, end exclusive) and size. Pick the smallest room that fits and is free; ties go to the smaller room id."],
    io: [
      "ROOM <id> <capacity>.",
      "BOOK <user> <start> <end> <people> — prints \"BOOKED <bookingId> <roomId>\" (M1, M2, …) or \"NO_ROOM\"; start < end or \"ERROR invalid time\".",
      "CANCEL <bookingId> — prints nothing, or \"ERROR unknown booking\".",
      "SCHEDULE <roomId> — its bookings in start order: \"<start>-<end> <user>\", or \"Free\".",
    ],
    core: ["Overlap checks", "Smallest fitting room", "Cancel and schedule"],
    bonus: ["Suggest the next free slot", "Discuss double-booking under concurrent requests"],
    extension: { title: "Recurring bookings", text: ["Book the same slot on several consecutive days."], io: ["BOOK_DAILY <user> <start> <end> <people> <days> — all-or-nothing in ONE room: the smallest room free on every day (day d adds d × 1440 minutes). Prints \"BOOKED <id1>,<id2>,… <roomId>\" or \"NO_ROOM\"."] },
    sample: { input: "ROOM r1 4\nROOM r2 10\nBOOK ana 60 120 3\nBOOK bo 90 150 2\nSCHEDULE r1", output: "BOOKED M1 r1\nBOOKED M2 r2\n60-120 ana" },
  },
];

export const MC_BY_SLUG: Record<string, McProblem> = Object.fromEntries(MC_PROBLEMS.map((p) => [p.slug, p]));

/** Starter files per language: just an entry point that reads commands; the design is the candidate's. */
export function mcStarter(lang: "java" | "python" | "javascript" | "cpp"): Record<string, string> {
  switch (lang) {
    case "java": return { "Main.java": "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        while (in.hasNextLine()) {\n            String line = in.nextLine().trim();\n            if (line.isEmpty()) continue;\n            String[] p = line.split(\"\\\\s+\");\n            // TODO: dispatch p[0] to your classes\n        }\n    }\n}\n" };
    case "python": return { "main.py": "import sys\n\n\ndef main():\n    for line in sys.stdin:\n        p = line.split()\n        if not p:\n            continue\n        # TODO: dispatch p[0] to your classes\n\n\nif __name__ == \"__main__\":\n    main()\n" };
    case "javascript": return { "main.js": "const lines = require(\"fs\").readFileSync(0, \"utf8\").split(\"\\n\");\nfor (const line of lines) {\n  const p = line.trim().split(/\\s+/);\n  if (!p[0]) continue;\n  // TODO: dispatch p[0] to your classes\n}\n" };
    case "cpp": return { "main.cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    string line;\n    while (getline(cin, line)) {\n        istringstream in(line);\n        string cmd;\n        if (!(in >> cmd)) continue;\n        // TODO: dispatch cmd to your classes\n    }\n}\n" };
  }
}
