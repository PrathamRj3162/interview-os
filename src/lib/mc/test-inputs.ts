/**
 * Hidden test INPUTS for the machine coding bank (expected outputs are generated from the Java references into
 * expected.json and re-checked in CI). Imported only by server code and scripts.
 * `ext` tests exercise the minute-60 extension; core tests never depend on it.
 */
export type McTestInput = { name: string; input: string; ext?: boolean };

const L = (...lines: string[]) => lines.join("\n");

export const MC_TEST_INPUTS: Record<string, McTestInput[]> = {
  splitwise: [
    { name: "equal split with remainder", input: L("USER a", "USER b", "USER c", "EXPENSE a 100 3 a b c EQUAL", "SHOW") },
    { name: "netting both ways", input: L("USER a", "USER b", "EXPENSE a 50 2 a b EQUAL", "EXPENSE b 80 2 a b EQUAL", "SHOW", "EXPENSE a 15 2 a b EQUAL", "SHOW") },
    { name: "exact split and per-user view", input: L("USER x", "USER y", "USER z", "EXPENSE x 90 3 x y z EXACT 10 30.50 49.50", "EXPENSE z 20 2 y z EQUAL", "SHOW y", "SHOW x", "SHOW z") },
    { name: "validation", input: L("USER a", "USER b", "EXPENSE a 100 2 a c EQUAL", "EXPENSE a -5 2 a b EQUAL", "EXPENSE a 100 2 a b EXACT 60 30", "EXPENSE q 10 1 a EQUAL", "SHOW", "SHOW a") },
    { name: "many expenses", input: L("USER u1", "USER u2", "USER u3", "USER u4", "EXPENSE u1 400 4 u1 u2 u3 u4 EQUAL", "EXPENSE u2 120 3 u2 u3 u4 EQUAL", "EXPENSE u3 99.99 2 u1 u4 EQUAL", "EXPENSE u4 10 2 u1 u2 EXACT 2.50 7.50", "SHOW") },
    { name: "percent split", ext: true, input: L("USER a", "USER b", "USER c", "EXPENSE a 1000 3 a b c PERCENT 50 30 20", "SHOW") },
    { name: "percent rounding", ext: true, input: L("USER a", "USER b", "USER c", "EXPENSE b 100 3 a b c PERCENT 33.33 33.33 33.34", "SHOW") },
    { name: "percent validation", ext: true, input: L("USER a", "USER b", "EXPENSE a 100 2 a b PERCENT 50 40", "EXPENSE a 100 2 a b PERCENT 60 40", "SHOW") },
  ],
  "parking-lot": [
    { name: "allocation order across floors", input: L("CREATE 2 5", "PARK CAR c1", "PARK CAR c2", "PARK CAR c3", "PARK CAR c4", "PARK CAR c5", "PARK TRUCK t1", "PARK BIKE b1", "FREE CAR", "FREE BIKE") },
    { name: "unpark frees the lowest slot again", input: L("CREATE 1 6", "PARK CAR a", "PARK CAR b", "PARK CAR c", "UNPARK F1-S5", "PARK CAR d", "FREE CAR", "UNPARK F1-S5", "UNPARK F1-S5") },
    { name: "errors", input: L("PARK CAR x", "FREE CAR", "CREATE 1 3", "PARK VAN v", "UNPARK F9-S9", "PARK CAR x", "PARK BIKE b", "PARK BIKE c", "PARK BIKE d") },
    { name: "trucks", input: L("CREATE 3 4", "PARK TRUCK t1", "PARK TRUCK t2", "PARK TRUCK t3", "PARK TRUCK t4", "UNPARK F2-S1", "PARK TRUCK t5", "FREE TRUCK") },
    { name: "fees", ext: true, input: L("CREATE 1 5", "PARK CAR a", "PARK BIKE b", "PARK TRUCK t", "UNPARK F1-S4 3", "UNPARK F1-S2 1", "UNPARK F1-S1 2") },
    { name: "invalid hours keeps the vehicle", ext: true, input: L("CREATE 1 4", "PARK CAR a", "UNPARK F1-S4 0", "FREE CAR", "UNPARK F1-S4 5") },
  ],
  "snake-ladder": [
    { name: "turns, snakes and ladders", input: L("BOARD 30", "LADDER 2 21", "SNAKE 27 1", "SNAKE 15 5", "PLAYER a", "PLAYER b", "ROLL 2", "ROLL 6", "ROLL 6", "ROLL 4", "ROLL 6", "ROLL 2") },
    { name: "overshoot and win", input: L("BOARD 10", "PLAYER a", "ROLL 6", "ROLL 6", "ROLL 3", "ROLL 1", "ROLL 2") },
    { name: "invalid jumps", input: L("BOARD 20", "SNAKE 3 9", "LADDER 9 3", "LADDER 5 25", "LADDER 5 12", "PLAYER p", "ROLL 5") },
    { name: "three players", input: L("BOARD 25", "LADDER 4 14", "SNAKE 20 6", "PLAYER x", "PLAYER y", "PLAYER z", "ROLL 4", "ROLL 3", "ROLL 2", "ROLL 6", "ROLL 1", "ROLL 2", "ROLL 5", "ROLL 6") },
    { name: "six gives another roll", ext: true, input: L("BOARD 40", "RULE SIX", "PLAYER a", "PLAYER b", "ROLL 6", "ROLL 3", "ROLL 2", "ROLL 6", "ROLL 6", "ROLL 6", "ROLL 1") },
    { name: "six rule disabled by default", ext: true, input: L("BOARD 40", "PLAYER a", "PLAYER b", "ROLL 6", "ROLL 3", "ROLL 6") },
  ],
  "tic-tac-toe": [
    { name: "column win", input: L("NEW 3", "PLAYER X Ana", "PLAYER O Bo", "MOVE 1 2", "MOVE 1 1", "MOVE 2 2", "MOVE 3 3", "MOVE 3 2", "PRINT") },
    { name: "anti-diagonal win and moves after", input: L("NEW 3", "PLAYER X a", "PLAYER O b", "MOVE 1 1", "MOVE 1 3", "MOVE 2 1", "MOVE 2 2", "MOVE 1 2", "MOVE 3 1", "MOVE 3 3") },
    { name: "draw", input: L("NEW 3", "PLAYER X a", "PLAYER O b", "MOVE 1 1", "MOVE 1 2", "MOVE 1 3", "MOVE 2 2", "MOVE 2 1", "MOVE 2 3", "MOVE 3 2", "MOVE 3 1", "MOVE 3 3", "PRINT") },
    { name: "invalid moves keep the turn", input: L("NEW 3", "PLAYER X a", "PLAYER O b", "MOVE 0 1", "MOVE 1 1", "MOVE 1 1", "MOVE 4 4", "MOVE 2 2", "PRINT") },
    { name: "4x4 needs a full line", input: L("NEW 4", "PLAYER X a", "PLAYER O b", "MOVE 1 1", "MOVE 2 1", "MOVE 1 2", "MOVE 2 2", "MOVE 1 3", "MOVE 2 3", "MOVE 1 4") },
    { name: "k in a row", ext: true, input: L("NEW 5 3", "PLAYER X a", "PLAYER O b", "MOVE 2 2", "MOVE 1 1", "MOVE 3 3", "MOVE 1 2", "MOVE 4 4", "PRINT") },
    { name: "k in a row vertical in the middle", ext: true, input: L("NEW 6 4", "PLAYER X a", "PLAYER O b", "MOVE 2 3", "MOVE 1 1", "MOVE 3 3", "MOVE 1 2", "MOVE 4 3", "MOVE 6 6", "MOVE 5 3") },
  ],
  "movie-booking": [
    { name: "all-or-nothing holds", input: L("SHOW s1 2 2", "HOLD a s1 A1 B2", "HOLD b s1 A2 B2", "HOLD b s1 A2 B1", "AVAILABLE s1", "CONFIRM H2", "AVAILABLE s1") },
    { name: "expiry", input: L("SHOW s 1 3", "HOLD a s A1", "TICK 10", "CONFIRM H1", "HOLD b s A2", "TICK 11", "AVAILABLE s", "CONFIRM H2", "HOLD c s A2 A3", "AVAILABLE s") },
    { name: "release and unknown", input: L("SHOW x 3 3", "HOLD u x C3", "RELEASE H1", "AVAILABLE x", "CONFIRM H1", "HOLD u x D1", "HOLD u x C3 C1", "CONFIRM H2") },
    { name: "two shows", input: L("SHOW m 1 2", "SHOW n 1 2", "HOLD a m A1", "HOLD b n A1", "CONFIRM H2", "CONFIRM H1", "AVAILABLE m", "AVAILABLE n") },
    { name: "row prices", ext: true, input: L("SHOW s 3 2", "PRICE s A 300", "PRICE s B 200", "HOLD a s A1 A2 B1 C1", "CONFIRM H1") },
    { name: "price updates before confirm", ext: true, input: L("SHOW s 2 2", "HOLD a s B1", "PRICE s B 90", "CONFIRM H1", "HOLD b s A1 A2", "CONFIRM H2") },
  ],
  "cab-booking": [
    { name: "nearest within radius", input: L("DRIVER d1 0 0", "DRIVER d2 10 10", "RIDER r1 1 1", "RIDER r2 9 9", "RIDER r3 50 50", "BOOK r1 4 5", "BOOK r2 0 0", "BOOK r3 0 0", "END R1", "END R2") },
    { name: "tie goes to the smaller id and busy drivers are skipped", input: L("DRIVER b 0 3", "DRIVER a 3 0", "RIDER r 0 0", "RIDER s 0 0", "BOOK r 0 5", "BOOK s 1 1", "END R2", "BOOK s 3 4", "END R1", "END R3") },
    { name: "driver moves to the destination", input: L("DRIVER d 0 0", "RIDER r1 0 0", "RIDER r2 20 20", "BOOK r1 18 18", "BOOK r2 0 0", "END R1", "BOOK r2 21 21", "END R2", "HISTORY r2", "HISTORY r1", "HISTORY nobody") },
    { name: "surge", ext: true, input: L("DRIVER d 0 0", "RIDER r 0 0", "BOOK r 3 4", "SURGE 2", "END R1", "BOOK r 0 0", "END R2", "SURGE 1.5", "BOOK r 6 8", "END R3", "HISTORY r") },
  ],
  "food-ordering": [
    { name: "price then capacity", input: L("RESTAURANT a 1 4.0", "RESTAURANT b 1 4.8", "MENU a idli 40", "MENU b idli 40", "MENU b vada 30", "ORDER u idli 1", "ORDER u idli 2", "ORDER u idli 1", "ORDER u vada 1") },
    { name: "delivery frees capacity", input: L("RESTAURANT r 1 3.0", "MENU r tea 10", "ORDER u tea 3", "ORDER v tea 1", "DELIVERED O1", "ORDER v tea 1", "DELIVERED O9") },
    { name: "ties by rating then id", input: L("RESTAURANT z 5 4.2", "RESTAURANT y 5 4.2", "RESTAURANT x 5 3.0", "MENU z pav 25", "MENU y pav 25", "MENU x pav 25", "ORDER u pav 4", "MENU y pav 20", "ORDER u pav 1", "ORDER u nothing 1") },
    { name: "rating strategy", ext: true, input: L("RESTAURANT a 2 4.9", "RESTAURANT b 2 4.1", "MENU a thali 200", "MENU b thali 150", "ORDER u thali 1", "STRATEGY RATING", "ORDER u thali 1", "ORDER u thali 1", "ORDER u thali 1", "STRATEGY PRICE", "ORDER u thali 1") },
  ],
  "issue-resolution": [
    { name: "assignment and queue", input: L("AGENT a1 payment", "AGENT a2 delivery", "ISSUE i1 payment", "ISSUE i2 delivery", "ISSUE i3 payment", "ISSUE i4 delivery", "RESOLVE i2", "RESOLVE i1", "HISTORY a1", "HISTORY a2") },
    { name: "agent takes the oldest issue they can handle", input: L("AGENT a payment refund", "ISSUE x payment", "ISSUE y delivery", "ISSUE z refund", "RESOLVE x", "RESOLVE z", "HISTORY a") },
    { name: "errors", input: L("AGENT a payment", "RESOLVE nope", "ISSUE i payment", "RESOLVE i", "RESOLVE i", "HISTORY a", "HISTORY b") },
    { name: "leave", ext: true, input: L("AGENT a1 payment", "AGENT a2 payment", "ISSUE i1 payment", "ISSUE i2 payment", "ISSUE i3 payment", "LEAVE a1", "RESOLVE i2", "RESOLVE i1", "HISTORY a2") },
    { name: "leave while idle", ext: true, input: L("AGENT a payment", "AGENT b payment", "LEAVE a", "ISSUE i1 payment", "ISSUE i2 payment", "RESOLVE i1") },
  ],
  "pub-sub": [
    { name: "ordered delivery", input: L("TOPIC t", "SUBSCRIBE c t", "SUBSCRIBE a t", "SUBSCRIBE b t", "SUBSCRIBE a t", "PUBLISH t hello", "PUBLISH t second message here") },
    { name: "errors and empty topics", input: L("TOPIC t", "PUBLISH t x", "PUBLISH nope x", "SUBSCRIBE a nope", "SUBSCRIBE a t", "UNSUBSCRIBE a t", "PUBLISH t y") },
    { name: "several topics", input: L("TOPIC a", "TOPIC b", "SUBSCRIBE s1 a", "SUBSCRIBE s1 b", "SUBSCRIBE s2 b", "PUBLISH a m1", "PUBLISH b m2", "UNSUBSCRIBE s1 b", "PUBLISH b m3") },
    { name: "replay", ext: true, input: L("TOPIC t", "SUBSCRIBE a t", "PUBLISH t m0", "PUBLISH t m1", "PUBLISH t m2", "REPLAY z t 1", "REPLAY a t 3", "REPLAY a t 0") },
  ],
  "lru-cache": [
    { name: "lru order with gets", input: L("CAPACITY 3", "PUT a 1", "PUT b 2", "PUT c 3", "GET a", "PUT d 4", "GET b", "GET c", "PUT e 5", "GET a", "GET d") },
    { name: "updates don't evict", input: L("CAPACITY 2", "PUT a 1", "PUT b 2", "PUT a 9", "PUT c 3", "GET a", "GET b") },
    { name: "capacity one", input: L("CAPACITY 1", "PUT x 1", "PUT y 2", "GET x", "GET y", "PUT y 3", "GET y") },
    { name: "lfu", ext: true, input: L("CAPACITY 3", "PUT a 1", "PUT b 2", "PUT c 3", "GET a", "GET a", "GET b", "POLICY LFU", "PUT d 4", "GET d", "PUT e 5", "GET a") },
    { name: "lfu ties use recency", ext: true, input: L("CAPACITY 2", "POLICY LFU", "PUT a 1", "PUT b 2", "PUT c 3", "GET a", "GET b") },
  ],
  "rate-limiter": [
    { name: "window boundaries", input: L("RULE c 3 60", "REQ c 0", "REQ c 59", "REQ c 59", "REQ c 59", "REQ c 60", "REQ c 119", "REQ c 120") },
    { name: "clients are independent", input: L("RULE a 1 10", "RULE b 2 10", "REQ a 1", "REQ b 1", "REQ a 2", "REQ b 2", "REQ b 3", "REQ x 3", "REQ x 3") },
    { name: "new rule resets", input: L("RULE c 1 100", "REQ c 5", "REQ c 6", "RULE c 2 100", "REQ c 7", "REQ c 8", "REQ c 9") },
    { name: "sliding window", ext: true, input: L("RULE c 2 10", "ALGO c SLIDING", "REQ c 5", "REQ c 9", "REQ c 10", "REQ c 14", "REQ c 15", "REQ c 16", "REQ c 19") },
    { name: "fixed vs sliding at the edge", ext: true, input: L("RULE f 2 10", "RULE s 2 10", "ALGO s SLIDING", "REQ f 8", "REQ f 9", "REQ f 10", "REQ f 11", "REQ s 8", "REQ s 9", "REQ s 10", "REQ s 11") },
  ],
  "task-scheduler": [
    { name: "priority then fifo", input: L("ADD a 1 2", "ADD b 3 1", "ADD c 3 1", "ADD d 2 1", "TICK 10") },
    { name: "no preemption", input: L("ADD long 1 5", "TICK 1", "ADD urgent 9 1", "STATUS", "TICK 4", "STATUS", "TICK 1", "STATUS") },
    { name: "idle worker and boundaries", input: L("STATUS", "TICK 3", "ADD x 1 2", "TICK 2", "ADD y 1 1", "TICK 0", "STATUS", "TICK 1") },
    { name: "dependencies", ext: true, input: L("ADD build 1 2", "ADD test 9 1 AFTER build", "ADD lint 5 1", "ADD ship 9 1 AFTER test", "ADD bad 1 1 AFTER nope", "TICK 10") },
    { name: "waiting count includes blocked tasks", ext: true, input: L("ADD a 1 3", "ADD b 1 1 AFTER a", "TICK 1", "STATUS", "TICK 3", "STATUS") },
  ],
  "kv-transactions": [
    { name: "basics and count", input: L("SET a x", "SET b x", "SET c y", "COUNT x", "DELETE a", "COUNT x", "GET a", "SET b y", "COUNT y", "COUNT x") },
    { name: "commit and rollback", input: L("BEGIN", "SET a 1", "COMMIT", "GET a", "BEGIN", "DELETE a", "GET a", "COUNT 1", "ROLLBACK", "GET a", "COUNT 1", "ROLLBACK", "COMMIT") },
    { name: "nested is an error by default", input: L("BEGIN", "SET k v", "BEGIN", "ROLLBACK", "GET k", "ROLLBACK") },
    { name: "nested transactions", ext: true, input: L("NESTED ON", "SET a 10", "BEGIN", "SET a 20", "BEGIN", "SET a 30", "GET a", "ROLLBACK", "GET a", "BEGIN", "DELETE a", "COUNT 20", "COMMIT", "GET a", "ROLLBACK") },
    { name: "nested rollback restores counts", ext: true, input: L("NESTED ON", "SET x 1", "SET y 1", "BEGIN", "SET x 2", "BEGIN", "SET y 2", "COUNT 1", "ROLLBACK", "COUNT 1", "ROLLBACK", "COUNT 1", "COUNT 2") },
  ],
  "vending-machine": [
    { name: "change and balance", input: L("STOCK A chips 15 2", "STOCK B soda 40 1", "INSERT 20", "SELECT A", "INSERT 10", "INSERT 5", "SELECT A", "SELECT A") },
    { name: "insufficient funds keeps balance", input: L("STOCK C water 25 5", "INSERT 10", "SELECT C", "INSERT 20", "SELECT C", "CANCEL") },
    { name: "errors", input: L("INSERT 3", "SELECT Z", "STOCK Z gum 2 0", "INSERT 2", "SELECT Z", "STOCK Z gum 2 1", "SELECT Z", "CANCEL") },
    { name: "limited change", ext: true, input: L("STOCK A chips 15 3", "LOAD 5 1", "INSERT 20", "SELECT A", "INSERT 20", "SELECT A", "INSERT 10", "INSERT 5", "SELECT A") },
    { name: "greedy change from inserted coins", ext: true, input: L("STOCK A tea 12 3", "LOAD 1 0", "INSERT 10", "INSERT 2", "INSERT 1", "SELECT A", "INSERT 20", "SELECT A") },
  ],
  "meeting-rooms": [
    { name: "smallest fitting room", input: L("ROOM big 20", "ROOM small 4", "ROOM mid 8", "BOOK a 0 60 3", "BOOK b 30 90 3", "BOOK c 30 90 7", "BOOK d 30 90 9", "BOOK e 30 90 30") },
    { name: "touching intervals don't overlap", input: L("ROOM r 2", "BOOK a 60 120 2", "BOOK b 120 180 2", "BOOK c 0 60 1", "BOOK d 59 61 1", "SCHEDULE r") },
    { name: "cancel and errors", input: L("ROOM r 5", "BOOK a 10 20 2", "CANCEL M1", "BOOK b 10 20 2", "CANCEL M1", "BOOK c 30 30 1", "SCHEDULE r", "SCHEDULE nowhere") },
    { name: "id tie and schedule order", input: L("ROOM b 4", "ROOM a 4", "BOOK x 100 200 2", "BOOK y 0 50 2", "BOOK z 150 250 2", "SCHEDULE a", "SCHEDULE b") },
    { name: "daily bookings", ext: true, input: L("ROOM r1 4", "ROOM r2 6", "BOOK a 1500 1560 2", "BOOK_DAILY b 60 120 3 3", "BOOK_DAILY c 600 660 10 2", "SCHEDULE r1", "SCHEDULE r2") },
  ],
};
