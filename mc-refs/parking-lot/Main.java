import java.util.*;

public class Main {
    public static void main(String[] args) {
        ParkingLot lot = null;
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                if (p[0].equals("CREATE")) {
                    lot = new ParkingLot(Integer.parseInt(p[1]), Integer.parseInt(p[2]));
                    System.out.println("Created " + p[1] + " floors with " + p[2] + " slots each");
                    continue;
                }
                if (lot == null) { System.out.println("ERROR no lot"); continue; }
                switch (p[0]) {
                    case "PARK" -> System.out.println(lot.park(VehicleType.parse(p[1]), p[2]).map(t -> "TICKET " + t).orElse("FULL"));
                    case "UNPARK" -> {
                        Integer hours = p.length > 2 ? Integer.parseInt(p[2]) : null;
                        lot.unpark(p[1], hours).forEach(System.out::println);
                    }
                    case "FREE" -> lot.freeCounts(VehicleType.parse(p[1])).forEach(System.out::println);
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
