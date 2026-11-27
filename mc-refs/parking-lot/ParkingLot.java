import java.util.*;

public class ParkingLot {
    private record Parked(String registration, VehicleType type) { }

    private final int floors, slots;
    private final Map<String, Parked> occupied = new HashMap<>(); // ticket -> vehicle

    public ParkingLot(int floors, int slots) {
        if (floors <= 0 || slots <= 0) throw new IllegalArgumentException("invalid size");
        this.floors = floors;
        this.slots = slots;
    }

    private static String ticket(int f, int s) { return "F" + f + "-S" + s; }

    public Optional<String> park(VehicleType type, String registration) {
        for (int f = 1; f <= floors; f++)
            for (int s = 1; s <= slots; s++)
                if (VehicleType.forSlot(s) == type && !occupied.containsKey(ticket(f, s))) {
                    occupied.put(ticket(f, s), new Parked(registration, type));
                    return Optional.of(ticket(f, s));
                }
        return Optional.empty();
    }

    public List<String> unpark(String ticket, Integer hours) {
        Parked v = occupied.get(ticket);
        if (v == null) throw new IllegalArgumentException("invalid ticket");
        if (hours != null && hours < 1) throw new IllegalArgumentException("invalid hours");
        occupied.remove(ticket);
        List<String> out = new ArrayList<>(List.of("Unparked " + v.registration()));
        if (hours != null) out.add("FEE " + (v.type().hourlyRate * hours));
        return out;
    }

    public List<String> freeCounts(VehicleType type) {
        List<String> out = new ArrayList<>();
        for (int f = 1; f <= floors; f++) {
            int free = 0;
            for (int s = 1; s <= slots; s++) if (VehicleType.forSlot(s) == type && !occupied.containsKey(ticket(f, s))) free++;
            out.add("F" + f + ": " + free + " free");
        }
        return out;
    }
}
