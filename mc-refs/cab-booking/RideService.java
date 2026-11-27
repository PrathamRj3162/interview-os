import java.util.*;

public class RideService {
    private static final double RADIUS = 5.0, RATE = 10.0;

    private static final class Driver { final String id; Point at; boolean busy; Driver(String id, Point at) { this.id = id; this.at = at; } }
    private record Ride(String id, String rider, Driver driver, Point pickup, Point dest, double surge) { }

    private final Map<String, Driver> drivers = new TreeMap<>();
    private final Map<String, Point> riders = new HashMap<>();
    private final Map<String, Ride> active = new HashMap<>();
    private final Map<String, List<String>> history = new HashMap<>();
    private double surge = 1.0;
    private int seq = 0;

    public void addDriver(String id, double x, double y) { drivers.put(id, new Driver(id, new Point(x, y))); }
    public void addRider(String id, double x, double y) { riders.put(id, new Point(x, y)); }
    public void setSurge(double m) { if (m <= 0) throw new IllegalArgumentException("invalid surge"); surge = m; }

    public String book(String riderId, double dx, double dy) {
        Point from = riders.get(riderId);
        if (from == null) throw new IllegalArgumentException("unknown rider");
        Driver best = null;
        double bestD = Double.MAX_VALUE;
        for (Driver d : drivers.values()) { // TreeMap order = id order, so ties keep the smaller id
            if (d.busy) continue;
            double dist = d.at.distanceTo(from);
            if (dist <= RADIUS && dist < bestD - 1e-9) { best = d; bestD = dist; }
        }
        if (best == null) return "NO_DRIVER";
        best.busy = true;
        Ride r = new Ride("R" + (++seq), riderId, best, from, new Point(dx, dy), surge);
        active.put(r.id(), r);
        return "RIDE " + r.id() + " " + best.id;
    }

    public String end(String rideId) {
        Ride r = active.remove(rideId);
        if (r == null) throw new IllegalArgumentException("unknown ride");
        double fare = RATE * r.pickup().distanceTo(r.dest()) * r.surge();
        r.driver().at = r.dest();
        r.driver().busy = false;
        String f = String.format("%.2f", fare);
        history.computeIfAbsent(r.rider(), k -> new ArrayList<>()).add(r.id() + " " + r.driver().id + " " + f);
        return "FARE " + f;
    }

    public List<String> history(String riderId) {
        List<String> h = history.getOrDefault(riderId, List.of());
        return h.isEmpty() ? List.of("No rides") : h;
    }
}
