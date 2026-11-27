import java.util.*;

/** Seat state per show. Every state change goes through synchronized methods, so two holds can't take one seat. */
public class Show {
    enum State { FREE, HELD, BOOKED }

    final String id;
    private final int rows, cols;
    private final Map<String, State> seats = new LinkedHashMap<>();
    private final Map<Character, Integer> rowPrice = new HashMap<>();

    Show(String id, int rows, int cols) {
        if (rows < 1 || rows > 26 || cols < 1) throw new IllegalArgumentException("invalid show");
        this.id = id;
        this.rows = rows;
        this.cols = cols;
        for (int r = 0; r < rows; r++) for (int c = 1; c <= cols; c++) seats.put((char) ('A' + r) + "" + c, State.FREE);
    }

    synchronized void hold(List<String> wanted) {
        for (String s : wanted) if (seats.get(s) != State.FREE) throw new IllegalArgumentException("seat " + s + " unavailable");
        for (String s : wanted) seats.put(s, State.HELD);
    }

    synchronized void set(List<String> which, State state) { for (String s : which) seats.put(s, state); }

    synchronized long free() { return seats.values().stream().filter(v -> v == State.FREE).count(); }

    void price(char row, int amount) { rowPrice.put(row, amount); }

    int priceOf(String seat) { return rowPrice.getOrDefault(seat.charAt(0), 150); }
}
