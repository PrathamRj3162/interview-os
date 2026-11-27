import java.util.*;

/** Booking is one synchronized check-then-book step, so two requests can't take the same room and slot. */
public class RoomBooker {
    private static final int DAY = 1440;
    private record Room(String id, int capacity) { }
    private record Booking(String id, String room, String user, int start, int end) { }

    private final Map<String, Room> rooms = new LinkedHashMap<>();
    private final Map<String, Booking> bookings = new LinkedHashMap<>();
    private int seq = 0;

    public void addRoom(String id, int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("invalid capacity");
        rooms.put(id, new Room(id, capacity));
    }

    private boolean free(String room, int s, int e) {
        return bookings.values().stream().noneMatch(b -> b.room().equals(room) && b.start() < e && s < b.end());
    }

    public synchronized String book(String user, int start, int end, int people, int days) {
        if (start >= end || days < 1) throw new IllegalArgumentException("invalid time");
        Optional<Room> pick = rooms.values().stream()
                .filter(r -> r.capacity() >= people)
                .filter(r -> { for (int d = 0; d < days; d++) if (!free(r.id(), start + d * DAY, end + d * DAY)) return false; return true; })
                .min(Comparator.comparingInt(Room::capacity).thenComparing(Room::id));
        if (pick.isEmpty()) return "NO_ROOM";
        List<String> ids = new ArrayList<>();
        for (int d = 0; d < days; d++) {
            Booking b = new Booking("M" + (++seq), pick.get().id(), user, start + d * DAY, end + d * DAY);
            bookings.put(b.id(), b);
            ids.add(b.id());
        }
        return "BOOKED " + String.join(",", ids) + " " + pick.get().id();
    }

    public synchronized void cancel(String id) {
        if (bookings.remove(id) == null) throw new IllegalArgumentException("unknown booking");
    }

    public synchronized List<String> schedule(String room) {
        List<String> out = bookings.values().stream().filter(b -> b.room().equals(room))
                .sorted(Comparator.comparingInt(Booking::start))
                .map(b -> b.start() + "-" + b.end() + " " + b.user()).toList();
        return out.isEmpty() ? List.of("Free") : out;
    }
}
