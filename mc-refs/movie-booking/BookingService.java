import java.util.*;

public class BookingService {
    private record Hold(String id, String user, Show show, List<String> seats, int createdAt) { }

    private static final int HOLD_MINUTES = 10;
    private final Map<String, Show> shows = new HashMap<>();
    private final Map<String, Hold> holds = new HashMap<>();
    private int now = 0, holdSeq = 0, bookingSeq = 0;
    private boolean pricing = false; // the extension: TOTAL is printed once any PRICE was set

    public void addShow(String id, int rows, int cols) { shows.put(id, new Show(id, rows, cols)); }

    private Show show(String id) {
        Show s = shows.get(id);
        if (s == null) throw new IllegalArgumentException("unknown show");
        return s;
    }

    public synchronized String hold(String user, String showId, List<String> seats) {
        expire();
        Show s = show(showId);
        if (seats.isEmpty()) throw new IllegalArgumentException("no seats");
        s.hold(seats);
        String id = "H" + (++holdSeq);
        holds.put(id, new Hold(id, user, s, List.copyOf(seats), now));
        return id;
    }

    public synchronized List<String> confirm(String holdId) {
        Hold h = holds.get(holdId);
        if (h == null) throw new IllegalArgumentException("unknown hold");
        if (now - h.createdAt() > HOLD_MINUTES) { release(holdId); throw new IllegalStateException("hold expired"); }
        holds.remove(holdId);
        h.show().set(h.seats(), Show.State.BOOKED);
        int total = h.seats().stream().mapToInt(h.show()::priceOf).sum();
        String booked = "BOOKED B" + (++bookingSeq) + " " + String.join(",", h.seats());
        return pricing ? List.of(booked, "TOTAL " + total) : List.of(booked);
    }

    public synchronized void release(String holdId) {
        Hold h = holds.remove(holdId);
        if (h != null) h.show().set(h.seats(), Show.State.FREE);
    }

    public synchronized void tick(int minutes) { now += minutes; expire(); }

    private void expire() {
        for (Hold h : List.copyOf(holds.values())) if (now - h.createdAt() > HOLD_MINUTES) release(h.id());
    }

    public synchronized long available(String showId) { expire(); return show(showId).free(); }

    public void price(String showId, char row, int amount) { show(showId).price(row, amount); pricing = true; }
}
